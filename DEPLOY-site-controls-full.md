# Site batch operations — FULL (Part 1 + Part 2)

This bundle is cumulative — it contains everything from Part 1 plus Part 2, so a
single deploy gives you the complete set. Only **Request technician (Accyss)** stays
a placeholder (by design).

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('site-controls-full.zip').extractall('.')"
psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/sites_control.sql
npm run build
pm2 restart assetguard-3010 gps-3000
```
The migration only adds `sites.armed` + `sites.mute_until` and is idempotent (safe to
re-run if you already ran it for Part 1). No new migration for Part 2 — the maintenance
window and client company live in the existing `sites.details` JSONB.

## Every Site batch operation now
ORGANISE
- Transfer region ✅ · Transfer to another company ✅ (client/owning company) · Transfer response cluster ✅

TRANSFERS
- Security region ✅ · SMPMS vendor ✅ · Security company ✅ · NOC team ✅

MONITORING & ALARMS
- Change status ✅ — Live/Testing/Maintenance, cascades to devices; Inactive/Offline roll up from devices
- Arm monitoring ✅ / Disarm monitoring ✅ — disarm stops paging (alarms still recorded)
- Mute alarms ✅ — minutes/hours/days; downgrades that site's alarms to Low for the window
- Send test alarm ✅ — pick a device (or all) + alarm type (or All types, sent one-by-one); logged as
  "… – test" Low, routed to NOC + field technicians only

MAINTENANCE & FIELD
- Schedule maintenance window ✅ — future start+end; site auto-enters Maintenance for the window
  (its alarms become test alarms) and auto-exits after it ends
- Request technician (Accyss) ⚪ — placeholder for the future Accyss integration
- Sync device configurations ✅ — pushes each device's config (GS/update/UPT) at every selected site; IMEI excluded

DATA & DANGER
- Export selection to CSV ✅ · Generate PDF report ✅ (opens a printable report → Save as PDF) · Delete ✅

## Notes
- PDF report opens in a new tab and triggers the print dialog — choose "Save as PDF". Allow pop-ups.
- Test alarms currently reach Monitoring NOC + Security NOC/response/field roles. When Accyss adds a
  dedicated technician list, point `isTestRole` in `alarmNotify.js` at it.
- "Transfer to another company" sets the site's client company name (details.company.name), preserving
  the rest; update its contacts afterwards if the new company's people differ.

## Files
db/sites_control.sql · sites.js · devices.js · deviceCommands.js · sites/batch/route.js ·
alarmNotify.js · store.js · offlineSweep.js · devices/batch/route.js · GroupSites.jsx
