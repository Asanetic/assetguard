-- db/notifications.sql — outbound alarm notifications log (email + SMS).
-- Run once:  psql "$DATABASE_URL" -f db/notifications.sql
-- Additive & idempotent. One row per recipient-per-channel-per-alarm attempt, so
-- the Notifications page can show exactly who was told about each critical alarm
-- and which sends failed (which also drives the "Notification Failed To Send" alarm).

CREATE TABLE IF NOT EXISTS notifications (
  id          BIGSERIAL PRIMARY KEY,
  alarm_id    TEXT,                       -- the alarm that triggered it (soft link)
  incident_id TEXT,                       -- its incident, for grouping
  site        TEXT,                       -- site name (denormalised for display)
  site_id     BIGINT,
  device_id   TEXT,
  priority    TEXT,                       -- alarm priority at send time (Critical)
  channel     TEXT NOT NULL,              -- 'email' | 'sms' | 'push' | 'whatsapp'
  recipient   TEXT NOT NULL,              -- email address or phone number
  name        TEXT,                       -- contact name, when known
  role        TEXT,                       -- where the contact came from (e.g. 'Security — Field Ops')
  subject     TEXT,                       -- email subject / sms first line
  status      TEXT NOT NULL DEFAULT 'sent', -- 'sent' | 'failed'
  error       TEXT,                       -- provider error when failed
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_alarm   ON notifications (alarm_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status  ON notifications (status);

-- CRITICAL: the app connects as role "assetguard". When this table is created by
-- the postgres superuser, the app role has NO access by default, so every insert
-- (listener) and read (Notifications page) fails silently — the classic
-- "email was sent but nothing shows / count stays 0". Grant it explicitly.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'assetguard') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON notifications TO assetguard';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE notifications_id_seq TO assetguard';
  END IF;
END $$;
