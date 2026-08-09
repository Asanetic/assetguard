-- db/sites.sql — Sites module.
-- Run once:  psql "$DATABASE_URL" -f db/sites.sql
-- Additive & idempotent: safe to run on an existing database.

CREATE TABLE IF NOT EXISTS sites (
  id         BIGSERIAL PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,               -- display code, e.g. NBI-HQ-001
  name       TEXT NOT NULL,
  region     TEXT,
  location   TEXT,
  devices    INT NOT NULL DEFAULT 0,             -- placeholder until Devices module links up
  status     TEXT NOT NULL DEFAULT 'Pending',    -- Live|Testing|Maintenance|SMPMS|Pending|Offline|Inactive
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_sites_region ON sites (region);
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites (status);

-- Seed rows mirror the prototype's "All sites" screen (assetguard_web_all_sites_v5),
-- in the same display order.
INSERT INTO sites (code, name, region, location, devices, status) VALUES
  ('NBI-HQ-001','Nairobi Headquarters','Nairobi','Westlands, Nairobi',14,'Live'),
  ('MBA-BR-002','Mombasa Branch','Coast','Nyali, Mombasa',9,'Live'),
  ('KSM-OF-003','Kisumu Office','Western','Milimani, Kisumu',4,'Testing'),
  ('NKR-DP-004','Nakuru Depot','Rift Valley','Industrial Area, Nakuru',7,'Live'),
  ('ELD-ST-005','Eldoret Station','Rift Valley','Eldoret Town',3,'Maintenance'),
  ('ATR-PL-009','Athi River Plant','Eastern','Athi River, Machakos',8,'SMPMS'),
  ('THK-WH-006','Thika Warehouse','Nairobi','Thika Road, Thika',0,'Pending'),
  ('GRS-SB-007','Garissa Substation','North Eastern','Garissa Town',5,'Offline'),
  ('MLD-YD-008','Malindi Yard','Coast','Malindi, Kilifi',6,'Inactive')
ON CONFLICT (code) DO NOTHING;
