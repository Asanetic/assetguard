-- db/update.sql
-- NON-DESTRUCTIVE update for an EXISTING database (e.g. your local dev DB).
-- Applies every additive migration — all are idempotent (CREATE TABLE / ADD COLUMN
-- IF NOT EXISTS, seeds use ON CONFLICT DO NOTHING) — so it only adds what's missing
-- and is safe to run repeatedly. It does NOT drop anything and does NOT run the core
-- schema.sql (your base tables already exist). For a brand-new/empty DB use deploy.sql.
--
--   psql "postgresql://USER:PASS@HOST:5432/assetguard" -v ON_ERROR_STOP=1 -f db/update.sql
--   Windows:  & "C:\Program Files\PostgreSQL\18\bin\psql.exe" -U postgres -d assetguard -v ON_ERROR_STOP=1 -f "C:\assetguardv2\db\update.sql"
\set ON_ERROR_STOP on

\echo '== platform config + audit =='
\ir app_config.sql
\ir audit_logs.sql
\ir access_control.sql
\ir access_requests.sql
\ir verification.sql
\echo '== companies + sites =='
\ir companies_status.sql
\ir sites.sql
\ir sites_companies.sql
\ir sites_details.sql
\ir sites_import.sql
\ir unique_phone.sql
\echo '== devices =='
\ir devices_and_logs.sql
\ir devices_config.sql
\ir devices_firmware.sql
\ir device_commands.sql
\ir device_view.sql
\echo '== ingest: raw, telemetry, alarms, playback, ports =='
\ir raw_logs.sql
\ir playback.sql
\ir alarms.sql
\ir alarms_live.sql
\ir alarms_severity.sql
\ir alarm_lifecycle.sql
\ir device_telemetry.sql
\ir telemetry_extras.sql
\ir telemetry_geo.sql
\ir listener_ports.sql

\echo '== UPDATE COMPLETE =='
