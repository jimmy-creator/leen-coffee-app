-- Leen Coffee — core schema.
--
-- Conventions used throughout, and the reasons for them:
--   * Money is an integer count of halalas (1 SAR = 100). Never numeric, never
--     float: totals are summed in a dozen places and a float cent drift shows up
--     on a customer's invoice.
--   * Surrogate keys are `bigint generated always as identity`. The one
--     exception is `profiles.id`, which must be the `auth.users` uuid.
--   * Every user-visible string that a merchant supplies exists as an `_en` /
--     `_ar` pair. UI chrome is translated in `@leen/i18n` instead — merchants
--     type their own product names, we do not machine-translate them.
--   * Timestamps are `timestamptz`. Riyadh is UTC+3 with no DST, but the
--     merchant app and the admin dashboard are read from other timezones.
--   * Enumerated values are `text` + a check constraint rather than a Postgres
--     enum, so adding a value later is a one-line migration instead of a
--     type rewrite that locks every dependent table.

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "pg_trgm" with schema extensions;

-- Private schema for SECURITY DEFINER helpers. Nothing here is exposed over
-- PostgREST — `api.schemas` in config.toml lists only public + graphql_public.
create schema if not exists private;

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'customer'
    check (role in ('customer', 'merchant', 'rider', 'admin')),
  full_name text,
  phone text,
  avatar_url text,
  -- Arabic is the product default; a profile only overrides it explicitly.
  locale text not null default 'ar' check (locale in ('en', 'ar')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.profiles is
  'One row per auth user. `role` decides which of the six Leen apps the account can act in.';

-- Riders are looked up by availability on every dispatch; customers never are.
create index profiles_role_idx on public.profiles (role);

-- A new auth user always gets a profile, so no app ever has to cope with a
-- signed-in user that has no row. Runs as definer because `auth.users` triggers
-- fire outside any RLS context.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, phone, full_name)
  values (
    new.id,
    new.phone,
    coalesce(new.raw_user_meta_data ->> 'full_name', null)
  )
  on conflict (id) do nothing;

  insert into public.loyalty_accounts (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- merchants (roasteries)
-- ---------------------------------------------------------------------------

create table public.merchants (
  id bigint generated always as identity primary key,
  owner_id uuid references public.profiles (id) on delete set null,
  name_en text not null,
  name_ar text,
  tagline_en text,
  tagline_ar text,
  city_en text,
  city_ar text,
  district_en text,
  district_ar text,
  about_en text,
  about_ar text,
  logo_url text,
  cover_url text,
  phone text,
  established_year int check (established_year between 1900 and 2200),
  -- Denormalized from `reviews` by trigger. Reading a store card must not fan
  -- out into an aggregate over every review the roastery ever received.
  rating numeric(2, 1) not null default 0 check (rating >= 0 and rating <= 5),
  rating_count int not null default 0 check (rating_count >= 0),
  eta_min_minutes int not null default 35 check (eta_min_minutes > 0),
  eta_max_minutes int not null default 60 check (eta_max_minutes > 0),
  min_order_minor int not null default 0 check (min_order_minor >= 0),
  -- Platform cut, captured per sub-order at checkout.
  commission_rate numeric(5, 2) not null default 12.00
    check (commission_rate >= 0 and commission_rate <= 100),
  delivery_radius_km numeric(5, 2) not null default 15
    check (delivery_radius_km > 0),
  lat double precision,
  lng double precision,
  -- `is_active` is the admin's switch (approved and listed at all).
  -- `is_open` is the merchant's own switch (taking orders right now).
  is_active boolean not null default false,
  is_open boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint merchants_eta_range check (eta_max_minutes >= eta_min_minutes)
);

comment on column public.merchants.is_active is
  'Admin approval. `is_open` is the merchant''s own open/closed toggle — both must be true to accept orders.';

create index merchants_owner_id_idx on public.merchants (owner_id);
-- The home feed reads only listed, currently-open roasteries.
create index merchants_listed_idx on public.merchants (rating desc)
  where is_active and is_open;

-- ---------------------------------------------------------------------------
-- categories
-- ---------------------------------------------------------------------------

create table public.categories (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name_en text not null,
  name_ar text,
  sort_order int not null default 0,
  is_active boolean not null default true
);

create index categories_sort_idx on public.categories (sort_order) where is_active;

-- ---------------------------------------------------------------------------
-- products
-- ---------------------------------------------------------------------------

create table public.products (
  id bigint generated always as identity primary key,
  merchant_id bigint not null references public.merchants (id) on delete cascade,
  category_id bigint references public.categories (id) on delete set null,
  name_en text not null,
  name_ar text,
  -- Tasting notes, stored as the display string ("Date · cocoa · dried fig").
  -- The product page splits on the separator to render one chip per note.
  notes_en text,
  notes_ar text,
  about_en text,
  about_ar text,
  roast_level text not null default 'medium'
    check (roast_level in ('light', 'medium', 'medium_dark', 'dark')),
  process text
    check (process in ('washed', 'natural', 'honey', 'anaerobic', 'pulped_natural')),
  origin_en text,
  origin_ar text,
  altitude_en text,
  altitude_ar text,
  variety_en text,
  variety_ar text,
  -- Reference price for a 250 g bag. Larger bags are derived from this by the
  -- multipliers in `@leen/lib` — mirrored in `private.weight_multiplier()` so
  -- the server never trusts a client-sent price.
  base_price_minor int not null check (base_price_minor > 0),
  image_url text,
  roasted_on date,
  stock_qty int not null default 0 check (stock_qty >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  -- Diacritic-folded name+origin, maintained by trigger, so an Arabic search for
  -- "قهوه" still finds "قهوة". Plain ilike cannot do that folding.
  search_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_merchant_id_idx on public.products (merchant_id);
create index products_category_id_idx on public.products (category_id);
create index products_search_key_idx on public.products using gin (search_key extensions.gin_trgm_ops);
-- The two feeds the customer home screen builds.
create index products_featured_idx on public.products (created_at desc)
  where is_active and is_featured;
create index products_fresh_idx on public.products (roasted_on desc)
  where is_active;

-- ---------------------------------------------------------------------------
-- addresses
-- ---------------------------------------------------------------------------

create table public.addresses (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  label text not null default 'Home',
  -- Saudi National Address fields. Delivery here keys off the district far more
  -- than the street, so district and city are the required pair.
  building_number text,
  street text not null,
  district text not null,
  city text not null,
  postal_code text,
  additional_number text,
  notes text,
  lat double precision,
  lng double precision,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create index addresses_user_id_idx on public.addresses (user_id);
-- At most one default per customer, enforced by the database rather than by
-- whichever app happened to write last.
create unique index addresses_one_default_idx on public.addresses (user_id)
  where is_default;

-- ---------------------------------------------------------------------------
-- cart
-- ---------------------------------------------------------------------------

create table public.cart_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id bigint not null references public.products (id) on delete cascade,
  qty int not null default 1 check (qty > 0 and qty <= 99),
  grind text not null default 'whole_bean'
    check (grind in ('whole_bean', 'espresso', 'filter', 'turkish')),
  weight_g int not null default 500 check (weight_g in (250, 500, 1000)),
  created_at timestamptz not null default now(),
  -- The same bean at a different grind or bag size is a distinct line, but
  -- adding an identical configuration twice must bump qty, not add a row.
  unique (user_id, product_id, grind, weight_g)
);

create index cart_items_user_id_idx on public.cart_items (user_id);
create index cart_items_product_id_idx on public.cart_items (product_id);

-- ---------------------------------------------------------------------------
-- promo codes
-- ---------------------------------------------------------------------------

create table public.promo_codes (
  id bigint generated always as identity primary key,
  code text not null unique,
  -- Exactly one of the two is set; the check below enforces it.
  discount_minor int check (discount_minor > 0),
  discount_percent numeric(5, 2) check (discount_percent > 0 and discount_percent <= 100),
  max_discount_minor int check (max_discount_minor > 0),
  min_order_minor int not null default 0 check (min_order_minor >= 0),
  valid_from timestamptz not null default now(),
  valid_until timestamptz,
  max_uses int check (max_uses > 0),
  uses int not null default 0 check (uses >= 0),
  is_active boolean not null default true,
  constraint promo_one_discount_kind check (
    (discount_minor is not null) <> (discount_percent is not null)
  )
);

create unique index promo_codes_code_upper_idx on public.promo_codes (upper(code));

-- ---------------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------------

create table public.orders (
  id bigint generated always as identity primary key,
  -- Human-quotable reference printed on the tracking screen ("LN-48192").
  code text not null unique,
  customer_id uuid not null references public.profiles (id) on delete restrict,
  address_id bigint references public.addresses (id) on delete set null,
  -- The address is copied in at checkout: editing or deleting the saved address
  -- afterwards must not rewrite where a past order was sent.
  address_snapshot jsonb,
  fulfilment text not null default 'standard'
    check (fulfilment in ('standard', 'express', 'pickup')),
  payment_method text not null
    check (payment_method in ('mada', 'apple_pay', 'stc_pay', 'cash_on_delivery')),
  payment_status text not null default 'pending'
    check (payment_status in ('pending', 'authorized', 'captured', 'failed', 'refunded')),
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'roasting', 'ready', 'picked_up', 'delivered', 'cancelled')),
  subtotal_minor int not null check (subtotal_minor >= 0),
  delivery_minor int not null default 0 check (delivery_minor >= 0),
  vat_minor int not null default 0 check (vat_minor >= 0),
  discount_minor int not null default 0 check (discount_minor >= 0),
  total_minor int not null check (total_minor >= 0),
  promo_code text,
  points_earned int not null default 0 check (points_earned >= 0),
  placed_at timestamptz not null default now(),
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text
);

create index orders_customer_id_idx on public.orders (customer_id, placed_at desc);
create index orders_address_id_idx on public.orders (address_id);
create index orders_status_idx on public.orders (status) where status <> 'delivered';

-- One basket can span several roasteries. Each roastery's slice is a sub-order
-- that moves through the status ladder on its own — one can be out for delivery
-- while another is still roasting.
create table public.sub_orders (
  id bigint generated always as identity primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  merchant_id bigint not null references public.merchants (id) on delete restrict,
  rider_id uuid references public.profiles (id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'roasting', 'ready', 'picked_up', 'delivered', 'cancelled')),
  subtotal_minor int not null check (subtotal_minor >= 0),
  commission_minor int not null default 0 check (commission_minor >= 0),
  rider_fee_minor int not null default 0 check (rider_fee_minor >= 0),
  eta_minutes int,
  confirmed_at timestamptz,
  ready_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancel_reason text,
  created_at timestamptz not null default now(),
  unique (order_id, merchant_id)
);

