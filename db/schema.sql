-- =============================================================================
-- AssetGuard — PostgreSQL schema
-- Tables: roles, companies, users  (drives registration -> login -> approval)
-- Run:  psql "$DATABASE_URL" -f db/schema.sql
-- Safe to re-run (drops & recreates the auth tables).
-- =============================================================================

BEGIN;

DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS companies CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ---------------------------------------------------------------------------
-- roles — reference data (from the prototype AG_ROLES)
-- ---------------------------------------------------------------------------
CREATE TABLE roles (
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  icon        TEXT,
  bg          TEXT,
  fg          TEXT,
  description TEXT,
  sort        INT  NOT NULL DEFAULT 0
);

INSERT INTO roles (key, name, icon, bg, fg, description, sort) VALUES
  ('superadmin',       'Super Admin',                          'ti-crown',        '#EDE9FE', '#6D28D9', 'Full platform control across all companies',            1),
  ('admin',            'Admin',                                'ti-shield-cog',   '#DBE7FE', '#1E56DB', 'Manage sites, devices, users and approvals',            2),
  ('company_mgr',      'Company Manager',                      'ti-briefcase',    '#D1FAE5', '#047857', 'Oversees their company''s sites and teams',             3),
  ('asst_mgr',         'Assistant Manager',                    'ti-user-cog',     '#D1FAE5', '#059669', 'Supports the company manager on daily ops',             4),
  ('sec_country',      'Security Company Country Manager',     'ti-shield-check', '#FEE2E2', '#B91C1C', 'National lead for the security provider',               5),
  ('sec_country_asst', 'Assistant Security Country Manager',   'ti-user-shield',  '#FEE2E2', '#EF4444', 'Supports the country manager for the security provider',6),
  ('sec_regional',     'Security Company Regional Manager',    'ti-shield-half',  '#FEE2E2', '#DC2626', 'Regional lead for the security provider',               7),
  ('sec_regional_asst','Assistant Security Regional Manager',  'ti-user-shield',  '#FEE2E2', '#F87171', 'Supports the regional manager for a security region',   8),
  ('field_resp',       'Field Response',                       'ti-run',          '#FEF3C7', '#B45309', 'Responds on the ground to live alarms',                 9),
  ('field_tech',       'Field Technician',                     'ti-tool',         '#E0F2FE', '#0284C7', 'Installs and services devices on site',                10),
  ('noc',              'NOC Personnel',                        'ti-headset',      '#E0F2FE', '#0369A1', 'Monitors the 24/7 operations centre',                  11);

