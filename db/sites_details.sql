-- db/sites_details.sql — full "Add site" form storage.
-- Run once:  psql "$DATABASE_URL" -f db/sites_details.sql
-- Additive & idempotent — safe on an existing database.
--
-- The listing/import columns stay first-class; the rich contact/company/security/
-- NOC/alert data from the Add-site form is kept together in `details` (JSONB).

ALTER TABLE sites ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS details JSONB;
