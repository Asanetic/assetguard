-- db/telemetry_geo.sql
-- Position accuracy + source, so the UI/map can show ±radius and whether a fix
-- was GPS (≈10 m) or derived from cell/Wi-Fi via Google Geolocation (coarser).
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS accuracy   DOUBLE PRECISION; -- metres
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS loc_source TEXT;             -- gps | network
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS geo_error  TEXT;             -- why network geolocation failed (if it did)
ALTER TABLE device_telemetry ADD COLUMN IF NOT EXISTS geo_raw    JSONB;            -- raw Google Geolocation response (for the UI)
