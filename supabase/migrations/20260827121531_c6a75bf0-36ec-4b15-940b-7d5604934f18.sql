CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE SCHEMA IF NOT EXISTS internal;
REVOKE ALL ON SCHEMA internal FROM anon, authenticated;

CREATE TABLE IF NOT EXISTS internal.cron_tokens (
  name text PRIMARY KEY,
  token text NOT NULL DEFAULT encode(gen_random_bytes(32), 'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE internal.cron_tokens ENABLE ROW LEVEL SECURITY;

INSERT INTO internal.cron_tokens (name) VALUES ('notifications')
ON CONFLICT (name) DO NOTHING;

CREATE OR REPLACE FUNCTION public.cron_token(_name text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = internal, public
AS $$
  SELECT token FROM internal.cron_tokens WHERE name = _name;
$$;

REVOKE ALL ON FUNCTION public.cron_token(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cron_token(text) TO service_role;

CREATE OR REPLACE FUNCTION internal.run_notifications_cron()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = internal, public, net
AS $$
DECLARE
  _token text;
BEGIN
  SELECT token INTO _token FROM internal.cron_tokens WHERE name = 'notifications';
  PERFORM net.http_post(
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

SELECT cron.unschedule('werent-notifiche-giornaliere')
WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'werent-notifiche-giornaliere');

SELECT cron.schedule(
  'werent-notifiche-giornaliere',
  '15 6 * * *',
  $$SELECT internal.run_notifications_cron();$$
);