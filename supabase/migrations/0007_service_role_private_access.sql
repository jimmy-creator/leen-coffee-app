-- `service_role` could not write to `products` or `merchants`:
--   permission denied for schema private
--
-- Not an RLS problem — service_role bypasses RLS. The cause is the trigger
-- functions. `private.products_search_key()` and `private.touch_updated_at()`
-- are plain (INVOKER) functions, so they execute as whoever fired the trigger,
-- and service_role had no USAGE on the `private` schema. Any backend write —
-- an Edge Function importing a catalogue, a seeding script — hit this.
--
-- The role-check helpers in 0002 were granted to anon and authenticated but not
-- to service_role, for the same reason they were needed there: a policy or
-- trigger body evaluated as the caller.
--
-- `private` stays off the API surface because it is not listed in
-- `[api] schemas`, not because particular roles lack rights to it.

grant usage on schema private to service_role;

-- Trigger helpers, fired on ordinary writes.
grant execute on function private.products_search_key() to service_role;
grant execute on function private.touch_updated_at() to service_role;
grant execute on function private.normalize_search(text) to service_role;

-- Guard triggers. These are SECURITY DEFINER, but a definer function still
-- needs the calling role to hold EXECUTE before its body runs.
grant execute on function private.guard_profile_role() to service_role;
grant execute on function private.guard_merchant_admin_columns() to service_role;
grant execute on function private.guard_rider_approval() to service_role;
grant execute on function private.refresh_merchant_rating() to service_role;

-- Role checks, called from inside the guards.
grant execute on function private.current_role_is(text) to service_role;
grant execute on function private.is_admin() to service_role;
grant execute on function private.owns_merchant(bigint) to service_role;
grant execute on function private.owns_order(bigint) to service_role;
grant execute on function private.can_read_sub_order(bigint) to service_role;

-- Pricing helpers, for a backend that needs to quote an order the same way
-- `place_order` does.
grant execute on function private.weight_multiplier(int) to service_role;
grant execute on function private.delivery_fee_minor(text) to service_role;
grant execute on function private.vat_minor(int) to service_role;
grant execute on function private.points_for(int) to service_role;
grant execute on function private.tier_for(int) to service_role;
grant execute on function private.next_order_code() to service_role;
