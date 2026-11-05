-- db/fix_tech_region_mode.sql — one-time backfill.
-- Field technicians who were given a region (via the quick control) but whose
-- site_scope_mode was never set explicitly were inheriting the global default.
-- If that default is 'list', their region was ignored and they saw NO sites.
-- Put them on explicit Region-controlled mode. Technicians explicitly set to
-- 'list' (Assigned sites) are deliberately NOT touched.
--   psql "$DATABASE_URL" -f db/fix_tech_region_mode.sql

UPDATE users
   SET site_scope_mode = 'region'
 WHERE role = 'field_tech'
   AND site_scope_mode IS NULL
   AND COALESCE(array_length(regions, 1), 0) >= 1;
