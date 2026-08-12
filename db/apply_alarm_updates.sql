-- db/apply_alarm_updates.sql
-- SELF-CONTAINED alarm migration. Run THIS instead of update.sql — it inlines
-- every alarm change (no \ir includes), so it doesn't need the rest of the db/
-- folder. Idempotent: safe to run repeatedly, adds only what's missing.
--
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d assetguard -f "C:\assetguardv2\db\apply_alarm_updates.sql"

\echo '== alarm severity: road, last_seen, thresholds =='

-- Critical Motion records the road it was on ("… on Waiyaki Way").
ALTER TABLE alarms  ADD COLUMN IF NOT EXISTS road TEXT;

-- Device Offline sweep needs last_seen; guarantee it + the config column.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS config    JSONB;

-- Seed alarm thresholds into every device's config WITHOUT clobbering overrides
-- (defaults || existing => existing wins, only missing keys are filled).
UPDATE devices SET config =
  jsonb_build_object(
    'high_temp_c',          55,
    'low_battery_pct',      20,
    'critical_battery_pct', 10,
    'offline_hours',        24,
    'low_data_mb',          1
  ) || COALESCE(config, '{}'::jsonb);

\echo '== alarm lifecycle: dual acknowledge + close + photos =='

-- Independent monitoring / security acknowledgements (who / when / finding / note).
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_monitoring_at      TIMESTAMPTZ;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_monitoring_by      TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_monitoring_finding TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_monitoring_note    TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_security_at        TIMESTAMPTZ;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_security_by        TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_security_finding   TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_security_note      TEXT;

-- Close: genuine/false + note + photos of what was found.
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS closed_at     TIMESTAMPTZ;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS closed_by     TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS close_outcome TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS close_note    TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS close_photos  JSONB;

CREATE INDEX IF NOT EXISTS idx_alarms_device_time ON alarms (device_id, created_at DESC);

\echo '== alarm thresholds RBAC module (optional; ignored if roles/modules absent) =='
INSERT INTO modules (name,key,grp,type,active,sort) VALUES
  ('Alarm Thresholds','alarm_config','Alarms','Page',true,51)
ON CONFLICT (key) DO NOTHING;
INSERT INTO role_permissions (role_key,module_key,perm_key) VALUES
  ('superadmin','alarm_config','view'),('superadmin','alarm_config','edit'),
  ('admin','alarm_config','view'),('admin','alarm_config','edit')
ON CONFLICT DO NOTHING;

\echo '== ALARM UPDATES COMPLETE =='