-- ---------------------------------------------------------------------------
-- companies — registered organisations (from prototype COMPANY_STORE)
-- purposes: any of 'Client','NOC','Response'
-- ---------------------------------------------------------------------------
CREATE TABLE companies (
  id            BIGSERIAL PRIMARY KEY,
  code          TEXT UNIQUE,                       -- e.g. CMP-001
  name          TEXT NOT NULL UNIQUE,
  purposes      TEXT[] NOT NULL DEFAULT '{}',
  contact_email TEXT,
  phone         TEXT,
  status        TEXT NOT NULL DEFAULT 'Active',     -- Active | Inactive
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO companies (code, name, purposes, contact_email, phone) VALUES
  ('CMP-001', 'Symphony Technologies Limited', ARRAY['Client','NOC'], 'ops@symphony.com',         '+254 712 000 111'),
  ('CMP-002', 'Falcon Guard Ltd',              ARRAY['Response'],     'dispatch@falconguard.co.ke','+254 711 100 200'),
  ('CMP-003', 'Symphony NOC',                  ARRAY['NOC'],          'noc@symphonynoc.co.ke',    '+254 715 111 222'),
  ('CMP-004', 'Savanna Freight Co.',           ARRAY['Client'],       'fleet@savanna.co.ke',      '+254 722 640 118'),
  ('CMP-005', 'Acme Logistics Ltd',            ARRAY['Client'],       'ops@acme.co.ke',           '+254 722 111 222'),
  ('CMP-006', 'Twiga Distributors',            ARRAY['Client'],       'ops@twiga.co.ke',          '+254 733 444 555'),
  ('CMP-007', 'Baraka Motors Group',           ARRAY['Client'],       'ops@baraka.co.ke',         '+254 711 777 999');

-- ---------------------------------------------------------------------------
-- users
-- status lifecycle:  Pending -> (Active | Rejected);  Active <-> Suspended
-- role is NULL until an admin assigns one at approval.
-- ---------------------------------------------------------------------------
CREATE TABLE users (
  id             BIGSERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  email          TEXT UNIQUE,
  phone          TEXT,
  company_id     BIGINT REFERENCES companies(id) ON DELETE SET NULL,
  role           TEXT REFERENCES roles(key) ON DELETE SET NULL,
  status         TEXT NOT NULL DEFAULT 'Pending',    -- Pending | Active | Suspended | Rejected
  password       TEXT NOT NULL,                      -- bcrypt hash
  regions        TEXT[] NOT NULL DEFAULT '{}',       -- security-role region scope
  email_verified BOOLEAN NOT NULL DEFAULT false,
  phone_verified BOOLEAN NOT NULL DEFAULT false,
  approved_by    BIGINT REFERENCES users(id) ON DELETE SET NULL,
  approved_at    TIMESTAMPTZ,
  last_seen      TIMESTAMPTZ,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_users_email    ON users (lower(email));
CREATE INDEX idx_users_status   ON users (status);
CREATE INDEX idx_users_company  ON users (company_id);

-- ---------------------------------------------------------------------------
-- verification_codes — email/phone OTP for registration
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS verification_codes CASCADE;
CREATE TABLE verification_codes (
  id         BIGSERIAL PRIMARY KEY,
  channel    TEXT NOT NULL,               -- 'email' | 'phone'
  target     TEXT NOT NULL,               -- normalized email or phone
  code       TEXT NOT NULL,               -- 6-digit code
  expires_at TIMESTAMPTZ NOT NULL,
  consumed   BOOLEAN NOT NULL DEFAULT false,
  attempts   INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_vcodes_lookup ON verification_codes (channel, target, consumed);

-- ---------------------------------------------------------------------------
-- access_requests — raised from the public "Request access" screen
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS access_requests CASCADE;
CREATE TABLE access_requests (
  id         BIGSERIAL PRIMARY KEY,
  req_no     TEXT UNIQUE,
  name       TEXT NOT NULL,
  email      TEXT,
  phone      TEXT,
  company    TEXT,
  problem    TEXT,
  status     TEXT NOT NULL DEFAULT 'New',   -- New | Declined | Handled
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_access_requests_status ON access_requests (status);

-- ---------------------------------------------------------------------------
-- sites — registered locations (Sites module)
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS sites CASCADE;
CREATE TABLE sites (
  id         BIGSERIAL PRIMARY KEY,
  code       TEXT UNIQUE NOT NULL,               -- display code, e.g. NBI-HQ-001
  name       TEXT NOT NULL,
  region     TEXT,
  location   TEXT,
  devices    INT NOT NULL DEFAULT 0,
  status     TEXT NOT NULL DEFAULT 'Pending',    -- Live|Testing|Maintenance|SMPMS|Pending|Offline|Inactive
  -- Extra detail carried by the "Import sites from Excel" flow:
  smpms_vendor     TEXT,
  dist_region      TEXT,                          -- Distribution Region
  county           TEXT,
  lat              NUMERIC(9,6),
  lng              NUMERIC(9,6),
  response_cluster TEXT,
  security_region  TEXT,
  country          TEXT,
  details          JSONB,                         -- full Add-site form payload
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_sites_region ON sites (region);
CREATE INDEX idx_sites_status ON sites (status);

INSERT INTO sites (code, name, region, location, devices, status) VALUES
  ('NBI-HQ-001','Nairobi Headquarters','Nairobi','Westlands, Nairobi',14,'Live'),
  ('MBA-BR-002','Mombasa Branch','Coast','Nyali, Mombasa',9,'Live'),
  ('KSM-OF-003','Kisumu Office','Western','Milimani, Kisumu',4,'Testing'),
  ('NKR-DP-004','Nakuru Depot','Rift Valley','Industrial Area, Nakuru',7,'Live'),
  ('ELD-ST-005','Eldoret Station','Rift Valley','Eldoret Town',3,'Maintenance'),
  ('ATR-PL-009','Athi River Plant','Eastern','Athi River, Machakos',8,'SMPMS'),
  ('THK-WH-006','Thika Warehouse','Nairobi','Thika Road, Thika',0,'Pending'),
  ('GRS-SB-007','Garissa Substation','North Eastern','Garissa Town',5,'Offline'),
  ('MLD-YD-008','Malindi Yard','Coast','Malindi, Kilifi',6,'Inactive');

-- ---------------------------------------------------------------------------
-- devices + telemetry (ingest backbone) — see db/devices_and_logs.sql
-- ---------------------------------------------------------------------------
DROP TABLE IF EXISTS device_logs CASCADE;
DROP TABLE IF EXISTS unknown_logs CASCADE;
DROP TABLE IF EXISTS devices CASCADE;
CREATE TABLE devices (
  id BIGSERIAL PRIMARY KEY,
  device_id TEXT UNIQUE, imei TEXT UNIQUE NOT NULL, sim TEXT,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  orientation TEXT, status TEXT NOT NULL DEFAULT 'Testing',
  battery INT, data_left TEXT, last_seen TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_devices_imei ON devices (imei);
CREATE INDEX idx_devices_site ON devices (site_id);
CREATE TABLE device_logs (
  id BIGSERIAL PRIMARY KEY,
  device_id BIGINT REFERENCES devices(id) ON DELETE SET NULL,
  site_id BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  imei TEXT NOT NULL, received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_time TIMESTAMPTZ, fix TEXT, lat DOUBLE PRECISION, lng DOUBLE PRECISION,
  speed DOUBLE PRECISION, course INT, status_hex TEXT, event TEXT,
  mcc INT, mnc INT, lac BIGINT, cell_id BIGINT, raw TEXT, src_ip TEXT, src_port INT
);
CREATE INDEX idx_devlogs_device_time ON device_logs (device_id, received_at DESC);
CREATE INDEX idx_devlogs_site_time ON device_logs (site_id, received_at DESC);
CREATE TABLE unknown_logs (
  id BIGSERIAL PRIMARY KEY, imei TEXT, received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw TEXT, src_ip TEXT, src_port INT
);
INSERT INTO devices (device_id, imei, site_id, orientation, status)
SELECT '009_AthiRiverPlant_V', '863957075080470', s.id, 'Vertical', 'Live'
  FROM sites s WHERE s.code = 'ATR-PL-009' ON CONFLICT (imei) DO NOTHING;

COMMIT;

-- Admin login account + sample pending registrations are seeded by db/seed.js
-- (that script hashes passwords with bcrypt, which SQL can't do).
