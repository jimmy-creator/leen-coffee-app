/**
 * Fan a notification out to one customer's registered devices.
 *
 * Called by the `sub_orders` status trigger through pg_net. Takes the account
 * and the copy, looks up that account's Expo push tokens, and posts them to
 * Expo's push service.
 *
 * Deployed with:
 *   supabase functions deploy send-push
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface PushRequest {
  user_id: string;
  title_en: string;
  title_ar?: string | null;
  body_en?: string | null;
  body_ar?: string | null;
  path?: string | null;
}

/** Expo rejects a batch larger than this. */
const EXPO_BATCH = 100;
const EXPO_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    // Service role: this reads push tokens across accounts, which no customer
    // may do. The function is only reachable with the key the trigger sends.
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  let payload: PushRequest;
  try {
    payload = await req.json();
  } catch {
    return new Response('bad json', { status: 400 });
  }

  if (!payload.user_id || !payload.title_en) {
    return new Response('user_id and title_en are required', { status: 400 });
  }

  const { data: tokens, error } = await supabase
    .from('push_tokens')
    .select('token')
    .eq('user_id', payload.user_id);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }
  if (!tokens || tokens.length === 0) {
    // Nothing registered yet — the in-app notification row still exists.
    return Response.json({ sent: 0, reason: 'no registered devices' });
  }

  /**
   * The device picks the language, so both are sent and the app shows the one
   * matching its locale. Sending only the account's saved locale would be wrong
   * the moment someone switches language without reopening the app.
   */
  const messages = tokens.map((t) => ({
    to: t.token,
    sound: 'default',
    title: payload.title_en,
    body: payload.body_en ?? '',
    channelId: 'orders',
    data: {
      path: payload.path ?? null,
      title_en: payload.title_en,
      title_ar: payload.title_ar ?? null,
      body_en: payload.body_en ?? null,
      body_ar: payload.body_ar ?? null,
    },
  }));

  let sent = 0;
  const stale: string[] = [];

  for (let i = 0; i < messages.length; i += EXPO_BATCH) {
    const batch = messages.slice(i, i + EXPO_BATCH);

    const res = await fetch(EXPO_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(batch),
    });

    if (!res.ok) continue;

    const body = (await res.json()) as {
      data?: { status: string; details?: { error?: string } }[];
    };

    body.data?.forEach((ticket, index) => {
      if (ticket.status === 'ok') {
        sent++;
        return;
      }
      // A device that uninstalled the app keeps returning this forever unless
      // the token is dropped, so prune it rather than retrying every order.
      if (ticket.details?.error === 'DeviceNotRegistered') {
        const token = batch[index]?.to;
        if (token) stale.push(token);
      }
    });
  }

  if (stale.length > 0) {
    await supabase.from('push_tokens').delete().in('token', stale);
  }

  return Response.json({ sent, pruned: stale.length });
});