create index sub_orders_order_id_idx on public.sub_orders (order_id);
create index sub_orders_merchant_id_idx on public.sub_orders (merchant_id, created_at desc);
create index sub_orders_rider_id_idx on public.sub_orders (rider_id);
-- The delivery app's job board: ready, nobody assigned.
create index sub_orders_unassigned_idx on public.sub_orders (created_at)
  where rider_id is null and status in ('ready', 'confirmed', 'roasting');

create table public.order_items (
  id bigint generated always as identity primary key,
  sub_order_id bigint not null references public.sub_orders (id) on delete cascade,
  product_id bigint references public.products (id) on delete set null,
  -- Snapshots. A merchant renaming or reprising a bean must not retroactively
  -- change what a delivered order says it was.
  name_en text not null,
  name_ar text,
  grind text not null
    check (grind in ('whole_bean', 'espresso', 'filter', 'turkish')),
  weight_g int not null check (weight_g in (250, 500, 1000)),
  qty int not null check (qty > 0),
  unit_price_minor int not null check (unit_price_minor >= 0),
  line_total_minor int not null check (line_total_minor >= 0),
  roasted_on date
);

create index order_items_sub_order_id_idx on public.order_items (sub_order_id);
create index order_items_product_id_idx on public.order_items (product_id);

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------

