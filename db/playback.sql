-- db/playback.sql — Route Playback: a stored GPS route per (device, date). The
-- Playback page animates the vehicle along these points. Additive & idempotent.
--   psql "$DATABASE_URL" -f db/playback.sql

CREATE TABLE IF NOT EXISTS playback_routes (
  device_id    TEXT NOT NULL,
  route_date   DATE NOT NULL,
  points       JSONB NOT NULL,          -- [{t(sec from 07:00), lat, lng, spd}]
  waypoints    JSONB NOT NULL,          -- [{label, kind:start|stop|end, t, lat, lng, stop_min?}]
  start_sec    INT  NOT NULL DEFAULT 0, -- 25200 = 07:00:00 (seconds from midnight)
  total_km     NUMERIC NOT NULL DEFAULT 0,
  duration_min INT  NOT NULL DEFAULT 0,
  max_speed    INT  NOT NULL DEFAULT 0,
  stops        INT  NOT NULL DEFAULT 0,
  stop_min     INT  NOT NULL DEFAULT 0,
  total_km_day NUMERIC NOT NULL DEFAULT 0,
  PRIMARY KEY (device_id, route_date)
);

-- Demo route for 001_NairobiHeadquarters_V on 2026-07-07 (07:00 -> 07:58).
INSERT INTO playback_routes
  (device_id, route_date, points, waypoints, start_sec, total_km, duration_min, max_speed, stops, stop_min, total_km_day)
VALUES
  ('001_NairobiHeadquarters_V', DATE '2026-07-07',
   '[{"t": 0, "lat": -1.2649, "lng": 36.8058, "spd": 0}, {"t": 300, "lat": -1.27, "lng": 36.809, "spd": 35}, {"t": 900, "lat": -1.278, "lng": 36.811, "spd": 55}, {"t": 1500, "lat": -1.288, "lng": 36.8118, "spd": 40}, {"t": 1800, "lat": -1.296, "lng": 36.8118, "spd": 0}, {"t": 2280, "lat": -1.296, "lng": 36.8118, "spd": 0}, {"t": 2700, "lat": -1.2915, "lng": 36.8175, "spd": 50}, {"t": 3200, "lat": -1.287, "lng": 36.8215, "spd": 62}, {"t": 3480, "lat": -1.2841, "lng": 36.8233, "spd": 0}]'::jsonb,
   '[{"label": "Westlands, Nairobi", "kind": "start", "t": 0, "lat": -1.2649, "lng": 36.8058}, {"label": "Upper Hill (Stop)", "kind": "stop", "t": 1800, "lat": -1.296, "lng": 36.8118, "stop_min": 8}, {"label": "CBD Environs", "kind": "end", "t": 3480, "lat": -1.2841, "lng": 36.8233}]'::jsonb,
   25200, 5.4, 58, 62, 1, 8, 12.4)
ON CONFLICT (device_id, route_date) DO NOTHING;
