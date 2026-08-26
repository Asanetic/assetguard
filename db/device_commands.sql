-- db/device_commands.sql — downlink command / firmware-update queue.
-- Run once (as a role that can create tables in the assetguard DB):
--   sudo -u postgres psql -d assetguard -f db/device_commands.sql
--
-- Why a queue (not a live push): a tracker is usually ASLEEP. A firmware update
-- (and any batched command) is parked here as 'pending'. The TCP listener sends
-- it only when the device next wakes (heartbeat/data) — for firmware, only if the
-- device has NO open critical alarm. Lifecycle:
--   pending  -> queued, device not yet awake / not yet sent
--   sent     -> command written to the device on a wake (awaiting its reply)
--   acked    -> device replied (*HQ,IMEI,V4,<CMD>#). firmware only — awaits data
--   confirmed-> success. firmware: device resumed transmitting data after the ack.
--               other commands: confirmed as soon as the device replies.
--   failed   -> no reply after max attempts, or stalled past the deadline
--   canceled -> superseded by a re-queue, or canceled by an admin

CREATE TABLE IF NOT EXISTS device_command_queue (
  id            BIGSERIAL PRIMARY KEY,
  device_id     BIGINT REFERENCES devices(id) ON DELETE CASCADE,
  imei          TEXT NOT NULL,
  kind          TEXT NOT NULL DEFAULT 'firmware',   -- 'firmware' | 'command'
  command       TEXT NOT NULL,                       -- HQ body, e.g. 'UPGRADE' or 'GS,15'
  status        TEXT NOT NULL DEFAULT 'pending',
  batch_id      TEXT,                                -- groups one batch operation
  attempts      INTEGER NOT NULL DEFAULT 0,
  max_attempts  INTEGER NOT NULL DEFAULT 10,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at       TIMESTAMPTZ,
  acked_at      TIMESTAMPTZ,
  confirmed_at  TIMESTAMPTZ,
  last_attempt_at TIMESTAMPTZ,
  error         TEXT,
  note          TEXT
);

-- Fast "does this IMEI have an active job?" lookup for the listener hot path.
CREATE INDEX IF NOT EXISTS device_command_queue_active_imei
  ON device_command_queue (imei)
  WHERE status IN ('pending','sent','acked');
CREATE INDEX IF NOT EXISTS device_command_queue_status ON device_command_queue (status);
CREATE INDEX IF NOT EXISTS device_command_queue_device ON device_command_queue (device_id);

-- The app connects as role "assetguard" — grant it access (idempotent).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'assetguard') THEN
    EXECUTE 'GRANT SELECT, INSERT, UPDATE, DELETE ON device_command_queue TO assetguard';
    EXECUTE 'GRANT USAGE, SELECT ON SEQUENCE device_command_queue_id_seq TO assetguard';
  END IF;
END $$;