create table public.subscription_plans (
  id bigint generated always as identity primary key,
  slug text not null unique,
  name_en text not null,
  name_ar text,
  description_en text,
  description_ar text,
  price_minor int not null check (price_minor > 0),
  -- Array of short perk labels rendered as chips on the plan card.
  perks_en text[] not null default '{}',
  perks_ar text[] not null default '{}',
  sort_order int not null default 0,
  is_active boolean not null default true
);

create table public.subscriptions (
  id bigint generated always as identity primary key,
  customer_id uuid not null references public.profiles (id) on delete cascade,
  plan_id bigint not null references public.subscription_plans (id) on delete restrict,
  -- Null means "we rotate the roastery for you", which is the whole point of
  -- the Explorer plan.
  merchant_id bigint references public.merchants (id) on delete set null,
  address_id bigint references public.addresses (id) on delete set null,
  frequency text not null default 'biweekly'
    check (frequency in ('weekly', 'biweekly', 'monthly')),
  grind text not null default 'whole_bean'
    check (grind in ('whole_bean', 'espresso', 'filter', 'turkish')),
  status text not null default 'active'
    check (status in ('active', 'paused', 'cancelled')),
  next_delivery_on date,
  created_at timestamptz not null default now(),
  cancelled_at timestamptz
);

