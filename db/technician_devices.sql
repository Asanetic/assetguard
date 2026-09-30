-- db/technician_devices.sql — a site visit covers SEVERAL devices.
-- Additive & idempotent.
--   psql "$DATABASE_URL" -f db/technician_devices.sql
--
-- WHY:
--   technician_work_sessions carried a single device_id, and the test-alarm
--   queries joined on it. That was right when the app ran one procedure per
--   device. It is wrong now: a technician fits four trackers in one visit, all
--   four raise their own test alarm, and only the FIRST device's alarms matched
--   the session — so three of them never appeared in the technician's Tests tab
--   and could not be acknowledged or closed. They were not lost from the alarms
--   table; they were invisible to the person who caused them.
--
--   device_ids holds every tracker the visit covers. The old device_id column
--   stays, populated with the first, so rows written before this change still
--   match and nothing has to be backfilled to keep working.

ALTER TABLE technician_work_sessions
  ADD COLUMN IF NOT EXISTS device_ids TEXT[] NOT NULL DEFAULT '{}';

-- Existing rows: the one device they knew about becomes the list.
UPDATE technician_work_sessions
   SET device_ids = ARRAY[device_id]
 WHERE device_id IS NOT NULL
   AND (device_ids IS NULL OR cardinality(device_ids) = 0);

-- The hot path is "does this alarm's device appear in this session?", which is
-- a containment test — GIN is the index for that.
CREATE INDEX IF NOT EXISTS idx_tech_sessions_device_ids
  ON technician_work_sessions USING GIN (device_ids);
