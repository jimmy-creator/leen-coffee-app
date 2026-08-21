-- `order_tracking` returned the rider's position but not the two points that
-- give it meaning: where the coffee is coming from, and where it is going.
--
-- A tracking map showing only a moving dot tells a customer nothing about
-- whether it is close. Adding the roastery and the delivery point lets the map
-- frame all three and be read at a glance.
--
-- The destination comes from `orders.address_snapshot` rather than a join to
-- `addresses`: the snapshot is where the order was actually sent, and it must
-- keep saying so even if the customer later edits or deletes that address.
--
-- Return type changes, so the old signature has to be dropped rather than
-- replaced.

drop function if exists public.order_tracking(text);

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
  merchant_lat double precision,
  merchant_lng double precision,
  dest_lat double precision,
  dest_lng double precision,
  fulfilment text,
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
    m.lat,
    m.lng,
    -- jsonb, so the cast has to go through text before double precision.
    nullif(o.address_snapshot ->> 'lat', '')::double precision,
    nullif(o.address_snapshot ->> 'lng', '')::double precision,
    o.fulfilment,
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
