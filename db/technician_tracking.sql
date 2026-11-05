-- db/technician_tracking.sql — live technician location + the stage an install is at.
-- Additive & idempotent, like every other file here.
--   psql "$DATABASE_URL" -f db/technician_tracking.sql
--
-- WHY:
--   The admin "Installation" page needs two things the schema did not carry:
--
--   1. WHERE each technician is right now, so the page can show them on a map.
--      The app posts its handset GPS on a timer while signed in; we keep only the
--      LATEST fix per technician (one row, upserted) because the map only ever
--      draws the current position — history already lives in technician_worklog.
--
--   2. WHICH STEP an in-progress install is at. A session was binary (open or
--      closed); now it carries the wizard step the technician is on, so a started
--      install reads as "Settle" or "Test" rather than just "in progress".
--
-- Both are additive: the ingest hot path (underTestReason) never reads them, and
-- nothing has to be backfilled for existing rows to keep working.

-- ---------------------------------------------------------------------------
-- The stage an in-progress session is at
-- ---------------------------------------------------------------------------
ALTER TABLE technician_work_sessions
  ADD COLUMN IF NOT EXISTS step    TEXT;
ALTER TABLE technician_work_sessions
  ADD COLUMN IF NOT EXISTS step_at TIMESTAMPTZ;

-- ---------------------------------------------------------------------------
-- Live technician position — one row per technician, the latest fix only.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS technician_positions (
  technician_id   TEXT PRIMARY KEY,            -- JWT sub
  technician_name TEXT,
  lat             DOUBLE PRECISION,
  lng             DOUBLE PRECISION,
  accuracy_m      DOUBLE PRECISION,            -- handset fix accuracy, metres
  speed           DOUBLE PRECISION,            -- m/s, when the handset reports it
  heading         DOUBLE PRECISION,            -- degrees, for the arrow marker
  battery         INT,                         -- handset battery %, when known
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- "Everyone who reported in the last N minutes", newest first.
CREATE INDEX IF NOT EXISTS idx_tech_positions_updated
  ON technician_positions (updated_at DESC);
