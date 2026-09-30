-- db/page_access_menu_only.sql
-- Reconcile Access control to the CURRENT menu: every page that is in the menu
-- now, and nothing that isn't. Idempotent, and self-contained (safe to run even
-- if the earlier page-access migrations were not).

-- 1) Remove pages that no longer exist in the app. Missions is gone; so are the
--    stale detail/utility modules that were never menu items (viewing a site or
--    device now rolls up to its list page, and these had no page of their own).
--    role_permissions rows for them cascade away via the FK.
DELETE FROM modules WHERE key IN (
  'missions', 'capture', 'notifications_all', 'approvals',
  'site_view', 'device_view', 'alarm_detail', 'device_track'
);

-- 2) The two "add" entries are real pages in the menu.
UPDATE modules SET type = 'Page' WHERE key IN ('site_add', 'device_add');

-- 3) Make sure every current menu page exists as a Page module.
INSERT INTO modules (name, key, grp, type, active, sort) VALUES
  ('Parsed & Aligned', 'tcplogs',          'Devices', 'Page', true, 101),
  ('Simulator',        'simulator',        'Devices', 'Page', true, 102),
  ('Playback Exports', 'playback_exports', 'Track',   'Page', true, 103),
  ('Heartbeats',       'heartbeats',       'Reports', 'Page', true, 104),
  ('My Profile',       'profile',          'Account', 'Page', true, 105),
  ('Companies',        'companies',        'Admin',   'Page', true, 106),
  ('NOC Teams',        'noc_teams',        'Admin',   'Page', true, 107),
  ('Settings',         'settings',         'Admin',   'Page', true, 108),
  ('Google Maps',      'google_maps',      'Admin',   'Page', true, 109),
  ('Firmware',         'firmware',         'Admin',   'Page', true, 110),
  ('Email & SMS',      'messaging',        'Admin',   'Page', true, 111),
  ('Audit Logs',       'audit',            'Admin',   'Page', true, 112)
ON CONFLICT (key) DO NOTHING;

-- 4) Baseline so no role is stranded: the landing (Alarm Maps) + own profile.
INSERT INTO role_permissions (role_key, module_key, perm_key)
SELECT r.key, p.key, 'view'
  FROM roles r
  CROSS JOIN (VALUES ('alarms_map'), ('profile')) AS p(key)
ON CONFLICT DO NOTHING;

-- 5) Admins get every remaining page explicitly (they also bypass in code).
INSERT INTO role_permissions (role_key, module_key, perm_key)
SELECT r.key, m.key, 'view'
  FROM roles r
  CROSS JOIN modules m
 WHERE r.key IN ('superadmin', 'admin') AND m.type = 'Page'
ON CONFLICT DO NOTHING;
