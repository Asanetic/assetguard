-- Why is this device not raising test alarms?
-- ---------------------------------------------------------------------------
-- Run this while a technician has a job open, right after they shake a tracker.
-- Each block answers one question in order. The first one that comes back wrong
-- is the answer — stop there.
--
--   psql "$DATABASE_URL" -f DIAGNOSE.sql
--
-- Set the device you are testing here (the human device_id, or the IMEI):
\set DEV '''REPLACE_ME'''

\echo ''
\echo '=== 1. Does the device exist, and is it assigned to a site? ==========='
-- site_id NULL is FINE since round 11 (the session also matches by device id),
-- but it was the cause of the original failure, so it is worth seeing.
SELECT id, device_id, imei, site_id, status, last_seen
  FROM devices
 WHERE device_id = :DEV OR imei = :DEV;

\echo ''
\echo '=== 2. Is there an open technician session covering it? =============='
-- Must be: closed_at NULL, expires_at in the future, and EITHER site_id matching
-- the device's site OR the device named in device_ids.
SELECT s.id, s.technician_id, s.site_id, s.device_id, s.device_ids,
       s.job_type, s.opened_at, s.expires_at,
       (s.expires_at > now())                                    AS still_valid,
       (s.site_id = d.site_id)                                   AS matches_by_site,
       (d.device_id = ANY(s.device_ids) OR s.device_id = d.device_id) AS matches_by_device
  FROM technician_work_sessions s
  CROSS JOIN LATERAL (
    SELECT * FROM devices WHERE device_id = :DEV OR imei = :DEV LIMIT 1
  ) d
 WHERE s.closed_at IS NULL
 ORDER BY s.opened_at DESC
 LIMIT 5;
-- NO ROWS  -> the app never opened a session (check the phone had signal), or it
--             already expired, or the work log closed it.
-- ROWS but both match columns false -> the session is for a different site and
--             does not name this device. The app should be sending device_ids.

\echo ''
\echo '=== 3. Did the packet even arrive, and did it carry a disturbance? ==='
-- motion_byte 3rd character = 1, or mems_dynamic >= the device threshold
-- (default 1800 mg). If status_disturbance is false and mems_dynamic is small,
-- the tracker did not report a disturbance at all — nothing downstream can fix
-- that, and the shake was not firm enough or the bit is not being set.
SELECT dt.received_at, dt.motion_byte, dt.status_disturbance, dt.mems_dynamic,
       dt.src_ip, dt.satellites, dt.fix
  FROM device_telemetry dt
  JOIN devices d ON d.id = dt.device_id
 WHERE (d.device_id = :DEV OR d.imei = :DEV)
   AND dt.received_at > now() - interval '30 minutes'
 ORDER BY dt.received_at DESC
 LIMIT 15;

\echo ''
\echo '=== 4. What alarms came out of it? ==================================='
-- source = 'test'   -> working as intended
-- source = 'device' -> the session did NOT cover it; see block 2
-- no rows           -> see block 3, then the [underTest] line in the pm2 log
SELECT id, device_id, alarm_type, name, priority, source, status, created_at
  FROM alarms
 WHERE device_id = :DEV
   AND created_at > now() - interval '30 minutes'
 ORDER BY created_at DESC
 LIMIT 15;

\echo ''
\echo '=== 5. Leftovers that can block a REAL alarm ========================='
-- DISTURBANCE_TECH is no longer produced. Any still open will gate real
-- disturbances on that device until closed.
SELECT id, device_id, alarm_type, status, created_at
  FROM alarms
 WHERE alarm_type = 'DISTURBANCE_TECH' AND status <> 'Closed'
 ORDER BY created_at DESC;

\echo ''
\echo '=== 6. Per-device threshold overrides ==============================='
-- Only relevant to REAL alarms; a test skips the threshold entirely.
SELECT device_id, config -> 'disturb_streak' AS disturb_streak
  FROM devices
 WHERE config ? 'disturb_streak'
 ORDER BY device_id;