create index subscriptions_customer_id_idx on public.subscriptions (customer_id);
create index subscriptions_plan_id_idx on public.subscriptions (plan_id);
create index subscriptions_merchant_id_idx on public.subscriptions (merchant_id);
create index subscriptions_address_id_idx on public.subscriptions (address_id);
-- The cron that raises the next cycle's orders reads exactly this slice.
create index subscriptions_due_idx on public.subscriptions (next_delivery_on)
  where status = 'active';

-- ---------------------------------------------------------------------------
-- loyalty
-- ---------------------------------------------------------------------------

create table public.loyalty_accounts (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  points int not null default 0 check (points >= 0),
  -- Never decreases; tier is derived from this, so redeeming points cannot
  -- demote a customer who has already earned the standing.
  lifetime_points int not null default 0 check (lifetime_points >= 0),
  tier text not null default 'qahwa_bronze'
    check (tier in ('qahwa_bronze', 'qahwa_silver', 'qahwa_gold', 'qahwa_black')),
  updated_at timestamptz not null default now()
);

-- Append-only audit of every points movement. The balance on
-- `loyalty_accounts` is a cache of this ledger's sum.
create table public.loyalty_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta int not null,
  reason text not null,
  order_id bigint references public.orders (id) on delete set null,
  created_at timestamptz not null default now()
);

create index loyalty_ledger_user_id_idx on public.loyalty_ledger (user_id, created_at desc);
create index loyalty_ledger_order_id_idx on public.loyalty_ledger (order_id);

create table public.rewards (
  id bigint generated always as identity primary key,
  name_en text not null,
  name_ar text,
  points_cost int not null check (points_cost > 0),
  kind text not null default 'perk'
    check (kind in ('free_delivery', 'free_bag', 'gear', 'perk')),
  is_active boolean not null default true,
  sort_order int not null default 0
);

create table public.reward_redemptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  reward_id bigint not null references public.rewards (id) on delete restrict,
  points_spent int not null check (points_spent > 0),
  redeemed_at timestamptz not null default now(),
  consumed_order_id bigint references public.orders (id) on delete set null
);

create index reward_redemptions_user_id_idx on public.reward_redemptions (user_id, redeemed_at desc);
create index reward_redemptions_reward_id_idx on public.reward_redemptions (reward_id);
create index reward_redemptions_order_id_idx on public.reward_redemptions (consumed_order_id);

-- ---------------------------------------------------------------------------
-- riders
-- ---------------------------------------------------------------------------

create table public.riders (
  id uuid primary key references public.profiles (id) on delete cascade,
  vehicle text,
  plate text,
  national_id text,
  rating numeric(2, 1) not null default 5.0 check (rating >= 0 and rating <= 5),
  rating_count int not null default 0 check (rating_count >= 0),
  is_online boolean not null default false,
  is_approved boolean not null default false,
  lat double precision,
  lng double precision,
  location_updated_at timestamptz,
  created_at timestamptz not null default now()
);

