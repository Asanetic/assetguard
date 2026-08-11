-- db/device_view.sql
-- Adds the two optional columns the View Device page reads/writes:
--   firmware  TEXT   -- current firmware version, e.g. v2.3.8
--   config    JSONB  -- { geofence:{enabled,radius_m}, motion_sensitivity,
--                    --   upload_interval, mounting_notes, install_photo }
-- Safe to run repeatedly (IF NOT EXISTS).

ALTER TABLE devices ADD COLUMN IF NOT EXISTS firmware TEXT;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS config   JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Give existing rows a sensible starting point so the page isn't empty.
UPDATE devices SET firmware = 'v2.3.8' WHERE firmware IS NULL;

UPDATE devices
   SET config = jsonb_build_object(
         'geofence',           jsonb_build_object('enabled', true, 'radius_m', 100),
         'motion_sensitivity', 50,
         'upload_interval',    '1 minute',
         'mounting_notes',     ''
       )
 WHERE config = '{}'::jsonb OR config IS NULL;
