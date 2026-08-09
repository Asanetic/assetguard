-- db/devices_and_logs.sql — Devices registry + telemetry logs (ingest backbone).
-- Run once:  psql "$DATABASE_URL" -f db/devices_and_logs.sql
-- Additive & idempotent — safe on an existing database. Requires the sites table.

-- Registry: an IMEI must exist here (mapped to a site) to be accepted at ingest.
CREATE TABLE IF NOT EXISTS devices (
  id          BIGSERIAL PRIMARY KEY,
  device_id   TEXT UNIQUE,                        -- display id, e.g. 009_AthiRiverPlant_V
  imei        TEXT UNIQUE NOT NULL,               -- the key every packet is matched on
  sim         TEXT,
  site_id     BIGINT REFERENCES sites(id) ON DELETE SET NULL,
  orientation TEXT,                               -- Vertical | Horizontal
  status      TEXT NOT NULL DEFAULT 'Testing',    -- Live|Offline|Testing|Maintenance|Inactive
  battery     INT,
  data_left   TEXT,
  last_seen   TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_devices_imei ON devices (imei);
CREATE INDEX IF NOT EXISTS idx_devices_site ON devices (site_id);

-- Telemetry stream. site_id is denormalised so site-scoped reads never re-join.
-- At large scale (1,000+ devices) consider monthly partitioning + a retention job.
CREATE TABLE IF NOT EXISTS device_logs (
  id          BIGSERIAL PRIMARY KEY,
  device_id   BIGINT REFERENCES devices(id) ON DELETE SET NULL,
  site_id     BIGINT REFERENCES sites(id)   ON DELETE SET NULL,
  imei        TEXT NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_time TIMESTAMPTZ,
  fix         TEXT,                               -- A valid | V invalid
  lat         DOUBLE PRECISION,
  lng         DOUBLE PRECISION,
  speed       DOUBLE PRECISION,
  course      INT,
  status_hex  TEXT,
  event       TEXT,                               -- e.g. Alarm (AL command)
  mcc         INT, mnc INT, lac BIGINT, cell_id BIGINT,
  raw         TEXT,
  src_ip      TEXT,
  src_port    INT
);
CREATE INDEX IF NOT EXISTS idx_devlogs_device_time ON device_logs (device_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_devlogs_site_time   ON device_logs (site_id, received_at DESC);

-- Packets whose IMEI is not in the registry — captured, not dropped.
CREATE TABLE IF NOT EXISTS unknown_logs (
  id          BIGSERIAL PRIMARY KEY,
  imei        TEXT,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  raw         TEXT,
  src_ip      TEXT,
  src_port    INT
);

-- Demo mapping: the sample packet's IMEI, mapped to Athi River Plant, so the
-- test packet resolves to a real device + site out of the box.
INSERT INTO devices (device_id, imei, site_id, orientation, status)
SELECT '009_AthiRiverPlant_V', '863957075080470', s.id, 'Vertical', 'Live'
  FROM sites s WHERE s.code = 'ATR-PL-009'
ON CONFLICT (imei) DO NOTHING;