-- Dispatch searches only riders who are approved and currently online.
create index riders_available_idx on public.riders (location_updated_at desc)
  where is_online and is_approved;

-- ---------------------------------------------------------------------------
-- reviews
-- ---------------------------------------------------------------------------

create table public.reviews (
  id bigint generated always as identity primary key,
  product_id bigint not null references public.products (id) on delete cascade,
  merchant_id bigint not null references public.merchants (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  order_id bigint references public.orders (id) on delete set null,
  rating int not null check (rating between 1 and 5),
  body text,
  created_at timestamptz not null default now(),
  -- One review per customer per product; editing updates the same row.
  unique (product_id, user_id)
);

create index reviews_product_id_idx on public.reviews (product_id, created_at desc);
create index reviews_merchant_id_idx on public.reviews (merchant_id);
create index reviews_user_id_idx on public.reviews (user_id);
create index reviews_order_id_idx on public.reviews (order_id);

-- ---------------------------------------------------------------------------
-- banners / notifications / push
-- ---------------------------------------------------------------------------

create table public.banners (
  id bigint generated always as identity primary key,
  title_en text,
  title_ar text,
  subtitle_en text,
  subtitle_ar text,
  kicker_en text,
  kicker_ar text,
  image_url text,
  -- Deep link path within the customer app, e.g. "/store/3".
  target_path text,
  sort_order int not null default 0,
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz
);

create index banners_live_idx on public.banners (sort_order) where is_active;

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  title_en text not null,
  title_ar text,
  body_en text,
  body_ar text,
  path text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_id_idx on public.notifications (user_id, created_at desc);
create index notifications_unread_idx on public.notifications (user_id) where read_at is null;

create table public.push_tokens (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  token text not null unique,
  platform text check (platform in ('ios', 'android', 'web')),
  created_at timestamptz not null default now()
);

create index push_tokens_user_id_idx on public.push_tokens (user_id);

-- ---------------------------------------------------------------------------
-- triggers
-- ---------------------------------------------------------------------------

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();
create trigger merchants_touch before update on public.merchants
  for each row execute function private.touch_updated_at();
create trigger products_touch before update on public.products
  for each row execute function private.touch_updated_at();

-- Fold Arabic letter variants and strip diacritics so search is forgiving.
-- Mirrors `normalizeQuery` in @leen/lib — change both together.
create or replace function private.normalize_search(input text)
returns text
language sql
immutable
set search_path = ''
as $$
  select regexp_replace(
    translate(
      lower(coalesce(input, '')),
      'آأإٱةى',
      'ااااهي'
    ),
    '[ًٌٍَُِّْٰـ]',
    '',
    'g'
  );
$$;

create or replace function private.products_search_key()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.search_key = private.normalize_search(
    concat_ws(' ',
      new.name_en, new.name_ar,
      new.origin_en, new.origin_ar,
      new.notes_en, new.notes_ar,
      new.variety_en, new.variety_ar)
  );
  return new;
end;
$$;

create trigger products_search_key_trg
  before insert or update of name_en, name_ar, origin_en, origin_ar,
                            notes_en, notes_ar, variety_en, variety_ar
  on public.products
  for each row execute function private.products_search_key();

-- Keep the denormalized rating on products' merchant in step with `reviews`.
create or replace function private.refresh_merchant_rating()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_merchant bigint := coalesce(new.merchant_id, old.merchant_id);
begin
  update public.merchants m
  set rating = coalesce(agg.avg_rating, 0),
      rating_count = coalesce(agg.n, 0)
  from (
    select round(avg(rating)::numeric, 1) as avg_rating, count(*) as n
    from public.reviews
    where merchant_id = target_merchant
  ) agg
  where m.id = target_merchant;

  return null;
end;
$$;

create trigger reviews_refresh_rating
  after insert or update or delete on public.reviews
  for each row execute function private.refresh_merchant_rating();

-- Fire the profile/loyalty bootstrap. Declared last because the function body
-- touches `public.loyalty_accounts`, which is created further up this file.
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
