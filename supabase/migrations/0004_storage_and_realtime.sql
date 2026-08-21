-- Leen Coffee — storage buckets, their policies, and realtime.

-- ---------------------------------------------------------------------------
-- buckets
-- ---------------------------------------------------------------------------

-- Product and roastery imagery is public: it is served straight into the
-- storefront and the CDN in front of it should be allowed to cache it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif']),
  ('merchant-branding', 'merchant-branding', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml']),
  ('banner-images', 'banner-images', true, 5242880,
   array['image/jpeg', 'image/png', 'image/webp', 'image/avif'])
on conflict (id) do nothing;

-- Delivery proof photos and rider documents are private. A proof-of-delivery
-- photo is taken at a customer's front door; it must not be world-readable by
-- guessing a path.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('delivery-proofs', 'delivery-proofs', false, 5242880,
   array['image/jpeg', 'image/png', 'image/webp']),
  ('rider-documents', 'rider-documents', false, 10485760,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- storage policies
-- ---------------------------------------------------------------------------

-- Public buckets: readable by anyone, writable only by the roastery that owns
-- the first path segment. Objects are stored as `<merchant_id>/<file>`, so the
-- ownership check is a lookup on that segment.
create policy "public images are readable"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id in ('product-images', 'merchant-branding', 'banner-images'));

create policy "merchants write their own images"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id in ('product-images', 'merchant-branding')
    and private.owns_merchant((storage.foldername(name))[1]::bigint)
  );

create policy "merchants update their own images"
  on storage.objects for update
  to authenticated
  using (
    bucket_id in ('product-images', 'merchant-branding')
    and private.owns_merchant((storage.foldername(name))[1]::bigint)
  );

create policy "merchants delete their own images"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id in ('product-images', 'merchant-branding')
    and private.owns_merchant((storage.foldername(name))[1]::bigint)
  );

create policy "admins manage banner images"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'banner-images' and private.is_admin())
  with check (bucket_id = 'banner-images' and private.is_admin());

-- Private buckets: the rider uploads, and only the people on that delivery
-- (rider, roastery, customer) can read it back.
create policy "riders upload delivery proofs"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'delivery-proofs'
    and private.can_read_sub_order((storage.foldername(name))[1]::bigint)
  );

create policy "delivery parties read proofs"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'delivery-proofs'
    and private.can_read_sub_order((storage.foldername(name))[1]::bigint)
  );

-- Rider documents are stored as `<rider_uuid>/<file>`; the rider and Leen see
-- them, nobody else.
create policy "riders manage their own documents"
  on storage.objects for all
  to authenticated
  using (
    bucket_id = 'rider-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_admin())
  )
  with check (
    bucket_id = 'rider-documents'
    and ((storage.foldername(name))[1] = (select auth.uid())::text or private.is_admin())
  );

-- ---------------------------------------------------------------------------
-- realtime
-- ---------------------------------------------------------------------------

-- The customer's tracking screen and the merchant's order board both subscribe
-- to sub-order changes. RLS still applies to realtime, so a subscriber only
-- receives rows its policies already allow it to select.
alter publication supabase_realtime add table public.sub_orders;
alter publication supabase_realtime add table public.orders;
alter publication supabase_realtime add table public.notifications;

-- Realtime sends only the primary key on an UPDATE unless the table has a
-- replica identity that covers the columns subscribers filter on. The order
-- board filters by merchant_id, which is not the PK, so send the full row.
alter table public.sub_orders replica identity full;
alter table public.orders replica identity full;
