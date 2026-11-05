# Geofence accuracy for all fixes + fixed 25 h offline window

## 1. Geofence now applies the accuracy cushion to GPS too
Previously only network (Wi-Fi / LBS) fixes required the device to be beyond the
zone by more than the fix's ± blur; a GPS fix used the bare radius. Now EVERY
fix type breaches only when `distance > geofence_radius + accuracy`. A GPS fix
carries accuracy ≈ 10 m, so it gets a ~10 m cushion; a network fix uses its own
(coarser) accuracy as before. Unknown accuracy ⇒ radius only.
(`alarmEngine.js`)

## 2. Device Offline is a FIXED 25 h window, not the reporting interval
Offline now means "not heard from for the offline window (offline_hours, default
24 h) + 1 h grace = 25 h", for every device, no matter how often it reports
(2 h, 6 h, 12 h, 24 h all use the same 25 h). It used to be
`wake_interval + 5 min`, which flagged short-interval devices after a single
miss. Any packet still refreshes last_seen, so a reporting device never trips it.
Per-device `offline_hours` is still honoured (window + 1 h grace).

Aligned in all three places that classify offline so they agree:
- `devices.js` listStaleDevices (the Device Offline alarm + status flip)
- `sites.js` site-status rollup
- `dashboard/route.js` the dashboard live/offline counts

The Heartbeats page prediction still uses the wake interval — that is a
different, finer "late heartbeat" signal and is intentionally unchanged.

## Files
- app/api/apiUtils/ingest/alarmEngine.js
- app/api/apiUtils/dataControl/devices.js
- app/api/apiUtils/dataControl/sites.js
- app/api/mainapp/dashboard/route.js

## Deploy (web-only, no migration) — clean restart, never touches port 9000
```bash
cd /var/www/html/baseapps/assetguard
python3 -m zipfile -e geofence-accuracy-offline-window.zip .
npm run build
pm2 delete all
fuser -k 3000/tcp 3010/tcp; sleep 2
PORT=3000 pm2 start npm --name gps-3000 -- start
PORT=3010 pm2 start npm --name assetguard-3010 -- start
```
(The offline sweep + alarm engine run in the ingest process gps-3000; the
dashboard runs in 3010 — restart both.)
