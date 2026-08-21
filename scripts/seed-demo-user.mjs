/**
 * Create the demo customer account, populated enough to be worth signing into.
 *
 * An empty account is a bad demo: Profile shows zeros, Rewards shows nothing to
 * redeem, Orders is empty. This gives the account a saved address, a loyalty
 * balance with history, an active subscription and one delivered order — so
 * every screen behind sign-in has something real on it.
 *
 * Sign in with the phone below and the fixed code; the number is registered as
 * a Supabase test OTP, so it never reaches an SMS provider.
 *
 *   SUPABASE_URL=… SUPABASE_SERVICE_KEY=… node scripts/seed-demo-user.mjs
 *
 * Idempotent — re-running resets the account to this state.
 */
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_KEY;

if (!url || !serviceKey) {
  console.error('need SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const db = createClient(url, serviceKey, { auth: { persistSession: false } });

/**
 * E.164, and a real Saudi mobile shape. Saudi mobiles are always 9665XXXXXXXX,
 * so a number of all zeros cannot be typed into the app — the phone field
 * rejects it before anything is sent. This sits in the 50-00000-0X block, which
 * STC has never allocated.
 */
const PHONE = '+966500000000';
const NAME = 'Nouf Al-Harbi';

/* ---------------------------------------------------------------------------
 * account
 * ------------------------------------------------------------------------- */

/** Find the account by phone, or create it. */
async function ensureUser() {
  // listUsers has no phone filter, so page until found. The project has a
  // handful of users; this is not a hot path.
  for (let page = 1; page <= 10; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw error;
    const found = data.users.find((u) => u.phone === PHONE.replace('+', ''));
    if (found) return found.id;
    if (data.users.length < 200) break;
  }

  const { data, error } = await db.auth.admin.createUser({
    phone: PHONE,
    phone_confirm: true,
    user_metadata: { full_name: NAME },
  });
  if (error) throw error;
  return data.user.id;
}

const userId = await ensureUser();
console.log('account   ', PHONE, '->', userId);

await db.from('profiles').update({ full_name: NAME, phone: PHONE, locale: 'ar' }).eq('id', userId);

/* ---------------------------------------------------------------------------
 * addresses
 * ------------------------------------------------------------------------- */

await db.from('addresses').delete().eq('user_id', userId);

const { data: addresses } = await db
  .from('addresses')
  .insert([
    {
      user_id: userId,
      label: 'Home',
      building_number: '7823',
      street: 'Al Urubah Rd',
      district: 'Al Olaya',
      city: 'Riyadh',
      postal_code: '12333',
      additional_number: '2841',
      lat: 24.6942,
      lng: 46.6853,
      is_default: true,
    },
    {
      user_id: userId,
      label: 'Office',
      building_number: '2',
      street: 'King Fahd Rd',
      district: 'Al Muruj',
      city: 'Riyadh',
      postal_code: '12211',
      notes: 'Tower 2, floor 14 — reception will sign',
      lat: 24.7241,
      lng: 46.6743,
      is_default: false,
    },
  ])
  .select('id');

const homeAddress = addresses?.[0]?.id;
console.log('addresses ', addresses?.length);

/* ---------------------------------------------------------------------------
 * loyalty — enough to have something redeemable, and a tier worth showing
 * ------------------------------------------------------------------------- */

const POINTS = 1240;

await db
  .from('loyalty_accounts')
  .upsert(
    { user_id: userId, points: POINTS, lifetime_points: 2860, tier: 'qahwa_gold' },
    { onConflict: 'user_id' },
  );

await db.from('loyalty_ledger').delete().eq('user_id', userId);
await db.from('loyalty_ledger').insert([
  { user_id: userId, delta: 820, reason: 'order_placed' },
  { user_id: userId, delta: 640, reason: 'order_placed' },
  { user_id: userId, delta: 1400, reason: 'order_placed' },
  { user_id: userId, delta: -1620, reason: 'reward_redeemed' },
]);
console.log('loyalty   ', POINTS, 'points, qahwa_gold');

/* ---------------------------------------------------------------------------
 * subscription
 * ------------------------------------------------------------------------- */

const { data: plan } = await db
  .from('subscription_plans')
  .select('id')
  .eq('slug', 'explorer')
  .maybeSingle();

await db.from('subscriptions').delete().eq('customer_id', userId);

if (plan) {
  const next = new Date();
  next.setDate(next.getDate() + 9);
  await db.from('subscriptions').insert({
    customer_id: userId,
    plan_id: plan.id,
    address_id: homeAddress,
    frequency: 'biweekly',
    grind: 'filter',
    status: 'active',
    next_delivery_on: next.toISOString().slice(0, 10),
  });
  console.log('subscription active, next delivery in 9 days');
}

/* ---------------------------------------------------------------------------
 * a delivered order, so Orders and Tracking are not empty
 * ------------------------------------------------------------------------- */

await db.from('orders').delete().eq('customer_id', userId);

const { data: picks } = await db
  .from('products')
  .select(
    'id, name_en, name_ar, base_price_minor, merchant_id, roasted_on, merchants ( commission_rate )',
  )
  .order('id')
  .limit(2);

if (picks && picks.length === 2 && homeAddress) {
  const { data: address } = await db.from('addresses').select('*').eq('id', homeAddress).single();

  // 500 g is 1.85x the 250 g reference — the same multiplier the database uses.
  const lines = picks.map((p) => {
    const unit = Math.round(p.base_price_minor * 1.85);
    return { product: p, unit, qty: 1, total: unit };
  });

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const delivery = 1500;
  const vat = Math.round((subtotal + delivery) * 0.15);
  const total = subtotal + delivery + vat;

  const placedAt = new Date();
  placedAt.setDate(placedAt.getDate() - 6);

  const { data: order } = await db
    .from('orders')
    .insert({
      code: 'LN-40118',
      customer_id: userId,
      address_id: homeAddress,
      address_snapshot: address,
      fulfilment: 'standard',
      payment_method: 'mada',
      payment_status: 'captured',
      status: 'delivered',
      subtotal_minor: subtotal,
      delivery_minor: delivery,
      vat_minor: vat,
      discount_minor: 0,
      total_minor: total,
      points_earned: Math.floor(subtotal / 100),
      placed_at: placedAt.toISOString(),
      delivered_at: new Date(placedAt.getTime() + 52 * 60000).toISOString(),
    })
    .select('id')
    .single();

  // One sub-order per roastery, exactly as place_order would have split it.
  const byMerchant = new Map();
  for (const line of lines) {
    const key = line.product.merchant_id;
    byMerchant.set(key, [...(byMerchant.get(key) ?? []), line]);
  }

  for (const [merchantId, group] of byMerchant) {
    const groupSubtotal = group.reduce((s, l) => s + l.total, 0);
    const rate = group[0].product.merchants?.commission_rate ?? 12;

    const { data: sub } = await db
      .from('sub_orders')
      .insert({
        order_id: order.id,
        merchant_id: merchantId,
        status: 'delivered',
        subtotal_minor: groupSubtotal,
        commission_minor: Math.round((groupSubtotal * rate) / 100),
        eta_minutes: 45,
        delivered_at: new Date(placedAt.getTime() + 52 * 60000).toISOString(),
      })
      .select('id')
      .single();

    await db.from('order_items').insert(
      group.map((l) => ({
        sub_order_id: sub.id,
        product_id: l.product.id,
        name_en: l.product.name_en,
        name_ar: l.product.name_ar,
        grind: 'filter',
        weight_g: 500,
        qty: l.qty,
        unit_price_minor: l.unit,
        line_total_minor: l.total,
        roasted_on: l.product.roasted_on,
      })),
    );
  }

  console.log('order      LN-40118 delivered,', (total / 100).toFixed(2), 'SAR');
}

console.log(`\nsign in with ${PHONE} and code 123456`);