\echo '== response logging + team membership =='
CREATE TABLE IF NOT EXISTS alarm_responses (
  id BIGSERIAL PRIMARY KEY, alarm_id TEXT NOT NULL, responder_by TEXT,
  responder_user_id BIGINT, team_code TEXT, team_name TEXT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alarm_responses_alarm ON alarm_responses (alarm_id, started_at);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_response_per_user
  ON alarm_responses (alarm_id, responder_user_id) WHERE responder_user_id IS NOT NULL;
CREATE TABLE IF NOT EXISTS team_members (
  team_code TEXT NOT NULL, team_name TEXT,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (team_code, user_id)
);
CREATE INDEX IF NOT EXISTS idx_team_members_user ON team_members (user_id);

\echo '== response regions + clusters =='
CREATE TABLE IF NOT EXISTS response_regions (id BIGSERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, sort INT NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS response_clusters (id BIGSERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, region TEXT, sort INT NOT NULL DEFAULT 0);
INSERT INTO response_regions (name, sort) VALUES
  ('Nairobi North',1),('Nairobi South',2),('Coast',3),('Rift Valley',4),('Western',5),('Upper Eastern',6),('North Eastern',7)
ON CONFLICT (name) DO NOTHING;
INSERT INTO response_clusters (name, region, sort) VALUES
  ('Cluster A — Nairobi North','Nairobi North',1),('Cluster B — Nairobi South','Nairobi South',2),
  ('Cluster C — Coast','Coast',3),('Cluster D — Rift','Rift Valley',4),('Cluster E — Western','Western',5),
  ('Cluster F — Eastern','Upper Eastern',6),('Cluster G — North Eastern','North Eastern',7)
ON CONFLICT (name) DO NOTHING;

\echo '== live responder positions =='
CREATE TABLE IF NOT EXISTS responder_positions (
  device_id TEXT NOT NULL, user_id BIGINT NOT NULL, name TEXT, team TEXT,
  lat DOUBLE PRECISION, lng DOUBLE PRECISION, updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (device_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_responder_positions_dev ON responder_positions (device_id, updated_at DESC);

\echo '== response teams (for dispatch) =='
CREATE TABLE IF NOT EXISTS response_teams (
  code TEXT PRIMARY KEY, sec_region TEXT, vehicle TEXT,
  phones TEXT[] NOT NULL DEFAULT '{}', emails TEXT[] NOT NULL DEFAULT '{}',
  company TEXT, clusters TEXT[] NOT NULL DEFAULT '{}'
);
CREATE TABLE IF NOT EXISTS response_team_grants (
  team_code TEXT NOT NULL, cluster TEXT NOT NULL, PRIMARY KEY (team_code, cluster)
);
INSERT INTO response_teams (code, sec_region, vehicle, phones, emails, company, clusters) VALUES
 ('Bravo 14','Nairobi North','KDA 123B','{+254 700 140 014}','{bravo14@falconguard.co.ke}','Falcon Guard Ltd','{Cluster A — Nairobi North}'),
 ('Bravo 7','Nairobi North','KDG 771C','{+254 700 140 007}','{bravo7@falconguard.co.ke}','Falcon Guard Ltd','{Cluster B — Nairobi South}'),
 ('Charlie 2','Nairobi South','KCX 220A','{+254 700 220 002}','{charlie2@falconguard.co.ke}','Falcon Guard Ltd','{Cluster B — Nairobi South}'),
 ('Charlie 9','Nairobi South','KCY 909F','{+254 700 220 009}','{charlie9@falconguard.co.ke}','Falcon Guard Ltd','{Cluster B — Nairobi South}'),
 ('Whiskey 5','Coast','KBZ 505M','{+254 700 505 005}','{whiskey5@shieldresponse.co.ke}','Shield Response Co.','{Cluster C — Coast}'),
 ('Whiskey 12','Coast','KBQ 812M','{+254 700 505 012}','{whiskey12@shieldresponse.co.ke}','Shield Response Co.','{Cluster F — Eastern}'),
 ('Delta 3','Rift Valley','KDD 303R','{+254 700 303 003}','{delta3@simbasecurity.co.ke}','Simba Security Group','{Cluster D — Rift}'),
 ('Echo 8','Western','KDE 808W','{+254 700 808 008}','{echo8@simbasecurity.co.ke}','Simba Security Group','{Cluster E — Western}'),
 ('Foxtrot 1','Upper Eastern','KDF 101E','{+254 700 101 001}','{foxtrot1@shieldresponse.co.ke}','Shield Response Co.','{Cluster F — Eastern}'),
 ('Golf 6','North Eastern','KDG 606N','{+254 700 606 006}','{golf6@shieldresponse.co.ke}','Shield Response Co.','{Cluster G — North Eastern}'),
 ('Delta 9','Rift Valley','KDD 909R','{+254 700 303 009}','{delta9@simbasecurity.co.ke}','Simba Security Group','{Cluster D — Rift}'),
 ('Echo 2','Western','KDE 202W','{+254 700 808 002}','{echo2@simbasecurity.co.ke}','Simba Security Group','{Cluster E — Western}'),
 ('Foxtrot 7','Upper Eastern','KDF 707E','{+254 700 101 007}','{foxtrot7@shieldresponse.co.ke}','Shield Response Co.','{Cluster F — Eastern}'),
 ('Golf 11','North Eastern','KDG 611N','{+254 700 606 011}','{golf11@shieldresponse.co.ke}','Shield Response Co.','{Cluster G — North Eastern}')
ON CONFLICT (code) DO NOTHING;
