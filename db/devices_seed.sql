-- db/devices_seed.sql — demo devices for the Devices map + coordinates for the
-- nine demo sites so the pins land in the right place.
-- Run once (after devices_and_logs.sql):
--   psql "$DATABASE_URL" -f db/devices_and_logs.sql
--   psql "$DATABASE_URL" -f db/devices_seed.sql

-- 1) give the known demo sites real coordinates (only if they don't have any).
UPDATE sites SET lat=-1.2673, lng=36.8110 WHERE code='NBI-HQ-001' AND lat IS NULL;
UPDATE sites SET lat=-4.0435, lng=39.6682 WHERE code='MBA-BR-002' AND lat IS NULL;
UPDATE sites SET lat=-0.0917, lng=34.7680 WHERE code='KSM-OF-003' AND lat IS NULL;
UPDATE sites SET lat=-0.3031, lng=36.0800 WHERE code='NKR-DP-004' AND lat IS NULL;
UPDATE sites SET lat= 0.5143, lng=35.2698 WHERE code='ELD-ST-005' AND lat IS NULL;
UPDATE sites SET lat=-1.0333, lng=37.0693 WHERE code='THK-WH-006' AND lat IS NULL;
UPDATE sites SET lat=-0.4536, lng=39.6461 WHERE code='GRS-SB-007' AND lat IS NULL;
UPDATE sites SET lat=-3.2192, lng=40.1169 WHERE code='MLD-YD-008' AND lat IS NULL;
UPDATE sites SET lat=-1.4565, lng=36.9784 WHERE code='ATR-PL-009' AND lat IS NULL;

-- 2) enrich the demo Athi River device that devices_and_logs.sql already seeded
--    (keep its ingest-sample IMEI; just give it battery/data/last_seen so it
--    renders nicely on the map) instead of inserting a duplicate device_id.
UPDATE devices SET battery = 90, data_left = '3.8GB', orientation = 'Vertical',
       status = 'Live', last_seen = now() - interval '4 minutes'
 WHERE device_id = '009_AthiRiverPlant_V' AND battery IS NULL;

-- 3) seed the remaining demo devices (idempotent by BOTH imei and device_id, so
--    it is safe to re-run and never collides with the demo row above).
INSERT INTO devices (device_id, imei, sim, site_id, orientation, status, battery, data_left, last_seen)
SELECT v.device_id, v.imei, v.sim, s.id, v.orientation, v.status, v.battery, v.data_left, now() - (v.mins || ' minutes')::interval
FROM (VALUES
  ('001_NairobiHeadquarters_V','352093000034561','111', 'NBI-HQ-001','Vertical',  'Live',        87,'2.1GB', 2),
  ('001_NairobiHeadquarters_H','352093000034562','112', 'NBI-HQ-001','Horizontal','Live',        92,'3.4GB', 2),
  ('002_MombasaBranch_H',      '352093000034567','113', 'MBA-BR-002','Horizontal','Live',        65,'0.8GB', 3),
  ('002_MombasaBranch_V',      '352093000034568','114', 'MBA-BR-002','Vertical',  'Live',        74,'4.2GB', 3),
  ('003_KisumuOffice_V',       '352093000034573','115', 'KSM-OF-003','Vertical',  'Offline',     12,'0.1GB', 240),
  ('004_NakuruDepot_H',        '352093000034578','116', 'NKR-DP-004','Horizontal','Live',        95,'4.9GB', 1),
  ('004_NakuruDepot_V',        '352093000034579','117', 'NKR-DP-004','Vertical',  'Live',        81,'3.0GB', 1),
  ('005_EldoretStation_H',     '352093000034584','118', 'ELD-ST-005','Horizontal','Maintenance', 55,'1.5GB', 30),
  ('005_EldoretStation_V',     '352093000034585','119', 'ELD-ST-005','Vertical',  'Testing',     60,'2.0GB', 12),
  ('009_AthiRiverPlant_V',     '352093000034599','120', 'ATR-PL-009','Vertical',  'Live',        90,'3.8GB', 4),
  ('009_AthiRiverPlant_H',     '352093000034600','121', 'ATR-PL-009','Horizontal','Live',        85,'2.5GB', 4),
  ('006_ThikaWarehouse_V',     '352093000034606','122', 'THK-WH-006','Vertical',  'Inactive',     0,'0.0GB', 4320),
  ('007_GarissaSubstation_V',  '352093000034607','123', 'GRS-SB-007','Vertical',  'Inactive',     0,'0.0GB', 5760),
  ('008_MalindiYard_V',        '352093000034608','124', 'MLD-YD-008','Vertical',  'Inactive',     0,'0.0GB', 7200)
) AS v(device_id, imei, sim, site_code, orientation, status, battery, data_left, mins)
JOIN sites s ON s.code = v.site_code
WHERE NOT EXISTS (SELECT 1 FROM devices e WHERE e.device_id = v.device_id OR e.imei = v.imei)
ON CONFLICT (imei) DO NOTHING;
