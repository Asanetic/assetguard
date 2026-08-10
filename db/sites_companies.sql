-- db/sites_companies.sql — carry the Security company and Monitoring company on a site.
-- Run once:  psql "$DATABASE_URL" -f db/sites_companies.sql
-- Additive & idempotent. These two feed the Add-site autofill: the security
-- company resolves its staff from Users by the site's region, and the monitoring
-- company resolves its NOC teams by region.

ALTER TABLE sites ADD COLUMN IF NOT EXISTS security_company   TEXT;
ALTER TABLE sites ADD COLUMN IF NOT EXISTS monitoring_company TEXT;
