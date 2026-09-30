-- db/technician.sql — the technician app's work log and on-site sessions.
-- Additive & idempotent, like every other file here.
--   psql "$DATABASE_URL" -f db/technician.sql
--
-- Two tables, and they do different jobs:
--
--   technician_work_sessions — "a technician is on site RIGHT NOW". Short-lived.
--     This is what techOnSite.js reads, and therefore what stops the control
--     room being dispatched to a technician who is shaking a tracker on purpose.
--
--   technician_worklog — the permanent record of what was done. Long-lived.
--     One row per finished (or abandoned) installation or maintenance job.
--
-- Keeping them apart matters. The session is a safety mechanism with a hard
-- expiry; the log is history that must never be deleted. Folding them into one
-- table would mean either expiring history or never expiring the safety window.

-- ---------------------------------------------------------------------------
-- On-site sessions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS technician_work_sessions (
  id              BIGSERIAL PRIMARY KEY,
  technician_id   TEXT        NOT NULL,          -- JWT sub
  technician_name TEXT,
  site_id         BIGINT,
  device_id       TEXT,                          -- the human device_id
  job_type        TEXT        NOT NULL,          -- install | maintain
  opened_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- THE IMPORTANT COLUMN.
  --
  -- A session downgrades disturbance alarms at this site to the Low
  -- "tech on site" tier. If a technician's phone dies mid-job and nothing ever
  -- closes the session, an open-ended window would leave that site effectively
  -- deaf to real disturbances — indefinitely, and silently. So every session
  -- carries a hard ceiling and the lookup checks it. A forgotten session
  -- expires on its own; it does not need anyone to notice.
  expires_at      TIMESTAMPTZ NOT NULL,

  closed_at       TIMESTAMPTZ
);

-- The hot path: "is there an open, unexpired session for this site?" — consulted
-- on every inbound telemetry frame that looks like a disturbance, so it has to
-- be an index hit rather than a scan.
CREATE INDEX IF NOT EXISTS idx_tech_sessions_live
  ON technician_work_sessions (site_id, closed_at, expires_at);

CREATE INDEX IF NOT EXISTS idx_tech_sessions_who
  ON technician_work_sessions (technician_id, opened_at DESC);

-- ---------------------------------------------------------------------------
-- Work log
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS technician_worklog (
  id               BIGSERIAL PRIMARY KEY,
  session_id       BIGINT REFERENCES technician_work_sessions(id) ON DELETE SET NULL,

  technician_id    TEXT        NOT NULL,
  technician_name  TEXT,

  job_type         TEXT        NOT NULL,         -- install | maintain
  maintenance_type TEXT,                         -- battery | sim   (maintain only)

  site_id          BIGINT,
  site_name        TEXT,
  device_id        TEXT,

  started_at       TIMESTAMPTZ,
  finished_at      TIMESTAMPTZ,

  -- passed    — the device reported its test alarm and the job completed
  -- abandoned — the technician left without a passing test
  outcome          TEXT        NOT NULL DEFAULT 'passed',

  -- Where the technician actually was, and how good the fix was. Recorded
  -- rather than trusted: `accuracy_m` is what lets someone later tell a
  -- 5-metre fix from a 2-kilometre one.
  lat              DOUBLE PRECISION,
  lng              DOUBLE PRECISION,
  accuracy_m       DOUBLE PRECISION,

  -- The tracker-tasks checklist: {"opened":true,"powered":true,...}
  checklist        JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- Photo ids from mainapp/media, grouped by stage:
  --   {"before":[…],"confirmation":[…],"after":[…]}
  -- Ids, not bytes — the photos already live in the media table and copying
  -- them would give two records that can disagree.
  photos           JSONB       NOT NULL DEFAULT '{}'::jsonb,

  -- Every test attempt, in order:
  --   [{"attempt":1,"started_at":"…","result":"fail","alarm_id":null},
  --    {"attempt":2,"started_at":"…","result":"pass","alarm_id":"ALM-…"}]
  -- The whole array is kept, not just the last one. "Passed on the third try"
  -- and "passed first time" are different facts about a device, and only one of
  -- them is worth acting on.
  tests            JSONB       NOT NULL DEFAULT '[]'::jsonb,

  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_worklog_tech
  ON technician_worklog (technician_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worklog_device
  ON technician_worklog (device_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_worklog_site
  ON technician_worklog (site_id, created_at DESC);
