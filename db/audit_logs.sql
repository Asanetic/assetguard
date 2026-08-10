-- db/audit_logs.sql — immutable trail of system activity (prototype AUDIT_STORE).
-- Run once:  psql "$DATABASE_URL" -f db/audit_logs.sql
--
-- Every meaningful action (user approved, site deleted, alarm closed, device
-- added, role changed, company registered, settings saved, ...) appends one row
-- here. Rows are only ever inserted, never updated or deleted, so the log can be
-- used for disputes and tamper checks.

CREATE TABLE IF NOT EXISTS audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
  actor_name  TEXT NOT NULL,
  actor_role  TEXT,
  action      TEXT NOT NULL,
  category    TEXT NOT NULL DEFAULT 'System',
  detail      TEXT,
  ip          TEXT
);

CREATE INDEX IF NOT EXISTS audit_logs_ts_idx  ON audit_logs (ts DESC);
CREATE INDEX IF NOT EXISTS audit_logs_cat_idx ON audit_logs (category);

-- Seed the five entries from the prototype, but only if the table is empty so
-- re-running the migration never duplicates them.
INSERT INTO audit_logs (ts, actor_name, actor_role, action, category, detail, ip)
SELECT * FROM (VALUES
  (TIMESTAMPTZ '2026-07-15 09:41:22', 'Jane Wanjiku', 'Administrator',   'User approved', 'Users',    'Approved REG-2043 Mercy Achieng and assigned Field Responder',      '196.201.14.32'),
  (TIMESTAMPTZ '2026-07-15 09:12:04', 'Grace Wambui', 'Super Admin',     'Site deleted',  'Sites',    'Deleted site THK-WH-006 Thika Warehouse (0 devices)',              '196.201.14.9'),
  (TIMESTAMPTZ '2026-07-15 08:55:47', 'Kevin Ouma',   'NOC',             'Alarm closed',  'Alarms',   'Closed ALM-3391 perimeter breach at Nairobi Headquarters',         '41.90.7.220'),
  (TIMESTAMPTZ '2026-07-15 08:40:10', 'James Mwangi', 'Administrator',   'Device added',  'Devices',  'Registered device 004_NakuruDepot_V (IMEI 352093…34580)',          '196.201.14.32'),
  (TIMESTAMPTZ '2026-07-14 17:22:33', 'Alice Njeri',  'Company Manager', 'Role changed',  'Users',    'Changed Nancy Wairimu from NOC to suspended',                      '196.201.14.51')
) AS seed(ts, actor_name, actor_role, action, category, detail, ip)
WHERE NOT EXISTS (SELECT 1 FROM audit_logs);
