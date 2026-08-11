-- db/listener_ports.sql
-- TCP listener ports the platform manages (open/close/add). TCP only.
CREATE TABLE IF NOT EXISTS listener_ports (
  id           BIGSERIAL PRIMARY KEY,
  port         INT UNIQUE NOT NULL,
  proto        TEXT NOT NULL DEFAULT 'TCP',
  device_model TEXT,
  enabled      BOOLEAN NOT NULL DEFAULT false,   -- desired state (reopened on restart)
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO listener_ports (port, device_model, enabled) VALUES
  (5023, 'Teltonika FMB920', true),
  (5027, 'Concox GT06N',     true),
  (5039, 'Queclink GV75',    true),
  (5088, 'Ruptela FM-Eco4',  true)
ON CONFLICT (port) DO NOTHING;

-- Attribute raw frames to the listener port + device.
ALTER TABLE raw_logs ADD COLUMN IF NOT EXISTS port   INT;
ALTER TABLE raw_logs ADD COLUMN IF NOT EXISTS device TEXT;   -- imei / device id once identified
CREATE INDEX IF NOT EXISTS idx_raw_logs_port ON raw_logs (port, received_at DESC);
