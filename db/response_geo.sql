-- db/response_geo.sql
-- Response regions + clusters as real tables (the Response Teams page reads these
-- instead of hardcoded arrays). Additive & idempotent.
--   & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d assetguard -f "C:\assetguardv2\db\response_geo.sql"

CREATE TABLE IF NOT EXISTS response_regions (
  id   BIGSERIAL PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  sort INT NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS response_clusters (
  id     BIGSERIAL PRIMARY KEY,
  name   TEXT UNIQUE NOT NULL,
  region TEXT,
  sort   INT NOT NULL DEFAULT 0
);

INSERT INTO response_regions (name, sort) VALUES
  ('Nairobi North', 1), ('Nairobi South', 2), ('Coast', 3), ('Rift Valley', 4),
  ('Western', 5), ('Upper Eastern', 6), ('North Eastern', 7)
ON CONFLICT (name) DO NOTHING;

INSERT INTO response_clusters (name, region, sort) VALUES
  ('Cluster A — Nairobi North', 'Nairobi North', 1),
  ('Cluster B — Nairobi South', 'Nairobi South', 2),
  ('Cluster C — Coast',         'Coast',         3),
  ('Cluster D — Rift',          'Rift Valley',   4),
  ('Cluster E — Western',       'Western',       5),
  ('Cluster F — Eastern',       'Upper Eastern', 6),
  ('Cluster G — North Eastern', 'North Eastern', 7)
ON CONFLICT (name) DO NOTHING;
