-- db/ack_team.sql
-- Record the acknowledging user's TEAM (like the response log records the responder's
-- team), so the alarm lifecycle shows "Acknowledged — Monitoring · by <name> · <team>".
-- Idempotent.
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_monitoring_team TEXT;
ALTER TABLE alarms ADD COLUMN IF NOT EXISTS ack_security_team   TEXT;
