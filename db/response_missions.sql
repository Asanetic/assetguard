-- db/response_missions.sql
-- Response missions — what a field responder actually DID about an alarm.
-- Additive & idempotent. Nothing here alters an existing table.
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d assetguard -f "C:\assetguardv2\db\response_missions.sql"
--
-- Relationship to `alarm_responses` (db/response_and_teams.sql):
--   alarm_responses answers "who said they were going" — one row per responder
--   per alarm, written by POST alarms/:id/respond, and already drawn in the
--   alarm lifecycle. It has no end, no evidence and no account of what happened.
--   response_missions answers "what came of it". The two are deliberately
--   separate: several people may respond to one alarm, and folding an end time,
--   photos and a remark into that de-duplication row would mean the second
--   responder overwrites the first one's report.

CREATE TABLE IF NOT EXISTS response_missions (
  id                BIGSERIAL PRIMARY KEY,

  -- TEXT, matching alarms.id and alarm_responses.alarm_id. Nullable: a mission
  -- can outlive the alarm row it started from, and a responder sent to a device
  -- with no alarm attached is still on a mission.
  alarm_id          TEXT,
  -- The HUMAN device id (001_NairobiHeadquarters_V), as alarms.device_id is.
  device_id         TEXT NOT NULL,
  site_id           BIGINT,
  site_name         TEXT,

  -- Denormalised the way alarm_responses does it, and for the same reason: the
  -- missions list must render without joining users, and a responder who later
  -- leaves the company must still be named on the record they made.
  responder_by      TEXT,
  responder_user_id BIGINT,
  team_code         TEXT,
  team_name         TEXT,

  -- active | filed. Derivable from ended_at, but stored so the list can index
  -- it and a future state (amended, reopened) has somewhere to live.
  status            TEXT NOT NULL DEFAULT 'active',
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at          TIMESTAMPTZ,

  remarks           TEXT,
  outcome           TEXT,

  -- Media IDS, not bytes: [12, 13, 14] -> /api/mainapp/media/12. Two copies of
  -- an image can disagree; an id cannot. Same rule the site gallery follows.
  photos            JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Where the responder was when they filed. accuracy_m NULL is MEANINGFUL —
  -- it means the position did not come from a live handset fix. Render "from
  -- record", never "±0 m".
  lat               DOUBLE PRECISION,
  lng               DOUBLE PRECISION,
  accuracy_m        DOUBLE PRECISION,

  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_response_missions_alarm
  ON response_missions (alarm_id, started_at);
CREATE INDEX IF NOT EXISTS idx_response_missions_device
  ON response_missions (device_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_response_missions_user
  ON response_missions (responder_user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_response_missions_status
  ON response_missions (status, started_at DESC);

-- ONE open mission per responder per device.
--
-- The server-side twin of the phone's MissionStore.start being idempotent. A
-- second alarm on a device already being chased attaches to the mission already
-- running — a team is already on its way to that vehicle, and two mission cards
-- for one chase is how a responder files the wrong one.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_mission_per_user_device
  ON response_missions (responder_user_id, device_id)
  WHERE ended_at IS NULL AND responder_user_id IS NOT NULL;
