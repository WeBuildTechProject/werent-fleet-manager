DROP EXTENSION IF EXISTS pg_net;
CREATE EXTENSION pg_net WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION internal.run_notifications_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public, extensions
AS $$
DECLARE
  _token text;
BEGIN
  SELECT token INTO _token FROM internal.cron_tokens WHERE name = 'notifications';
  PERFORM extensions.http_post(
    url := 'https://project--cb7d32c4-032a-403e-9235-82389b195d7b.lovable.app/api/public/cron/notifications',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || _token
    ),
    body := '{}'::jsonb
  );
END;
$$;

REVOKE ALL ON FUNCTION internal.run_notifications_cron() FROM PUBLIC, anon, authenticated;