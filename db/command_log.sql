-- db/command_log.sql — log of downlink commands sent to trackers.
-- Run once:  psql "$DATABASE_URL" -f db/command_log.sql
-- Additive & idempotent. Drives the dashboard "Commands sent" and "Firmware
-- updates" tiles (firmware = UPGRADE commands). One row per send attempt.
CREATE TABLE IF NOT EXISTS command_log (
  id          BIGSERIAL PRIMARY KEY,
  imei        TEXT,
  cmd         TEXT,                          -- the exact bytes sent, e.g. [SG*IMEI*0008*UPGRADE#]
  wrap        BOOLEAN NOT NULL DEFAULT false,
  targets     INT NOT NULL DEFAULT 0,        -- how many sockets matched
  sent        INT NOT NULL DEFAULT 0,        -- how many writes succeeded
  status      TEXT NOT NULL DEFAULT 'sent',  -- 'sent' | 'failed'
  by_user     TEXT,                          -- who sent it (user id/email)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_command_log_created ON command_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_command_log_imei    ON command_log (imei);
