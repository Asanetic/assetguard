-- db/parse_errors.sql — frames that failed to parse (malformed / unknown format).
-- Run once:  psql "$DATABASE_URL" -f db/parse_errors.sql
-- Additive & idempotent. Lets the "Parse errors" stat on the ports page drill
-- into the actual failing frames instead of just a count.
CREATE TABLE IF NOT EXISTS parse_errors (
  id          BIGSERIAL PRIMARY KEY,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  port        INT,
  src_ip      TEXT,
  src_port    INT,
  device      TEXT,
  data        TEXT,     -- the raw frame that could not be parsed
  error       TEXT      -- the parser's error message
);
CREATE INDEX IF NOT EXISTS idx_parse_errors_time ON parse_errors (received_at DESC);
