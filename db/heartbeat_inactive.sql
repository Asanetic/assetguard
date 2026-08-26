-- db/heartbeat_inactive.sql
-- Heartbeat prediction + Inactive device state.
-- Run once:  psql "$DATABASE_URL" -f db/heartbeat_inactive.sql
--
-- Adds per-device heartbeat timing columns and seeds the wake-interval / tolerance
-- config. The wake interval drives BOTH heartbeat prediction and the offline
-- timeout. "Inactive" is a sticky, manual-exit status (a device put off by an
-- incident or by a pwroff command); it is NOT the same as auto-clearing "Offline".

ALTER TABLE devices ADD COLUMN IF NOT EXISTS hb_last_at TIMESTAMPTZ;   -- last real heartbeat
ALTER TABLE devices ADD COLUMN IF NOT EXISTS hb_next_at TIMESTAMPTZ;   -- predicted next heartbeat
ALTER TABLE devices ADD COLUMN IF NOT EXISTS hb_drift_sec NUMERIC DEFAULT 0;

-- Seed heartbeat config into every device (defaults || existing so we never clobber
-- a value already set). wake_interval_sec default = 86400 (24 h); hb_tolerance_sec
-- default = 300 (±5 min → a 10-minute window).
UPDATE devices SET config =
  jsonb_build_object(
    'wake_interval_sec', 86400,
    'hb_tolerance_sec', 300
  ) || COALESCE(config, '{}'::jsonb);

-- Back-compat: if a device already had offline_hours set, carry it into
-- wake_interval_sec (seconds) so behaviour is unchanged for those devices.
UPDATE devices
   SET config = config || jsonb_build_object(
         'wake_interval_sec', (NULLIF(config->>'offline_hours','')::numeric * 3600))
 WHERE NULLIF(config->>'offline_hours','') IS NOT NULL
   AND (config->>'wake_interval_sec') = '86400';

CREATE INDEX IF NOT EXISTS idx_devices_hb_next ON devices (hb_next_at);
CREATE INDEX IF NOT EXISTS idx_devices_status  ON devices (status);
