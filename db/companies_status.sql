-- db/companies_status.sql — ensure companies have a status (fixes "undefined").
-- Run once:  psql "$DATABASE_URL" -f db/companies_status.sql
ALTER TABLE companies ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'Active';
UPDATE companies SET status = 'Active' WHERE status IS NULL OR status = '';
