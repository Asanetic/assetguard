-- db/app_heartbeat.sql — proof-of-life pings written by the running web app.
-- Run once:  psql "$DATABASE_URL" -f db/app_heartbeat.sql
-- The app inserts one row per minute while it is online; "Platform uptime" is
-- then the share of time these pings were present (i.e. the app was up), NOT
-- whether devices were sending data.
CREATE TABLE IF NOT EXISTS app_heartbeat (
  ts TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_app_heartbeat_ts ON app_heartbeat (ts DESC);
