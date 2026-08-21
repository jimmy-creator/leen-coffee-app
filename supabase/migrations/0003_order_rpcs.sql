-- Leen Coffee — checkout and fulfilment RPCs.
--
-- Every monetary figure an order carries is computed here, from the product
-- rows, at the moment the order is placed. The client sends *what* it wants —
-- product, grind, bag size, quantity, delivery method, promo code — and never
-- *what it costs*. There is deliberately no INSERT policy on `orders`, so this
-- function is the only path that can create one.

-- Bag-size price multipliers. Mirrors WEIGHT_MULTIPLIER in @leen/lib/coffee.ts;
-- if you change one, change both.
create or replace function private.weight_multiplier(weight_g int)
returns numeric
language sql
immutable
set search_path = ''
as $$
  select case weight_g
    when 250 then 1.0
    when 500 then 1.85
    when 1000 then 3.4
    else null
  end::numeric;
$$;

-- Delivery fee in halalas, by fulfilment method. Pickup is free.
create or replace function private.delivery_fee_minor(fulfilment text)
returns int
language sql
immutable
set search_path = ''
as $$
  select case fulfilment
    when 'standard' then 1500
    when 'express' then 2900
    when 'pickup' then 0
    else null
  end;
$$;

-- Saudi VAT, applied to goods + delivery. Rounded to a whole halala.
create or replace function private.vat_minor(taxable_base_minor int)
returns int
language sql
immutable
set search_path = ''
as $$
  select round(taxable_base_minor * 0.15)::int;
$$;

-- Loyalty accrues on the goods subtotal only — a customer should not farm
-- points by choosing express delivery.
create or replace function private.points_for(subtotal_minor int)
returns int
language sql
immutable
set search_path = ''
as $$
  select floor(subtotal_minor / 100.0)::int;
$$;

-- Tier is a function of lifetime points, so spending points never demotes.
create or replace function private.tier_for(lifetime_points int)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when lifetime_points >= 10000 then 'qahwa_black'
    when lifetime_points >= 2000 then 'qahwa_gold'
    when lifetime_points >= 500 then 'qahwa_silver'
    else 'qahwa_bronze'
  end;
$$;

create sequence if not exists public.order_code_seq start 48192;

create or replace function private.next_order_code()
returns text
language sql
volatile
set search_path = ''
as $$
  select 'LN-' || nextval('public.order_code_seq')::text;
$$;

revoke execute on function private.weight_multiplier(int) from public, anon, authenticated;
revoke execute on function private.delivery_fee_minor(text) from public, anon, authenticated;
revoke execute on function private.vat_minor(int) from public, anon, authenticated;
revoke execute on function private.points_for(int) from public, anon, authenticated;
revoke execute on function private.tier_for(int) from public, anon, authenticated;
revoke execute on function private.next_order_code() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- promo validation
-- ---------------------------------------------------------------------------

/*
 * Resolve a typed promo code to a discount in halalas, or 0 if it does not
 * apply. Returns 0 rather than raising for an unknown code so the checkout
 * screen can show "not valid" without a round-trip that looks like a failure.
 *
 * SECURITY DEFINER because `promo_codes` has no read policy — a customer must
 * be able to redeem a code without being able to enumerate the table.
 */
create or replace function public.apply_promo(p_code text, p_subtotal_minor int)
returns int
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  promo public.promo_codes%rowtype;
  discount int;
begin
  if p_code is null or btrim(p_code) = '' then
    return 0;
  end if;

  select * into promo
  from public.promo_codes
  where upper(code) = upper(btrim(p_code))
    and is_active
    and valid_from <= now()
    and (valid_until is null or valid_until >= now())
    and (max_uses is null or uses < max_uses);

  if not found or p_subtotal_minor < promo.min_order_minor then
    return 0;
  end if;

  if promo.discount_minor is not null then
    discount := promo.discount_minor;
  else
    discount := round(p_subtotal_minor * promo.discount_percent / 100.0)::int;
    if promo.max_discount_minor is not null then
      discount := least(discount, promo.max_discount_minor);
    end if;
  end if;

  -- A discount can never exceed the goods it discounts.
  return least(discount, p_subtotal_minor);
end;
$$;

