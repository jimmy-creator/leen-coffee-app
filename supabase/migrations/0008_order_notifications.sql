-- Notify the customer as their order moves.
--
-- Two halves, deliberately separated:
--
--   1. A trigger writes a row into `public.notifications`. That is what the
--      in-app list and the bell badge read, and it arrives over realtime, so
--      the app updates whether or not a push ever gets delivered.
--
--   2. The same trigger asks pg_net to POST to the `send-push` Edge Function,
--      which fans the message out to the account's registered devices. This is
--      the part that reaches someone whose app is closed.
--
-- Splitting them matters: push delivery is best-effort — a revoked token, a
-- device offline, Expo having a bad afternoon — and none of that should be able
-- to lose the notification itself or roll back the order status update that
-- produced it.

create extension if not exists pg_net with schema extensions;

-- Where to reach the Edge Function, and the key to call it with. Held in
-- Vault rather than inlined: this is a service-role key, and a function body is
-- readable by anyone who can inspect the schema.
create or replace function private.push_endpoint()
returns table (url text, service_key text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  return query
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'push_function_url'),
    (select decrypted_secret from vault.decrypted_secrets where name = 'push_service_key');
end;
$$;

revoke execute on function private.push_endpoint() from public, anon, authenticated;

/*
 * Raise a notification for one customer and push it to their devices.
 *
 * Never raises: a failure here would abort whatever order update called it, and
 * a missed notification is a far smaller problem than a status change that
 * silently rolls back.
 */
create or replace function private.notify_customer(
  p_user_id uuid,
  p_title_en text,
  p_title_ar text,
  p_body_en text,
  p_body_ar text,
  p_path text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  endpoint record;
begin
  insert into public.notifications (user_id, title_en, title_ar, body_en, body_ar, path)
  values (p_user_id, p_title_en, p_title_ar, p_body_en, p_body_ar, p_path);

  select * into endpoint from private.push_endpoint();

  if endpoint.url is null or endpoint.service_key is null then
    -- Push is not configured yet. The in-app notification above still stands.
    return;
  end if;

  perform extensions.net_http_post(
    url := endpoint.url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || endpoint.service_key
    ),
    body := jsonb_build_object(
      'user_id', p_user_id,
      'title_en', p_title_en,
      'title_ar', p_title_ar,
      'body_en', p_body_en,
      'body_ar', p_body_ar,
      'path', p_path
    )
  );
exception
  when others then
    -- Swallow deliberately; see the note above the function.
    return;
end;
$$;

revoke execute on function private.notify_customer(uuid, text, text, text, text, text)
  from public, anon, authenticated;

/*
 * Fire on every sub-order status change. One notification per roastery leg,
 * because with a multi-roastery basket "your order is ready" is only ever true
 * of one of them at a time.
 */
create or replace function private.on_sub_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_customer uuid;
  v_code text;
  v_merchant_en text;
  v_merchant_ar text;
  v_title_en text;
  v_title_ar text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select o.customer_id, o.code into v_customer, v_code
  from public.orders o where o.id = new.order_id;

  select m.name_en, m.name_ar into v_merchant_en, v_merchant_ar
  from public.merchants m where m.id = new.merchant_id;

  case new.status
    when 'confirmed' then
      v_title_en := 'Order confirmed';
      v_title_ar := 'تم تأكيد الطلب';
    when 'roasting' then
      v_title_en := 'Roasting your order';
      v_title_ar := 'نحمّص طلبك';
    when 'ready' then
      v_title_en := 'Ready for the driver';
      v_title_ar := 'جاهز للمندوب';
    when 'picked_up' then
      v_title_en := 'Out for delivery';
      v_title_ar := 'في الطريق إليك';
    when 'delivered' then
      v_title_en := 'Delivered';
      v_title_ar := 'تم التوصيل';
    when 'cancelled' then
      v_title_en := 'Order cancelled';
      v_title_ar := 'تم إلغاء الطلب';
    else
      -- 'pending' is the state an order is created in; there is nothing to
      -- announce that the confirmation screen has not already said.
      return new;
  end case;

  perform private.notify_customer(
    v_customer,
    v_title_en,
    v_title_ar,
    coalesce(v_merchant_en, '') || ' · ' || v_code,
    coalesce(v_merchant_ar, v_merchant_en, '') || ' · ' || v_code,
    '/track/' || v_code
  );

  return new;
end;
$$;

create trigger sub_orders_notify_customer
  after update of status on public.sub_orders
  for each row execute function private.on_sub_order_status_change();

-- The trigger runs as whoever advanced the status — a merchant, a rider, or
-- the service role — so each needs EXECUTE on it.
grant execute on function private.on_sub_order_status_change() to authenticated, service_role;
grant execute on function private.notify_customer(uuid, text, text, text, text, text)
  to authenticated, service_role;
grant execute on function private.push_endpoint() to authenticated, service_role;
