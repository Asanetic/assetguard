-- One-time backfill: set each device's live motion / interval / wake to the value
-- of the NEWEST CONFIRMED command for that setting — repairing rows that were
-- stuck because the promote query used to throw ("could not determine data type
-- of parameter $2"). Safe to re-run; only touches devices that have a confirmed
-- command, and clears the matching pending_* marker.
WITH newest AS (
  SELECT DISTINCT ON (device_id, verb)
         device_id,
         verb,
         (regexp_match(command, ',\s*(\d+)'))[1]::int AS arg
    FROM (
      SELECT device_id, command, lower(split_part(command, ',', 1)) AS verb,
             COALESCE(confirmed_at, created_at) AS at
        FROM device_command_queue
       WHERE status = 'confirmed'
         AND lower(split_part(command, ',', 1)) IN ('gs','update','upt')
    ) s
   ORDER BY device_id, verb, at DESC
)
UPDATE devices d
   SET config = (COALESCE(d.config,'{}'::jsonb)
        || jsonb_build_object(
             CASE n.verb WHEN 'gs' THEN 'motion_sensitivity'
                         WHEN 'update' THEN 'upload_interval_s'
                         WHEN 'upt' THEN 'wake_interval_sec' END,
             CASE n.verb WHEN 'upt' THEN n.arg * 60 ELSE n.arg END))
        - CASE n.verb WHEN 'gs' THEN 'pending_motion_sensitivity'
                      WHEN 'update' THEN 'pending_upload_interval_s'
                      WHEN 'upt' THEN 'pending_wake_interval_sec' END
  FROM newest n
 WHERE d.id = n.device_id AND n.arg IS NOT NULL;