grant execute on function public.apply_promo(text, int) to authenticated;

-- ---------------------------------------------------------------------------
-- cart pricing
-- ---------------------------------------------------------------------------

/*
 * Price the caller's cart without creating anything. The checkout screen calls
 * this on every change to delivery method or promo code, so the figures on
 * screen are the same figures `place_order` will compute a moment later.
 */
create or replace function public.preview_cart_total(
  p_fulfilment text default 'standard',
  p_promo_code text default null
)
returns table (
  subtotal_minor int,
  delivery_minor int,
  vat_minor int,
  discount_minor int,
  total_minor int,
  points_earned int
)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v_subtotal int;
  v_delivery int;
  v_discount int;
  v_vat int;
begin
  if uid is null then
    raise exception 'sign in to price a cart' using errcode = '42501';
  end if;

  v_delivery := private.delivery_fee_minor(p_fulfilment);
  if v_delivery is null then
    raise exception 'unknown delivery method %', p_fulfilment using errcode = '22023';
  end if;

  select coalesce(sum(
    round(p.base_price_minor * private.weight_multiplier(ci.weight_g))::int * ci.qty
  ), 0)
  into v_subtotal
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = uid;

  v_discount := public.apply_promo(p_promo_code, v_subtotal);
  -- VAT is charged on what is actually paid for the goods, so the discount
  -- comes off the taxable base before VAT rather than after.
  v_vat := private.vat_minor(greatest(v_subtotal - v_discount, 0) + v_delivery);

  return query select
    v_subtotal,
    v_delivery,
    v_vat,
    v_discount,
    greatest(v_subtotal - v_discount, 0) + v_delivery + v_vat,
    private.points_for(v_subtotal);
end;
$$;

