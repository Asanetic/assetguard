-- db/alarms_ingest.sql
-- Alarms raised by the ingest alarm engine.
--
-- This is written to be SAFE whether or not you already have an `alarms` table:
--   * CREATE TABLE IF NOT EXISTS creates it fresh if it's missing.
--   * The ADD COLUMN IF NOT EXISTS lines make sure every column the engine writes
--     exists even on a pre-existing `alarms` table — so ingest inserts won't fail.
-- If your existing All Alarms page uses different column names, share that table
-- and I'll map the engine's insert to it instead.

CREATE TABLE IF NOT EXISTS alarms (
  id           BIGSERIAL PRIMARY KEY,
  device_id    BIGINT REFERENCES devices(id) ON DELETE SET NULL,
  site_id      BIGINT REFERENCES sites(id)   ON DELETE SET NULL,
  imei         TEXT,
  alarm_type   TEXT NOT NULL,          -- DISTURBANCE | CRITICAL_MOTION | LOW_BATTERY | GEOFENCE_EXIT | DEVICE_OFFLINE
  severity     TEXT NOT NULL DEFAULT 'warning',   -- info | warning | critical
  message      TEXT,
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  value        TEXT,                   -- the triggering value (speed, %, distance, motion byte)
  telemetry_id BIGINT,                 -- references device_telemetry(id) (soft link)
  status       TEXT NOT NULL DEFAULT 'open',      -- open | acknowledged | resolved | false
  source       TEXT NOT NULL DEFAULT 'device',    -- device | manual
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMPTZ,
  resolved_at  TIMESTAMPTZ
);

-- Make sure every engine column exists even if `alarms` predates this file.
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS device_id    BIGINT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS site_id      BIGINT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS imei         TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS alarm_type   TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS severity     TEXT DEFAULT 'warning';
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS message      TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS lat          DOUBLE PRECISION;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS lng          DOUBLE PRECISION;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS value        TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS telemetry_id BIGINT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS status       TEXT DEFAULT 'open';
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS source       TEXT DEFAULT 'device';
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS created_at   TIMESTAMPTZ DEFAULT now();
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS resolved_at  TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_alarms_open       ON alarms (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alarms_device     ON alarms (device_id, created_at DESC);

-- Optional de-dupe guard: stop the same open alarm type from stacking every
-- second while a condition persists. One open row per (device, type) at a time.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_open_alarm_per_device_type
  ON alarms (device_id, alarm_type) WHERE status = 'open';
