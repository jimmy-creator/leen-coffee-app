-- The `private.*` helpers are called from inside RLS policies, and a policy's
-- USING expression is evaluated as the *calling* role — not as the definer.
-- Revoking EXECUTE from `authenticated` therefore did not lock the helpers
-- down; it broke every policy that uses one, with "permission denied for
-- function is_admin" on ordinary reads.
--
-- What actually keeps these off the API surface is the schema: `private` is not
-- listed in `[api] schemas` in config.toml, so PostgREST will not expose it, and
-- there is no URL that reaches these functions directly. Each one also checks
-- `auth.uid()` in its own body and returns nothing but a boolean about the
-- caller, so being callable is not itself a disclosure.
--
-- `anon` needs them too: the public product policy tests the roastery is listed,
-- which evaluates `merchants`' own policies, and one of those calls is_admin().

grant usage on schema private to anon, authenticated;

grant execute on function private.current_role_is(text) to anon, authenticated;
grant execute on function private.is_admin() to anon, authenticated;
grant execute on function private.owns_merchant(bigint) to anon, authenticated;
grant execute on function private.owns_order(bigint) to anon, authenticated;
grant execute on function private.can_read_sub_order(bigint) to anon, authenticated;

-- The pricing helpers are called from inside the SECURITY DEFINER RPCs, which
-- run as the definer, so those stay revoked. `weight_multiplier` and friends are
-- pure arithmetic, but there is no reason for a client to reach them.
