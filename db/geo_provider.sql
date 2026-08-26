-- db/geo_provider.sql — geolocation backup provider (Unwired Labs) support.
-- Run once (as a role that can create tables in the assetguard DB):
--   sudo -u postgres psql -d assetguard -f db/geo_provider.sql
--
-- 1) geo_usage: a persistent per-provider request counter so the Unwired Labs
--    free-request cap (e.g. 50) is never exceeded across app restarts/redeploys.
--    period = 'total' for a lifetime trial cap, or 'YYYY-MM' for a monthly cap.
-- 2) seeds the 'geo' config namespace so Admin -> Google Maps loads a shape on
--    first run (token blank + backup disabled until an admin turns it on).

CREATE TABLE IF NOT EXISTS geo_usage (
  provider   TEXT NOT NULL,
  period     TEXT NOT NULL,
  count      INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (provider, period)
);

-- The app connects as role "assetguard"; make sure it can read/increment.
-- (Harmless/idempotent if the role already owns the table.)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'assetguard') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE ON geo_usage TO assetguard';
  END IF;
END $$;

-- Seed the geo config namespace (no-op if it already exists).
INSERT INTO app_config (key, value)
VALUES ('geo', '{
  "unwiredEnabled": false,
  "unwiredToken": "",
  "unwiredRegion": "us1",
  "unwiredFreeCap": 50,
  "unwiredCapWindow": "total"
}'::jsonb)
ON CONFLICT (key) DO NOTHING;
