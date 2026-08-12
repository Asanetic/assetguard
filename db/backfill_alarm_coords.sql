-- db/backfill_alarm_coords.sql
-- Alarm location = SITE location, for every alarm category. Older alarms (notably
-- Device Offline, which the sweep raised without a packet position) were stored
-- with NULL lat/lng and so never appeared on the maps. This backfills their
-- coordinates from the device's site. Idempotent — safe to run repeatedly.
UPDATE alarms a
   SET lat = s.lat, lng = s.lng
  FROM devices d
  JOIN sites s ON s.id = d.site_id
 WHERE (a.lat IS NULL OR a.lng IS NULL)
   AND (a.device_id = d.device_id OR a.device_id = d.imei)
   AND s.lat IS NOT NULL AND s.lng IS NOT NULL;
