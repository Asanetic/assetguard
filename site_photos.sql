-- Site photos captured from the mobile app.
--
-- Run this as the DATABASE OWNER (postgres), not as the app role: on
-- Postgres 15+ the `public` schema no longer grants CREATE to PUBLIC, so an
-- ordinary app role cannot create tables here. The GRANTs at the bottom then
-- give the app exactly the rights it needs and no more.
--
--   sudo -u postgres psql -d assetguard -f site_photos.sql

CREATE TABLE IF NOT EXISTS site_photos (
  id           SERIAL PRIMARY KEY,
  -- BIGINT, matching media.js: sites.id is bigserial (dataControl/sites.js
  -- casts to bigint[]), and an int4 key would cap out at 2^31.
  site_id      BIGINT REFERENCES sites(id) ON DELETE CASCADE,
  site_code    TEXT,
  site_name    TEXT,
  photo_type   TEXT NOT NULL DEFAULT 'Before works',
  device_id    TEXT,
  technician   TEXT,
  status       TEXT NOT NULL DEFAULT 'In progress',
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  accuracy_m   DOUBLE PRECISION,
  taken_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  imprinted    BOOLEAN NOT NULL DEFAULT TRUE,
  mime         TEXT NOT NULL DEFAULT 'image/jpeg',
  bytes        INTEGER NOT NULL DEFAULT 0,
  image        BYTEA NOT NULL,
  captured_by  TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Every read is "this site, newest first".
CREATE INDEX IF NOT EXISTS site_photos_site_taken_idx
  ON site_photos (site_id, taken_at DESC);

-- The app connects as `assetguard`. Change the role name here if yours differs.
GRANT SELECT, INSERT, UPDATE, DELETE ON site_photos TO assetguard;

-- The SERIAL id draws from a sequence, and INSERT alone is not enough to use
-- it: without this the very first upload fails with "permission denied for
-- sequence site_photos_id_seq" — a different error that reads like the same
-- bug all over again.
GRANT USAGE, SELECT ON SEQUENCE site_photos_id_seq TO assetguard;
