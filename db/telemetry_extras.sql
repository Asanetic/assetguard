-- db/telemetry_extras.sql
-- Extra interpreted columns so the TCP logs UI can show *everything* per packet:
-- the decoded status flags, MEMS dynamic (motion) value, the full cell + Wi-Fi
-- lists, and which alarms the packet raised. Additive & idempotent.

ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS fix_valid          BOOLEAN;
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS network_located    BOOLEAN;
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS status_disturbance BOOLEAN;
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS status_low_batt    BOOLEAN;
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS mems_dynamic       DOUBLE PRECISION;
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS cells              JSONB;
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS wifi               JSONB;
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS alarms             JSONB;

-- Apply the 30 m geofence "gospel" to devices still on the old 100 m default
-- (leaves any per-device radius you deliberately changed alone).
UPDATE devices
   SET config = jsonb_set(config, '{geofence,radius_m}', '30')
 WHERE config ? 'geofence'
   AND (config->'geofence'->>'radius_m') = '100';
