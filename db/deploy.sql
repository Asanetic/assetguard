-- db/deploy.sql
-- Full VPS deploy: DROP EVERYTHING and rebuild from the ordered migrations.
-- USE ON A FRESH / DISPOSABLE DATABASE — this wipes all tables in `public`.
--
--   psql "postgresql://USER:PASS@HOST:5432/assetguard" -v ON_ERROR_STOP=1 -f db/deploy.sql
--
-- (Run from the repo root or the db/ folder — \ir includes are relative to this file.)
\set ON_ERROR_STOP on

\echo '== dropping and recreating the public schema =='
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;

\echo '== 1. core schema (roles, users, sites, devices, logs) =='
\ir schema.sql
\echo '== 2. platform config + audit =='
\ir app_config.sql
\ir audit_logs.sql
\ir access_control.sql
\ir access_requests.sql
\ir verification.sql
\echo '== 3. companies + sites =='
\ir companies_status.sql
\ir sites.sql
\ir sites_companies.sql
\ir sites_details.sql
\ir sites_import.sql
\ir unique_phone.sql
\echo '== 4. devices =='
\ir devices_and_logs.sql
\ir devices_config.sql
\ir devices_firmware.sql
\ir device_commands.sql
\ir device_view.sql
\echo '== 5. ingest: raw, telemetry, alarms, playback =='
\ir raw_logs.sql
\ir playback.sql
\ir alarms.sql
\ir alarms_live.sql
\ir device_telemetry.sql
\ir telemetry_extras.sql
\ir telemetry_geo.sql
\ir listener_ports.sql
\echo '== 6. seed devices =='
\ir devices_seed.sql

\echo '== DEPLOY COMPLETE =='
