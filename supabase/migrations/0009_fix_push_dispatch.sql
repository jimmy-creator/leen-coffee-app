-- The notification trigger silently did nothing.
--
-- `private.notify_customer` called `extensions.net_http_post(...)`, which does
-- not exist: pg_net always creates its own `net` schema and names the function
-- `net.http_post`, whatever schema the CREATE EXTENSION clause asks for.
--
-- That alone would have been obvious, except the function's own
-- `exception when others then return` swallowed the error — and it swallowed
-- the notification INSERT with it, because both sat inside the same block. So
-- an order could move through every status and the customer would see nothing,
-- with no trace anywhere.
--
-- Two fixes:
--   * call the right function
--   * insert the notification OUTSIDE the protected block, so only the push
--     dispatch is best-effort. The row is the thing the app actually reads; it
--     should never be lost because Expo was unreachable.

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
  -- Not guarded. If this fails the caller should know about it.
  insert into public.notifications (user_id, title_en, title_ar, body_en, body_ar, path)
  values (p_user_id, p_title_en, p_title_ar, p_body_en, p_body_ar, p_path);

  -- Push delivery is best-effort by nature — a revoked token, a device offline,
  -- Expo having a bad afternoon — so only this half is allowed to fail quietly.
  begin
    select * into endpoint from private.push_endpoint();

    if endpoint.url is null or endpoint.service_key is null then
      return;
    end if;

    perform net.http_post(
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
      null;
  end;
end;
$$;

-- pg_net lives in `net`; the trigger runs as the merchant, rider or service
-- role that advanced the status, so each needs to reach it.
grant usage on schema net to authenticated, service_role;
grant execute on function net.http_post(text, jsonb, jsonb, jsonb, integer)
  to authenticated, service_role;
