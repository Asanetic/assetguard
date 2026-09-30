# Region visibility scope — sites, devices, alarms, push

No migration (uses existing users.regions + sites.security_region). Restart BOTH processes.

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('region-scope.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010 gps-3000
```

## What it does
A signed-in user sees only the sites (and their devices + alarms), and receives only the
pushes, for the security regions in their users.regions. Rule:
- platform admin (superadmin/admin) -> sees everything
- a user with NO regions set          -> country-wide, sees everything
- otherwise                           -> limited to their regions (sites.security_region)

Scoped surfaces:
- GET /api/mainapp/sites   — now any SIGNED-IN user may list (was admin-only), region-filtered.
                              Create/edit/delete stay admin-only.
- GET /api/mainapp/devices — region-filtered by each device's site security_region.
- GET /api/mainapp/alarms  — list + counts region-filtered (so the map, All Alarms and the
- GET /api/mainapp/alarms/summary — nav badge count region-filtered.
- PUSH (alarmPush): the response team is pushed Critical alarms only within THEIR region
  (country-wide users cover every region); site contacts + admins unchanged. Union of
  site-contacts + region-covered response users; nobody outside the region.

New shared helper: app/api/apiUtils/authUtils/regionScope.js (getUserRegionScope / regionFilterFor).

## Not scoped (by design, for now)
The admin Dashboard overview KPIs remain unscoped (it's an admin page). Say the word to scope it.

## Files
regionScope.js (new) · sites.js · devices.js · alarms.js · alarmPushTokens.js · alarmPush.js ·
sites/route.js · devices/route.js · alarms/route.js · alarms/summary/route.js
