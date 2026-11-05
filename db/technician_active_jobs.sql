-- db/technician_active_jobs.sql — "what is each technician working on RIGHT NOW".
-- Additive & idempotent.
--   psql "$DATABASE_URL" -f db/technician_active_jobs.sql
--
-- WHY a new table rather than the on-site session:
--   technician_work_sessions is an ALARM-SAFETY window — it opens only at the
--   Settle step and lasts ~30 minutes, because that is all the alarm downgrade
--   should cover. It is deliberately NOT "an install is in progress", and using
--   it as such made the admin Installation page blank for most of every job.
--
--   This table is the display signal, and nothing else reads it: one row per
--   technician, upserted by the app as they move through the wizard (site →
--   devices → … → test → done) and deleted when they submit or abandon. It
--   downgrades no alarms and gates nothing; a stale row (a crash mid-job) simply
--   ages out of the page's 2-hour window.

CREATE TABLE IF NOT EXISTS technician_active_jobs (
  technician_id   TEXT PRIMARY KEY,            -- JWT sub
  technician_name TEXT,
  job_type        TEXT,                        -- install | maintain
  site_id         BIGINT,
  device_ids      TEXT[] NOT NULL DEFAULT '{}',
  step            TEXT,                         -- the wizard step name
  started_at      TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_tech_active_jobs_updated
  ON technician_active_jobs (updated_at DESC);
