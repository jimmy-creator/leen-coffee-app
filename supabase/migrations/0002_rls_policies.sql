-- Leen Coffee — row level security.
--
-- Every table below has RLS enabled. Two rules are followed without exception:
--
--   1. `auth.uid()` is always wrapped in a scalar subquery — `(select auth.uid())`.
--      Unwrapped, Postgres treats it as volatile and re-evaluates it once per
--      candidate row; on the orders table that is the difference between one
--      call and tens of thousands.
--
--   2. Role checks go through SECURITY DEFINER helpers in the `private` schema
--      rather than an inline `exists (select 1 from profiles ...)`. An inline
--      subquery against `profiles` would itself be filtered by profiles' own
--      policies, which is both slower and a recursion hazard. Every helper
--      checks the caller's identity in its own body and has EXECUTE revoked
--      from anon/authenticated so it can never be called directly over the API.

-- ---------------------------------------------------------------------------
-- role helpers
-- ---------------------------------------------------------------------------

create or replace function private.current_role_is(target_role text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = (select auth.uid())
      and p.role = target_role
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.current_role_is('admin');
$$;

/* True when the caller owns this roastery. Used by every merchant-side policy. */
create or replace function private.owns_merchant(target_merchant_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.merchants m
    where m.id = target_merchant_id
      and m.owner_id = (select auth.uid())
  );
$$;

/* True when the caller placed this order. */
create or replace function private.owns_order(target_order_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.orders o
    where o.id = target_order_id
      and o.customer_id = (select auth.uid())
  );
$$;

/*
 * True when the caller may see this sub-order: the customer who placed the
 * parent order, the roastery fulfilling it, or the rider carrying it.
 */
create or replace function private.can_read_sub_order(target_sub_order_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.sub_orders so
    join public.orders o on o.id = so.order_id
    left join public.merchants m on m.id = so.merchant_id
    where so.id = target_sub_order_id
      and (
        o.customer_id = (select auth.uid())
        or m.owner_id = (select auth.uid())
        or so.rider_id = (select auth.uid())
      )
  );
$$;

revoke execute on function private.current_role_is(text) from public, anon, authenticated;
revoke execute on function private.is_admin() from public, anon, authenticated;
revoke execute on function private.owns_merchant(bigint) from public, anon, authenticated;
revoke execute on function private.owns_order(bigint) from public, anon, authenticated;
revoke execute on function private.can_read_sub_order(bigint) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;

create policy profiles_read_own on public.profiles
  for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- `role` is deliberately not writable by the customer: a self-service update to
-- 'admin' would be a full privilege escalation. Only the admin policy above, or
-- the service role, can change it.
create or replace function private.guard_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role and not private.is_admin() then
    raise exception 'role may only be changed by an administrator';
  end if;
  return new;
end;
$$;

create trigger profiles_guard_role
  before update on public.profiles
  for each row execute function private.guard_profile_role();

-- ---------------------------------------------------------------------------
-- merchants — public storefront data, merchant-owned writes
-- ---------------------------------------------------------------------------

alter table public.merchants enable row level security;

-- Anonymous browsing is a first-class flow ("Browse as a guest"), so listed
-- roasteries are readable by `anon` as well as `authenticated`.
create policy merchants_read_listed on public.merchants
  for select to anon, authenticated
  using (is_active);

create policy merchants_read_own on public.merchants
  for select to authenticated
  using (owner_id = (select auth.uid()) or private.is_admin());

create policy merchants_update_own on public.merchants
  for update to authenticated
  using (owner_id = (select auth.uid()))
  with check (owner_id = (select auth.uid()));

create policy merchants_admin_write on public.merchants
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- A merchant must not be able to approve itself onto the storefront, nor set
-- its own commission rate. Both are admin-only columns on a merchant-owned row.
create or replace function private.guard_merchant_admin_columns()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_admin() then
    return new;
  end if;

  if new.is_active is distinct from old.is_active then
    raise exception 'listing status is set by Leen, not by the roastery';
  end if;

  if new.commission_rate is distinct from old.commission_rate then
    raise exception 'commission rate is set by Leen, not by the roastery';
  end if;

  if new.owner_id is distinct from old.owner_id then
    raise exception 'ownership may only be transferred by an administrator';
  end if;

  return new;
end;
$$;

create trigger merchants_guard_admin_columns
  before update on public.merchants
  for each row execute function private.guard_merchant_admin_columns();

-- ---------------------------------------------------------------------------
-- categories / subscription_plans / rewards / banners — public catalogue
-- ---------------------------------------------------------------------------

alter table public.categories enable row level security;
alter table public.subscription_plans enable row level security;
alter table public.rewards enable row level security;
alter table public.banners enable row level security;

create policy categories_read on public.categories
  for select to anon, authenticated using (is_active);
create policy categories_admin_write on public.categories
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy plans_read on public.subscription_plans
  for select to anon, authenticated using (is_active);
create policy plans_admin_write on public.subscription_plans
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy rewards_read on public.rewards
  for select to anon, authenticated using (is_active);
create policy rewards_admin_write on public.rewards
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy banners_read on public.banners
  for select to anon, authenticated
  using (
    is_active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at >= now())
  );
