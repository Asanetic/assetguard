-- db/teams_admin.sql
-- Makes the Response teams and NOC teams ADMIN pages database-backed (they were
-- in-memory before, so nothing an admin registered survived a reload). Additive
-- & idempotent.
--
--   psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/teams_admin.sql

-- Response teams (may already exist from db/response_teams.sql). The vehicle
-- column is kept for backward compatibility but is no longer written.
CREATE TABLE IF NOT EXISTS response_teams (
  code       TEXT PRIMARY KEY,
  sec_region TEXT,
  vehicle    TEXT,
  phones     TEXT[] NOT NULL DEFAULT '{}',
  emails     TEXT[] NOT NULL DEFAULT '{}',
  company    TEXT,
  clusters   TEXT[] NOT NULL DEFAULT '{}'
);

CREATE TABLE IF NOT EXISTS response_team_grants (
  team_code TEXT NOT NULL,
  cluster   TEXT NOT NULL,
  PRIMARY KEY (team_code, cluster)
);

-- NOC teams: a control-room desk owned by a monitoring ('mon') or security
-- ('sec') company, covering regions (empty = country-wide).
CREATE TABLE IF NOT EXISTS noc_teams (
  code    TEXT PRIMARY KEY,
  owner   TEXT NOT NULL DEFAULT 'mon',
  company TEXT,
  covers  TEXT[] NOT NULL DEFAULT '{}',
  phones  TEXT[] NOT NULL DEFAULT '{}',
  emails  TEXT[] NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS noc_teams_company_idx ON noc_teams (company);
