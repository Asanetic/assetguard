-- db/alarms_live.sql
-- Lets the ingest alarm engine write into the SAME `alarms` table the All Alarms
-- page + speaker already use. Additive & idempotent — safe to run repeatedly and
-- it does not touch the existing seeded alarms.
--   psql "$DATABASE_URL" -f db/alarms_live.sql
--
-- (Supersedes db/alarms_ingest.sql from the previous drop — you can ignore that
--  file; if you already ran it, the extra unused columns are harmless.)

-- Machine-readable alarm type, so live alarms can be de-duped per (device, type)
-- and told apart from the hand-seeded demo rows.
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS alarm_type TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS source     TEXT DEFAULT 'seed';

-- Unique, ever-increasing suffix for generated alarm ids (ALM-2026-90001, …).
CREATE SEQUENCE IF NOT EXISTS alarms_live_seq START 90000;

CREATE INDEX IF NOT EXISTS idx_alarms_type ON alarms (device_id, alarm_type);
