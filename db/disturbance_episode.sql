-- db/disturbance_episode.sql
-- Per-device state for the TIMER-DRIVEN disturbance ladder.
--   psql "postgresql://assetguard:...@localhost:5432/assetguard" -f db/disturbance_episode.sql
--
-- The ladder used to be purely packet-driven: it only advanced when a disturbance
-- packet arrived, so a device that went silent after Warning 1 never escalated.
-- Now, once Warning 1 fires, the climb is on a clock: Warning 2 at least 30s after
-- Warning 1 FIRED, the alarm at least 30s after Warning 2 FIRED — silent or not.
-- This one row per device remembers where each device's current episode is up to,
-- and WHEN the current level fired (so the next gap is measured from the previous
-- step, not from t0). A periodic sweep (ingest server) advances it without packets.
--
-- Additive & idempotent.
CREATE TABLE IF NOT EXISTS disturbance_episode (
  device_id  TEXT PRIMARY KEY,         -- human device id (as alarms/decision use)
  t0         TIMESTAMPTZ NOT NULL,     -- first disturbance of the current episode
  level      SMALLINT    NOT NULL,     -- 1 = Warning 1 sent, 2 = Warning 2 sent, 3 = raised
  level_at   TIMESTAMPTZ NOT NULL,     -- when the CURRENT level fired (next gap measured from here)
  last_at    TIMESTAMPTZ NOT NULL,     -- last disturbance packet seen (drives the 30-min quiet reset)
  site_id    BIGINT,                   -- cached for the sweep's notifications
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- The sweep scans by how long each level has been pending.
CREATE INDEX IF NOT EXISTS idx_disturbance_episode_level ON disturbance_episode (level, level_at);
