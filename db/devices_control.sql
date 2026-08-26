-- db/devices_control.sql
-- Per-device monitoring controls (Group devices batch ops), mirroring sites.
--   armed       : is this device actively monitored? Disarm suppresses its paging.
--   mute_until  : while > now(), this device's alarms are downgraded to Low.
-- Combined with the site-level flags, the most-restrictive wins at alarm time.
-- Data-bundle plan / SIM provider / SIM-replacement flag live in config JSONB.
-- Idempotent.

ALTER TABLE devices ADD COLUMN IF NOT EXISTS armed      BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS mute_until TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_devices_mute_until ON devices (mute_until) WHERE mute_until IS NOT NULL;
