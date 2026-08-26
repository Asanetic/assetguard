# AssetGuard — Group batch operations, FULL (Sites + Devices)

Cumulative bundle. Supersedes `site-controls-full.zip` — it contains all the site work
**plus** the device-parity work in one deploy.

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('assetguard-batch-ops-full.zip').extractall('.')"
psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/sites_control.sql
psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/devices_control.sql
npm run build
pm2 restart assetguard-3010 gps-3000
```
Both migrations are idempotent (safe to re-run). `sites_control.sql` adds sites.armed +
sites.mute_until; `devices_control.sql` adds devices.armed + devices.mute_until.

## Device batch operations — now wired (parity with sites)
- **Assign data bundle plan** / **Assign SIM provider** — saved on the device (config).
- **Arm / Disarm monitoring** — per-device; combined with the site setting, most-restrictive wins.
- **Mute alerts** — per-device, minutes/hours/days; downgrades that device's alarms to Low.
- **Send test ping** — REAL connectivity ping: queues a harmless re-assert of the device's current
  wake interval (no config change); confirms when the device next reports. Opens the command queue.
- **Flag SIM for replacement** — sets a flag (config.sim_replace) on the device.
- **Generate PDF report** — printable device report (id, site, status, battery, firmware, last-seen, flags).
- **Schedule service visit** — left a PLACEHOLDER (field-technician dispatch, future Accyss).

Already-real device ops are unchanged: Change status, motion sensitivity, upload/moving interval,
firmware OTA, wake interval, IP/APN, restart, restore factory, power off, reassign site, sync config,
export CSV, decommission.

## How device + site controls combine
The alarm-notify policy now reads BOTH levels:
- **Disarmed** if the site OR the device is disarmed → alarm recorded, no paging.
- **Muted** if the site OR the device is muted → alarm downgraded to Low.
- **Test** if the site OR the device is Testing/Maintenance → "… – test", Low, NOC + field techs.
A manual "Send test alarm" (sites) still forces test regardless.

## Site batch operations (from the earlier full bundle, included here)
Transfers (region, company=client, cluster, security region, SMPMS, security co, NOC) · Change status
(cascade + roll-up) · Arm/Disarm · Mute (unit) · Send test alarm · Schedule maintenance window
(future start+end) · Sync device configs · Export CSV · Generate PDF · Delete. Only **Request
technician (Accyss)** is a placeholder.

## Files (13)
db/sites_control.sql · db/devices_control.sql · sites.js · devices.js · deviceCommands.js ·
alarmNotify.js · store.js · offlineSweep.js · sites/batch/route.js · devices/batch/route.js ·
devices/commands/route.js · GroupSites.jsx · GroupDevices.jsx
