-- db/devices_firmware.sql — firmware version per device (shown + categorisable on
-- the Group devices page). Additive & idempotent. Backfills demo values matching
-- the prototype (Mombasa & Athi River on v2.4.1, Eldoret on v2.2.5, rest v2.3.8).
--   psql "$DATABASE_URL" -f db/devices_firmware.sql
ALTER TABLE devices ADD COLUMN IF NOT EXISTS firmware TEXT;

UPDATE devices d SET firmware = CASE
    WHEN s.code IN ('MBA-BR-002', 'ATR-PL-009') THEN 'v2.4.1'
    WHEN s.code = 'ELD-ST-005' THEN 'v2.2.5'
    ELSE 'v2.3.8'
  END
  FROM sites s
 WHERE s.id = d.site_id AND (d.firmware IS NULL OR d.firmware = '');
