-- ---------------------------------------------------------------------------
-- One-off cleanup: alarms that attached to an incident AFTER it was closed.
--
-- The insert-time rule is fixed in dataControl/alarms.js — an incident is live
-- only while its ANCHOR (the earliest alarm carrying the id, normally the
-- disturbance) is open. Rows already written under the old rule are still
-- linked, so a closed alarm's detail page keeps showing them.
--
-- This gives each of those rows its OWN incident id. Nothing is deleted and no
-- alarm changes status: they stop being part of somebody else's closed case
-- file and become their own, which is what they always were.
--
-- SAFE TO SKIP. Purely cosmetic history repair; the app is correct without it.
-- ---------------------------------------------------------------------------

-- 1) PREVIEW FIRST. Run this alone and read it before the UPDATE.
WITH anchor AS (
  SELECT DISTINCT ON (incident_id)
         incident_id, id AS anchor_id, status AS anchor_status, closed_at
    FROM alarms
   WHERE incident_id IS NOT NULL
   ORDER BY incident_id, created_at ASC, id ASC
)
SELECT a.id, a.alarm_type, a.created_at, a.incident_id,
       an.anchor_id, an.closed_at AS incident_closed_at
  FROM alarms a
  JOIN anchor an ON an.incident_id = a.incident_id
 WHERE an.anchor_status = 'Closed'
   AND an.closed_at IS NOT NULL
   AND a.id <> an.anchor_id
   AND a.created_at > an.closed_at
 ORDER BY a.created_at DESC;

-- 2) THE FIX. Same predicate, wrapped in a transaction.
BEGIN;

WITH anchor AS (
  SELECT DISTINCT ON (incident_id)
         incident_id, id AS anchor_id, status AS anchor_status, closed_at
    FROM alarms
   WHERE incident_id IS NOT NULL
   ORDER BY incident_id, created_at ASC, id ASC
),
bad AS (
  SELECT a.id
    FROM alarms a
    JOIN anchor an ON an.incident_id = a.incident_id
   WHERE an.anchor_status = 'Closed'
     AND an.closed_at IS NOT NULL
     AND a.id <> an.anchor_id
     AND a.created_at > an.closed_at
)
UPDATE alarms a
   SET incident_id = 'INC-' || to_char(a.created_at, 'YYYY') || '-'
                     || nextval('alarms_incident_seq')
  FROM bad
 WHERE a.id = bad.id;

-- Check the row count, then:
COMMIT;
-- ...or ROLLBACK; if it is not what the preview showed.
