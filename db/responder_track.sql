-- db/responder_track.sql
-- Append-only HISTORY of responder positions during a live response, so a
-- responder's route can be replayed later on the Response Playback page.
--   psql "postgresql://assetguard:...@localhost:5432/assetguard" -f db/responder_track.sql
--
-- responder_positions (db/responder_positions.sql) keeps only the LATEST fix per
-- (device, responder) — it drives the live map. It cannot answer "where did the
-- responder go", because each update overwrites the last. This table records every
-- fix instead, one row per broadcast, keyed to the TARGET device the responder was
-- tracking so playback can line the two routes up on one timeline.
--
-- Additive & idempotent. Nothing here alters an existing table.
CREATE TABLE IF NOT EXISTS responder_track (
  id         BIGSERIAL PRIMARY KEY,
  device_id  TEXT NOT NULL,            -- the TARGET device (human id), as responder_positions uses
  user_id    BIGINT NOT NULL,          -- the responder
  name       TEXT,
  team       TEXT,
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  accuracy_m DOUBLE PRECISION,
  at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Playback reads by (target device, time); the responder index answers "every
-- run this person did". Both cover the ORDER BY so the range scan is an index scan.
CREATE INDEX IF NOT EXISTS idx_responder_track_dev  ON responder_track (device_id, at);
CREATE INDEX IF NOT EXISTS idx_responder_track_user ON responder_track (user_id, at);
