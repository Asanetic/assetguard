-- db/response_teams.sql
-- Response teams persisted to the DB (previously in-memory), so the dispatch popup
-- can resolve the team for a cluster + alternatives. Additive & idempotent.
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d assetguard -f "C:\assetguardv2\db\response_teams.sql"

CREATE TABLE IF NOT EXISTS response_teams (
  code      TEXT PRIMARY KEY,
  sec_region TEXT,
  vehicle   TEXT,
  phones    TEXT[] NOT NULL DEFAULT '{}',
  emails    TEXT[] NOT NULL DEFAULT '{}',
  company   TEXT,
  clusters  TEXT[] NOT NULL DEFAULT '{}'
);
-- Cross-cluster grants: a team allowed to answer in another cluster (alternatives).
CREATE TABLE IF NOT EXISTS response_team_grants (
  team_code TEXT NOT NULL,
  cluster   TEXT NOT NULL,
  PRIMARY KEY (team_code, cluster)
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
