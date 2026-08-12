-- db/alarms_severity.sql
-- Severity-model additions (see claude/alarms-and-severity.md). Additive &
-- idempotent — safe to run repeatedly, on localhost or the VPS.
--   psql "$DATABASE_URL" -f db/alarms_severity.sql
--
-- Adds: the Critical-Motion road name, a guaranteed last_seen column (for the
-- Device Offline sweep), and seeds every device's alarm-threshold config with the
-- confirmed defaults WITHOUT clobbering any per-device overrides already set.

-- Critical Motion records the road it was on ("… on Waiyaki Way").
ALTER TABLE alarms  ADD COLUMN IF NOT EXISTS road TEXT;

-- Device Offline sweep compares this to now(); column already exists on fresh
-- installs, this just guarantees it on older DBs.
ALTER TABLE devices ADD COLUMN IF NOT EXISTS last_seen TIMESTAMPTZ;
ALTER TABLE devices ADD COLUMN IF NOT EXISTS config    JSONB;

-- Seed the alarm thresholds into every device's config. `defaults || existing`
-- means an existing per-device value WINS and only missing keys are filled, so
-- this never overwrites a threshold an operator has already customised.
UPDATE devices SET config =
  jsonb_build_object(
    'high_temp_c',          55,   -- High Temperature  (°C, High)
    'low_battery_pct',      20,   -- Low Battery       (%, High)
    'critical_battery_pct', 10,   -- Critical Low Batt (%, Critical)
    'offline_hours',        24,   -- Device Offline    (h, High)
    'low_data_mb',          1     -- Low Data          (MB, Medium)
  ) || COALESCE(config, '{}'::jsonb);
