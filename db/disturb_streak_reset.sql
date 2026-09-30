-- Clear per-device disturbance-streak overrides.
-- ---------------------------------------------------------------------------
-- The engine's default is now 1 (the FIRST disturbance raises), but a device
-- that has `disturb_streak` saved in devices.config keeps its own value —
-- resolveConfig prefers the stored key over the default. So any device
-- configured back when the default was 4 would still silently wait for four
-- shakes, and its test alarms would not come in.
--
-- This removes the stored key only. Every other config value is untouched, and
-- devices with no override are not modified at all.
--
-- Idempotent: safe to run more than once.
--
--   psql "$DATABASE_URL" -f db/disturb_streak_reset.sql

BEGIN;

-- What is about to change, before it changes.
SELECT count(*) AS devices_with_override
  FROM devices
 WHERE config ? 'disturb_streak';

UPDATE devices
   SET config = config - 'disturb_streak'
 WHERE config ? 'disturb_streak';

-- Legacy nested shape from the old Add-device form: config.disturbance.streak.
UPDATE devices
   SET config = jsonb_set(
         config,
         '{disturbance}',
         (config -> 'disturbance') - 'streak'
       )
 WHERE config -> 'disturbance' ? 'streak';

COMMIT;

-- Confirm nothing is left holding an override.
SELECT count(*) AS remaining_overrides
  FROM devices
 WHERE config ? 'disturb_streak'
    OR config -> 'disturbance' ? 'streak';
