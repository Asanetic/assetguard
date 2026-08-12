-- db/alarm_lifecycle.sql
-- View-Alarm lifecycle: independent monitoring/security acknowledgements and a
-- rich close (genuine/false + note + photos). Additive & idempotent.
--   psql "$DATABASE_URL" -f db/alarm_lifecycle.sql

-- Two INDEPENDENT acknowledgements — monitoring company (NOC) and security
-- (response) company — each with who/when and what they found. Either side can
-- ack without the other; both are logged.
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_monitoring_at      TIMESTAMPTZ;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_monitoring_by      TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_monitoring_finding TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_monitoring_note    TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_security_at        TIMESTAMPTZ;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_security_by        TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_security_finding   TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_security_note      TEXT;

-- Close (only monitoring NOC / admins / managers): genuine vs false, a note, and
-- photos of what was found (stored as a JSON array of data URLs / file refs).
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS closed_at     TIMESTAMPTZ;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS closed_by     TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS close_outcome TEXT;   -- genuine | false
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS close_note    TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS close_photos  JSONB;

-- Linked alarms share the same device within the event window; this index keeps
-- the "other alarms during this period" lookup fast.
CREATE INDEX IF NOT EXISTS idx_alarms_device_time ON alarms (device_id, created_at DESC);
