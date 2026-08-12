-- db/response_and_teams.sql
-- Response logging + field-response team membership. Additive & idempotent.
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d assetguard -f "C:\assetguardv2\db\response_and_teams.sql"

-- Who is responding to an alarm — MANY per alarm (several responders allowed).
-- Each response is logged with the responder's name, their team (if any) and when.
CREATE TABLE IF NOT EXISTS alarm_responses (
  id                BIGSERIAL PRIMARY KEY,
  alarm_id          TEXT NOT NULL,
  responder_by      TEXT,
  responder_user_id BIGINT,
  team_code         TEXT,
  team_name         TEXT,
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alarm_responses_alarm ON alarm_responses (alarm_id, started_at);
-- The same person can't stack duplicate "response started" rows on one alarm.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_response_per_user
  ON alarm_responses (alarm_id, responder_user_id) WHERE responder_user_id IS NOT NULL;

-- Field-response users assigned to a team (team codes come from the Response Teams
-- page). team_name is denormalised so a responder marker/log can show it without a
-- teams table. A user in no team falls back to their own name on the marker.
CREATE TABLE IF NOT EXISTS team_members (
  team_code TEXT NOT NULL,
  team_name TEXT,
  user_id   BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_code, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);
