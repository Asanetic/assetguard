-- db/raw_logs.sql — raw ingest traffic capture (optional persistence).
-- Run once:  psql "$DATABASE_URL" -f db/raw_logs.sql
-- The Live-logs feed works without this table (in-memory buffer); running it
-- just persists inbound/outbound bytes so nothing is lost across restarts.

CREATE TABLE IF NOT EXISTS raw_logs (
  id          BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  direction   TEXT,                 -- in | out
  src_ip      TEXT,
  src_port    INT,
  data        TEXT,                 -- raw payload as received/sent (latin1 text)
  bytes       INT
);
CREATE INDEX IF NOT EXISTS idx_raw_logs_time ON raw_logs (received_at DESC);
