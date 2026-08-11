-- db/device_telemetry.sql
-- Normalized, parsed telemetry — one row per interpreted UD/AL packet.
-- Separate from device_logs (which stays as the raw-ish log): this is the clean
-- feed the tracking UI + playback read. Safe to run repeatedly.

CREATE TABLE IF NOT EXISTS device_telemetry (
  id           BIGSERIAL PRIMARY KEY,
  device_id    BIGINT REFERENCES devices(id) ON DELETE SET NULL,
  site_id      BIGINT REFERENCES sites(id)   ON DELETE SET NULL,
  imei         TEXT NOT NULL,
  received_at  TIMESTAMPTZ NOT NULL DEFAULT now(),  -- when the server got it
  device_time  TIMESTAMPTZ,                         -- timestamp from the packet
  fix          TEXT,                                -- A | V
  lat          DOUBLE PRECISION,
  lng          DOUBLE PRECISION,
  speed        DOUBLE PRECISION,                    -- km/h
  course       INT,                                 -- heading / angle
  altitude     DOUBLE PRECISION,
  satellites   INT,
  signal       INT,                                 -- GSM signal
  battery      INT,                                 -- %
  motion_byte  TEXT,                                -- motion/status word
  mems_valid   BOOLEAN,
  mems_x       INT,
  mems_y       INT,
  mems_z       INT,
  roll         DOUBLE PRECISION,
  pitch        DOUBLE PRECISION,
  temperature  DOUBLE PRECISION,                    -- °C
  mcc          INT, mnc INT, lac BIGINT, cell_id BIGINT,
  raw          TEXT,
  src_ip       TEXT, src_port INT
);
CREATE INDEX IF NOT EXISTS idx_telemetry_device_time ON device_telemetry (device_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_site_time   ON device_telemetry (site_id, received_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_devtime      ON device_telemetry (device_id, device_time DESC);
