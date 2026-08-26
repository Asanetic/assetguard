# Device defaults + View-device wiring

No DB migration (config lives in devices.config JSONB).

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('device-defaults.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010 gps-3000
```

## Changes
Add device / import defaults (canonical FLAT config keys the engine + sync read):
- initial status Testing · geofence_radius_m 30 · motion_sensitivity 30 · upload_interval_s 3 (moving)
- NEW: wake_interval_sec 86400 (24 h) — added a Wake-up interval picker on Add Device
- Same defaults applied to IMPORTED devices (new rows; existing configs preserved, null configs backfilled)

View device:
- Geofence drawn as a blue circle on the map (reads the flat geofence_radius_m, default 30)
- Removed the "Live maps" label on the map
- Added an editable Wake-up interval in Device details — saving queues a UPT command; the interval
  becomes active only when the device confirms (shows "→ pending" until then)
- Wired Send test ping (real connectivity ping) and Mute alerts (pick minutes/hours/days + Unmute)
- Fixed motion display "/100" → "/50"; relabelled Upload → Moving interval

Note: the geofence config key was NESTED (geofence.radius_m) but the alarm engine reads FLAT
(geofence_radius_m) — so the UI setting never reached the engine. Now both Add and View write the
flat key. Existing devices adopt it the next time their details are saved.

## Files
devices.js · AddDevice.jsx · ViewDevice.jsx
