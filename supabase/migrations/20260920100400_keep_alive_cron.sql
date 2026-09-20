-- Keep-alive cron jobs to prevent free-tier project pausing from inactivity.
-- Also maintains a visible heartbeat row for monitoring.
-- Requires pg_cron already enabled (do not re-run CREATE EXTENSION pg_cron here).

CREATE TABLE IF NOT EXISTS public.system_heartbeats (
  id int PRIMARY KEY DEFAULT 1,
  last_ping timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.system_heartbeats (id, last_ping)
VALUES (1, now())
ON CONFLICT (id) DO UPDATE SET last_ping = excluded.last_ping;

ALTER TABLE public.system_heartbeats ENABLE ROW LEVEL SECURITY;

-- Simple keep-alive ping every 6 hours
SELECT cron.schedule(
  'lovli-keep-alive',
  '0 */6 * * *',
  $$ SELECT 1; $$
);

-- Heartbeat table update every 6 hours (offset by 1 minute)
SELECT cron.schedule(
  'lovli-heartbeat-update',
  '1 */6 * * *',
  $$
    INSERT INTO public.system_heartbeats (id, last_ping)
    VALUES (1, now())
    ON CONFLICT (id) DO UPDATE SET last_ping = now();
  $$
);
