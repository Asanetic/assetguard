-- db/responder_positions.sql
-- Live responder positions — a responder in "Track and respond" broadcasts their
-- location here; every Track viewer reads it to draw the responder markers.
-- One row per (device, responder), upserted; stale rows age out by updated_at.
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d assetguard -f "C:\assetguardv2\db\responder_positions.sql"

CREATE TABLE IF NOT EXISTS responder_positions (
  device_id  TEXT NOT NULL,
  user_id    BIGINT NOT NULL,
  name       TEXT,
  team       TEXT,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_responder_positions_dev ON responder_positions (device_id, updated_at DESC);
