-- `place_order` already ignores the address for a pickup order, but the
-- parameter had no default, so every caller was forced to pass one. That made
-- the generated TypeScript type require a number where the honest value for
-- pickup is "none at all".
--
-- Giving the parameter a default makes the optionality part of the contract
-- rather than something each client has to remember. The body is unchanged.

create or replace function public.place_order(
  p_fulfilment text,
  p_payment_method text,
  p_address_id bigint default null,
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

  -- Pickup needs no address; every other method does, and it must be one of the
  -- caller's own — passing someone else's id must not resolve.
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
  -- queue instead of deadlocking against each other.
  perform 1
  from public.products p
  where p.id in (select product_id from public.cart_items where user_id = uid)
  order by p.id
  for update;

  -- Reject the whole basket if anything in it went out of stock, was delisted,
  -- or its roastery closed while the customer was deciding.
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
    case when p_payment_method = 'cash_on_delivery' then 'pending' else 'authorized' end,
    'pending',
    v_subtotal, v_delivery, v_vat, v_discount, v_total,
    nullif(btrim(coalesce(p_promo_code, '')), ''),
    v_points
  )
  returning id into v_order_id;

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

-- Reordering the parameters creates a new signature rather than replacing the
-- old one, so the original four-argument form has to be dropped explicitly.
-- Leaving both would make an unqualified call ambiguous.
drop function if exists public.place_order(bigint, text, text, text);

grant execute on function public.place_order(text, text, bigint, text) to authenticated;
