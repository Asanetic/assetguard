-- db/alarms.sql — Asset Alarms (the alarms landing map + list). Additive &
-- idempotent. Seeds the demo alarms matching the prototype (8 open, 2 acknowledged;
-- Critical 4 · High 3 · Medium 2 · Low 1). Coordinates are the alarm device's
-- site, jittered slightly so same-site alarms don't stack exactly on the map.
--   psql "$DATABASE_URL" -f db/alarms.sql

CREATE TABLE IF NOT EXISTS alarms (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  priority   TEXT NOT NULL DEFAULT 'Low',      -- Critical | High | Medium | Low
  device_id  TEXT,
  site       TEXT,
  serial     TEXT,
  status     TEXT NOT NULL DEFAULT 'Open',      -- Open | Acknowledged
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alarms_status ON alarms (status);

INSERT INTO alarms (id, name, priority, device_id, site, serial, status, lat, lng, created_at)
VALUES
  ('ALM-2026-0081','Disturbance','Critical','001_NairobiHeadquarters_V','Nairobi Headquarters','863957075001481','Open',        -1.2643, 36.8150, now() - interval '2 minutes'),
  ('ALM-2026-0080','Geofence Violation — left Westlands zone','Critical','001_NairobiHeadquarters_V','Nairobi Headquarters','863957075001481','Open', -1.2703, 36.8075, now() - interval '1 minute'),
  ('ALM-2026-0079','Critical Motion — 84 km/h on Waiyaki Way','Critical','001_NairobiHeadquarters_V','Nairobi Headquarters','863957075001481','Open', -1.2610, 36.8035, now() - interval '20 seconds'),
  ('ALM-2026-0082','Geofence Violation','Critical','002_MombasaBranch_H','Mombasa Branch','863957075002190','Open',              -4.0435, 39.6682, now() - interval '11 minutes'),
  ('ALM-2026-0078','Device Offline','High','003_KisumuOffice_V','Kisumu Office','863957075003327','Open',                        -0.0887, 34.7710, now() - interval '34 minutes'),
  ('ALM-2026-0077','Low Battery — 12%','High','003_KisumuOffice_V','Kisumu Office','863957075003327','Acknowledged',             -0.0947, 34.7650, now() - interval '1 hour'),
  ('ALM-2026-0076','High Temperature — 58°C','High','007_GarissaSubstation_H','Garissa Substation','863957075007742','Open',      -0.4536, 39.6461, now() - interval '1 hour'),
  ('ALM-2026-0075','Low Data — 0.1 GB left','Medium','003_KisumuOffice_V','Kisumu Office','863957075003327','Open',              -0.0977, 34.7620, now() - interval '2 hours'),
  ('ALM-2026-0074','Notification Failed To Send','Medium','005_EldoretStation_V','Eldoret Station','863957075005519','Acknowledged', 0.5143, 35.2698, now() - interval '3 hours'),
  ('ALM-2026-0073','Disturbance — tech on site','Low','004_NakuruDepot_H','Nakuru Depot','863957075004234','Open',               -0.3031, 36.0800, now() - interval '3 hours'),
  -- Closed alarms — shown on the All Alarms table, not counted in any severity.
  ('ALM-2026-0070','Low Battery — resolved after recharge','High','008_MalindiYard_V','Malindi Yard','863957075008856','Closed', -3.2192, 40.1169, now() - interval '1 day'),
  ('ALM-2026-0069','Geofence Violation — false trigger','Critical','004_NakuruDepot_H','Nakuru Depot','863957075004234','Closed', -0.3031, 36.0800, now() - interval '1 day')
ON CONFLICT (id) DO NOTHING;

-- Missed alarms — the operator records these by hand (the system can't detect
-- its own omissions); they feed the SLA report.
CREATE SEQUENCE IF NOT EXISTS missed_alarms_seq START 1001;
CREATE TABLE IF NOT EXISTS missed_alarms (
  id         TEXT PRIMARY KEY,
  kind       TEXT NOT NULL DEFAULT 'recording',   -- recording | timestamp
  device     TEXT,
  note       TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
