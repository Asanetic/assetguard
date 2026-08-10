-- db/app_config.sql — generic key/value store for platform configuration.
-- Run once:  psql "$DATABASE_URL" -f db/app_config.sql
--
-- One row per config namespace (JSONB value). Currently used for 'maps'
-- (Google Maps API key + defaults); future settings can reuse the same table.

CREATE TABLE IF NOT EXISTS app_config (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_by TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed an empty maps config so the admin page has something to load on first
-- run. The API key starts blank; an admin sets it on the Google Maps page.
INSERT INTO app_config (key, value)
VALUES ('maps', '{
  "apiKey": "",
  "libraries": ["places"],
  "defaultCenter": { "lat": -1.2864, "lng": 36.8172 },
  "defaultZoom": 7,
  "mapType": "roadmap"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
