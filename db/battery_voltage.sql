-- db/battery_voltage.sql — raw terminal voltage per telemetry row.
-- Run once:  psql "$DATABASE_URL" -f db/battery_voltage.sql
-- The tracker firmware now reports the battery's raw VOLTAGE in the field that
-- used to hold a percentage. We keep the raw volts here (for graphs/reports and
-- the settled-voltage estimate) and compute the % (LiMnO2 CR17450 curve) into
-- the existing device_telemetry.battery / devices.battery columns.
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS voltage NUMERIC(4,2);
CREATE INDEX IF NOT EXISTS idx_dt_device_voltage ON device_telemetry (device_id, received_at DESC) WHERE voltage IS NOT NULL;