grant execute on function public.preview_cart_total(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- place_order
-- ---------------------------------------------------------------------------

/*
 * Turn the caller's cart into an order, atomically.
 *
 * Splits the basket by roastery into one sub-order each, snapshots names and
 * prices onto the line items, decrements stock, captures the platform
 * commission, empties the cart and awards loyalty points — all in one
 * transaction, so a failure part-way leaves nothing behind.
 *
 * Product rows are locked in a deterministic order (by id) before stock is
 * touched. Two customers racing for the last bag of a limited lot would
 * otherwise be able to deadlock against each other, or both succeed.
 */
create or replace function public.place_order(
  p_address_id bigint,
  p_fulfilment text,
  p_payment_method text,
  p_promo_code text default null
)
returns table (order_id bigint, order_code text, total_minor int)
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v_order_id bigint;
  v_code text;
  v_subtotal int;
  v_delivery int;
  v_discount int;
  v_vat int;
  v_total int;
  v_points int;
  v_address public.addresses%rowtype;
  v_cart_count int;
  line record;
  v_sub_order_id bigint;
begin
  if uid is null then
    raise exception 'sign in to place an order' using errcode = '42501';
  end if;

  v_delivery := private.delivery_fee_minor(p_fulfilment);
  if v_delivery is null then
    raise exception 'unknown delivery method %', p_fulfilment using errcode = '22023';
  end if;

  if p_payment_method not in ('mada', 'apple_pay', 'stc_pay', 'cash_on_delivery') then
    raise exception 'unknown payment method %', p_payment_method using errcode = '22023';
  end if;

  -- Pickup needs no address; every other method does, and it must be one of
  -- the caller's own — passing someone else's id must not resolve.
  if p_fulfilment <> 'pickup' then
    select * into v_address
    from public.addresses
    where id = p_address_id and user_id = uid;

    if not found then
      raise exception 'delivery address not found' using errcode = 'P0002';
    end if;
  end if;

  select count(*) into v_cart_count
  from public.cart_items where user_id = uid;

  if v_cart_count = 0 then
    raise exception 'your cart is empty' using errcode = 'P0002';
  end if;

  -- Lock every product in the cart, lowest id first, so concurrent checkouts
  -- queue instead of deadlocking.
  perform 1
  from public.products p
  where p.id in (select product_id from public.cart_items where user_id = uid)
  order by p.id
  for update;

  -- Reject the whole basket if anything in it went out of stock or was
  -- delisted while the customer was deciding.
  if exists (
    select 1
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    join public.merchants m on m.id = p.merchant_id
    where ci.user_id = uid
      and (not p.is_active or not m.is_active or not m.is_open or p.stock_qty < ci.qty)
  ) then
    raise exception 'one of the items is no longer available' using errcode = 'P0002';
  end if;

  select coalesce(sum(
    round(p.base_price_minor * private.weight_multiplier(ci.weight_g))::int * ci.qty
  ), 0)
  into v_subtotal
  from public.cart_items ci
  join public.products p on p.id = ci.product_id
  where ci.user_id = uid;

  v_discount := public.apply_promo(p_promo_code, v_subtotal);
  v_vat := private.vat_minor(greatest(v_subtotal - v_discount, 0) + v_delivery);
  v_total := greatest(v_subtotal - v_discount, 0) + v_delivery + v_vat;
  v_points := private.points_for(v_subtotal);
  v_code := private.next_order_code();

  insert into public.orders (
    code, customer_id, address_id, address_snapshot, fulfilment,
    payment_method, payment_status, status,
    subtotal_minor, delivery_minor, vat_minor, discount_minor, total_minor,
    promo_code, points_earned
  )
  values (
    v_code, uid,
    case when p_fulfilment = 'pickup' then null else p_address_id end,
    case when p_fulfilment = 'pickup' then null else to_jsonb(v_address) end,
    p_fulfilment,
    p_payment_method,
    -- Cash is settled at the door; card rails authorize before capture.
    case when p_payment_method = 'cash_on_delivery' then 'pending' else 'authorized' end,
    'pending',
    v_subtotal, v_delivery, v_vat, v_discount, v_total,
    nullif(btrim(coalesce(p_promo_code, '')), ''),
    v_points
  )
  returning id into v_order_id;

  -- One sub-order per roastery in the basket.
  for line in
    select
      p.merchant_id,
      m.commission_rate,
      m.eta_max_minutes,
      sum(round(p.base_price_minor * private.weight_multiplier(ci.weight_g))::int * ci.qty)::int
        as merchant_subtotal
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    join public.merchants m on m.id = p.merchant_id
    where ci.user_id = uid
    group by p.merchant_id, m.commission_rate, m.eta_max_minutes
  loop
    insert into public.sub_orders (
      order_id, merchant_id, status, subtotal_minor, commission_minor, eta_minutes
    )
    values (
      v_order_id,
      line.merchant_id,
      'pending',
      line.merchant_subtotal,
      round(line.merchant_subtotal * line.commission_rate / 100.0)::int,
      line.eta_max_minutes
    )
    returning id into v_sub_order_id;

    insert into public.order_items (
      sub_order_id, product_id, name_en, name_ar,
      grind, weight_g, qty, unit_price_minor, line_total_minor, roasted_on
    )
    select
      v_sub_order_id,
      p.id,
      p.name_en,
      p.name_ar,
      ci.grind,
      ci.weight_g,
      ci.qty,
      round(p.base_price_minor * private.weight_multiplier(ci.weight_g))::int,
      round(p.base_price_minor * private.weight_multiplier(ci.weight_g))::int * ci.qty,
      p.roasted_on
    from public.cart_items ci
    join public.products p on p.id = ci.product_id
    where ci.user_id = uid and p.merchant_id = line.merchant_id;
  end loop;

  update public.products p
  set stock_qty = p.stock_qty - ci.qty
  from public.cart_items ci
  where ci.product_id = p.id and ci.user_id = uid;

  if p_promo_code is not null and v_discount > 0 then
    update public.promo_codes
    set uses = uses + 1
    where upper(code) = upper(btrim(p_promo_code));
  end if;

  -- Award points and let the tier follow lifetime earnings.
  insert into public.loyalty_accounts (user_id, points, lifetime_points)
  values (uid, v_points, v_points)
  on conflict (user_id) do update
  set points = public.loyalty_accounts.points + excluded.points,
      lifetime_points = public.loyalty_accounts.lifetime_points + excluded.lifetime_points,
      tier = private.tier_for(public.loyalty_accounts.lifetime_points + excluded.lifetime_points),
      updated_at = now();

  insert into public.loyalty_ledger (user_id, delta, reason, order_id)
  values (uid, v_points, 'order_placed', v_order_id);

  delete from public.cart_items where user_id = uid;

  return query select v_order_id, v_code, v_total;
end;
$$;

grant execute on function public.place_order(bigint, text, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- redeem_reward
-- ---------------------------------------------------------------------------

/*
 * Spend points on a reward. The balance row is locked first so two taps on a
 * flaky connection cannot both pass the "enough points" check.
 */
create or replace function public.redeem_reward(p_reward_id bigint)
returns bigint
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v_cost int;
  v_balance int;
  v_redemption_id bigint;
begin
  if uid is null then
    raise exception 'sign in to redeem a reward' using errcode = '42501';
  end if;

  select points_cost into v_cost
  from public.rewards
  where id = p_reward_id and is_active;

  if not found then
    raise exception 'reward not available' using errcode = 'P0002';
  end if;

  select points into v_balance
  from public.loyalty_accounts
  where user_id = uid
  for update;

  if not found or v_balance < v_cost then
    raise exception 'not enough points' using errcode = 'P0002';
  end if;

  update public.loyalty_accounts
  set points = points - v_cost, updated_at = now()
  where user_id = uid;

  insert into public.reward_redemptions (user_id, reward_id, points_spent)
  values (uid, p_reward_id, v_cost)
  returning id into v_redemption_id;

  insert into public.loyalty_ledger (user_id, delta, reason)
  values (uid, -v_cost, 'reward_redeemed');

  return v_redemption_id;
end;
$$;

grant execute on function public.redeem_reward(bigint) to authenticated;

-- ---------------------------------------------------------------------------
-- order tracking
-- ---------------------------------------------------------------------------

/*
 * Everything the tracking screen renders, in one call.
 *
 * SECURITY DEFINER so the customer can see the rider's display name, vehicle
 * and live position without the `riders` table itself being readable — that
 * table also holds the national id, which is nobody's business but the admin's.
 */
create or replace function public.order_tracking(p_order_code text)
returns table (
  order_id bigint,
  code text,
  status text,
  placed_at timestamptz,
  total_minor int,
  merchant_name_en text,
  merchant_name_ar text,
  merchant_phone text,
  eta_minutes int,
  sub_order_status text,
  rider_name text,
  rider_vehicle text,
  rider_rating numeric,
  rider_lat double precision,
  rider_lng double precision
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    o.id,
    o.code,
    o.status,
    o.placed_at,
    o.total_minor,
    m.name_en,
    m.name_ar,
    m.phone,
    so.eta_minutes,
    so.status,
    rp.full_name,
    r.vehicle,
    r.rating,
    r.lat,
    r.lng
  from public.orders o
  join public.sub_orders so on so.order_id = o.id
  join public.merchants m on m.id = so.merchant_id
  left join public.riders r on r.id = so.rider_id
  left join public.profiles rp on rp.id = so.rider_id
  where o.code = p_order_code
    and o.customer_id = (select auth.uid())
  order by so.id;
$$;

grant execute on function public.order_tracking(text) to authenticated;

-- ---------------------------------------------------------------------------
-- rider dispatch
-- ---------------------------------------------------------------------------

/*
 * Claim an unassigned delivery. `for update skip locked` is what makes this
 * safe when several riders tap the same job at once: the losers skip the locked
 * row and get a clean "already taken" instead of blocking or double-assigning.
 */
create or replace function public.rider_accept(p_sub_order_id bigint)
returns boolean
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  v_id bigint;
begin
  if uid is null or not private.current_role_is('rider') then
    raise exception 'only a rider may accept a delivery' using errcode = '42501';
  end if;

  if not exists (select 1 from public.riders where id = uid and is_approved) then
    raise exception 'your rider account is not approved yet' using errcode = '42501';
  end if;

  select id into v_id
  from public.sub_orders
  where id = p_sub_order_id
    and rider_id is null
    and status in ('confirmed', 'roasting', 'ready')
  for update skip locked;

  if not found then
    return false;
  end if;

  update public.sub_orders
  set rider_id = uid
  where id = v_id;

  return true;
end;
$$;

grant execute on function public.rider_accept(bigint) to authenticated;