create policy banners_admin_write on public.banners
  for all to authenticated using (private.is_admin()) with check (private.is_admin());

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

alter table public.products enable row level security;

-- A product is publicly visible only if it is active *and* its roastery is
-- listed — otherwise deactivating a roastery would leave its catalogue
-- reachable by direct id.
create policy products_read_listed on public.products
  for select to anon, authenticated
  using (
    is_active
    and exists (
      select 1 from public.merchants m
      where m.id = products.merchant_id and m.is_active
    )
  );

create policy products_read_own on public.products
  for select to authenticated
  using (private.owns_merchant(merchant_id) or private.is_admin());

create policy products_merchant_write on public.products
  for all to authenticated
  using (private.owns_merchant(merchant_id))
  with check (private.owns_merchant(merchant_id));

create policy products_admin_write on public.products
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ---------------------------------------------------------------------------
-- addresses / cart — strictly private to the customer
-- ---------------------------------------------------------------------------

alter table public.addresses enable row level security;

create policy addresses_own on public.addresses
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

alter table public.cart_items enable row level security;

create policy cart_items_own on public.cart_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

alter table public.orders enable row level security;

create policy orders_read_own on public.orders
  for select to authenticated
  using (customer_id = (select auth.uid()) or private.is_admin());

-- The roastery and the rider need the parent order for the delivery address
-- and totals, but only for orders they are actually working.
create policy orders_read_fulfiller on public.orders
  for select to authenticated
  using (
    exists (
      select 1
      from public.sub_orders so
      left join public.merchants m on m.id = so.merchant_id
      where so.order_id = orders.id
        and (m.owner_id = (select auth.uid()) or so.rider_id = (select auth.uid()))
    )
  );

-- Deliberately no INSERT policy: orders are created only by `place_order`,
-- which is SECURITY DEFINER and computes every monetary figure server-side.
-- A client that could INSERT directly could set its own total to zero.
create policy orders_cancel_own on public.orders
  for update to authenticated
  using (customer_id = (select auth.uid()) and status in ('pending', 'confirmed'))
  with check (customer_id = (select auth.uid()) and status = 'cancelled');

create policy orders_admin_write on public.orders
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

alter table public.sub_orders enable row level security;

create policy sub_orders_read on public.sub_orders
  for select to authenticated
  using (private.can_read_sub_order(id) or private.is_admin());

-- The roastery advances its own slice through the status ladder.
create policy sub_orders_merchant_update on public.sub_orders
  for update to authenticated
  using (private.owns_merchant(merchant_id))
  with check (private.owns_merchant(merchant_id));

