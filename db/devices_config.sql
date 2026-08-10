-- db/devices_config.sql — optional per-device install settings captured by the
-- "Add device" form (geofence radius, motion sensitivity, upload interval,
-- mounting notes). Additive & idempotent.
--   psql "$DATABASE_URL" -f db/devices_config.sql
ALTER TABLE devices ADD COLUMN IF NOT EXISTS config JSONB;
