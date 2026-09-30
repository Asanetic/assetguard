-- db/page_access_simplify.sql
-- Page-level access control: the landing (Alarm Maps) must open for everyone,
-- and the old Button / Data Point permissions are retired.
-- Idempotent — safe to run more than once.

-- 1) Grant Alarm Maps ("view") to EVERY role, so the landing page always loads.
INSERT INTO role_permissions (role_key, module_key, perm_key)
SELECT r.key, 'alarms_map', 'view'
  FROM roles r
ON CONFLICT DO NOTHING;

-- 2) Retire access control for Buttons and Data Points: drop every grant that
--    points at a non-Page module. The modules rows themselves are left in place
--    (harmless, and referenced nowhere now), but no role carries their grants.
DELETE FROM role_permissions
 WHERE module_key IN (SELECT key FROM modules WHERE type <> 'Page');