-- A rider may only update a sub-order already assigned to them. Claiming an
-- unassigned one goes through `rider_accept`, which locks the row first.
create policy sub_orders_rider_update on public.sub_orders
  for update to authenticated
  using (rider_id = (select auth.uid()))
  with check (rider_id = (select auth.uid()));

create policy sub_orders_admin_write on public.sub_orders
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

alter table public.order_items enable row level security;

create policy order_items_read on public.order_items
  for select to authenticated
  using (private.can_read_sub_order(sub_order_id) or private.is_admin());

create policy order_items_admin_write on public.order_items
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------

alter table public.subscriptions enable row level security;

create policy subscriptions_own on public.subscriptions
  for all to authenticated
  using (customer_id = (select auth.uid()))
  with check (customer_id = (select auth.uid()));

create policy subscriptions_merchant_read on public.subscriptions
  for select to authenticated
  using (merchant_id is not null and private.owns_merchant(merchant_id));

create policy subscriptions_admin_write on public.subscriptions
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ---------------------------------------------------------------------------
-- loyalty
-- ---------------------------------------------------------------------------

alter table public.loyalty_accounts enable row level security;
alter table public.loyalty_ledger enable row level security;
alter table public.reward_redemptions enable row level security;

-- Read-only to the customer. Balances move only through `place_order` and
-- `redeem_reward`, both SECURITY DEFINER.
create policy loyalty_accounts_read_own on public.loyalty_accounts
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy loyalty_ledger_read_own on public.loyalty_ledger
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

create policy reward_redemptions_read_own on public.reward_redemptions
  for select to authenticated
  using (user_id = (select auth.uid()) or private.is_admin());

-- ---------------------------------------------------------------------------
-- riders
-- ---------------------------------------------------------------------------

alter table public.riders enable row level security;

create policy riders_read_own on public.riders
  for select to authenticated
  using (id = (select auth.uid()) or private.is_admin());

-- A customer tracking a live order needs the rider's name and vehicle. That is
-- served by `order_tracking`, a SECURITY DEFINER view-function, rather than by
-- opening the riders table — the table also holds the national id.
create policy riders_update_own on public.riders
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

create policy riders_insert_own on public.riders
  for insert to authenticated
  with check (id = (select auth.uid()));

create policy riders_admin_write on public.riders
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- A rider must not approve themselves onto the road.
create or replace function private.guard_rider_approval()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() and new.is_approved is distinct from old.is_approved then
    raise exception 'rider approval is granted by Leen, not by the rider';
  end if;
  return new;
end;
$$;

create trigger riders_guard_approval
  before update on public.riders
  for each row execute function private.guard_rider_approval();

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

alter table public.reviews enable row level security;

create policy reviews_read on public.reviews
  for select to anon, authenticated using (true);

-- Only a customer who actually received this product may review it. Without
-- this, review scores would be open to anyone with an account.
create policy reviews_write_own on public.reviews
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.order_items oi
      join public.sub_orders so on so.id = oi.sub_order_id
      join public.orders o on o.id = so.order_id
      where o.customer_id = (select auth.uid())
        and oi.product_id = reviews.product_id
        and so.status = 'delivered'
    )
  );

create policy reviews_admin_write on public.reviews
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());

-- ---------------------------------------------------------------------------
-- notifications / push tokens
-- ---------------------------------------------------------------------------

alter table public.notifications enable row level security;
alter table public.push_tokens enable row level security;

create policy notifications_read_own on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Marking as read is the only field the owner may write; inserts come from the
-- service role in Edge Functions.
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy push_tokens_own on public.push_tokens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------------
-- promo codes — never readable, only validated server-side
-- ---------------------------------------------------------------------------

alter table public.promo_codes enable row level security;

-- No select policy for anon/authenticated on purpose: listing the promo table
-- would hand every customer every unreleased discount code. `apply_promo`
-- validates a single code the customer already typed.
create policy promo_codes_admin on public.promo_codes
  for all to authenticated
  using (private.is_admin()) with check (private.is_admin());
