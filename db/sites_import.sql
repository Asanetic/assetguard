-- db/sites_import.sql — extra columns carried by the "Import sites from Excel" flow.
-- Run once:  psql "$DATABASE_URL" -f db/sites_import.sql
-- Additive & idempotent — safe on an existing database.

ALTER TABLE sites ADD COLUMN IF NOT EXISTS smpms_vendor     TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS dist_region      TEXT;   -- Distribution Region
ALTER TABLE sites ADD COLUMN IF NOT EXISTS county           TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS lat              NUMERIC(9,6);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS lng              NUMERIC(9,6);
ALTER TABLE sites ADD COLUMN IF NOT EXISTS response_cluster TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS security_region  TEXT;
