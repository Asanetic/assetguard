-- db/alarm_incidents.sql
-- Group alarms into incidents (episodes): one Disturbance → one Geofence → one
-- Critical share an incident_id. A new Disturbance starts a NEW incident when the
-- previous episode is closed, older than 6h, or the simulator was restarted.
-- Idempotent — safe to run repeatedly.
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS incident_id text;
CREATE SEQUENCE IF NOT EXISTS alarms_incident_seq START 1;
CREATE INDEX IF NOT EXISTS idx_alarms_device_incident ON alarms (device_id, incident_id);
CREATE INDEX IF NOT EXISTS idx_alarms_incident ON alarms (incident_id);

-- Backfill existing alarms into incidents so old data groups correctly instead of
-- tying ~30 minutes of alarms together. A new incident starts per device at: the
-- first alarm, any >6h gap, or EACH Disturbance (so one Disturbance → the Geofence
-- and Critical that follow it, until the next Disturbance).
WITH ordered AS (
  SELECT id, device_id, created_at, alarm_type,
         LAG(created_at) OVER (PARTITION BY device_id ORDER BY created_at, id) AS prev_at
    FROM alarms
   WHERE incident_id IS NULL
), flagged AS (
  SELECT id, device_id, created_at,
         CASE WHEN prev_at IS NULL
                OR alarm_type = 'DISTURBANCE'
                OR created_at - prev_at > interval '6 hours'
              THEN 1 ELSE 0 END AS is_start
    FROM ordered
), numbered AS (
  SELECT id, device_id,
         SUM(is_start) OVER (PARTITION BY device_id ORDER BY created_at, id
                             ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS inc_no
    FROM flagged
)
UPDATE alarms a
   SET incident_id = 'INC-BF-' || n.device_id || '-' || n.inc_no
  FROM numbered n
 WHERE a.id = n.id AND a.incident_id IS NULL;
