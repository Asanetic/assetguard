# Heartbeats — Fleet availability + Device detail (with the empty-table fix)

No DB migration.

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('heartbeats.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010 gps-3000
```

## Root cause of "No devices"
The per-device query (old AND new) selected `COALESCE(s.name, d.site)`, but the `devices`
table has no `site` column (only `site_id`). That errored the query, and the error was
swallowed into an empty list → "No devices". Fixed to use the joined `s.name` in both the
fleet query and heartbeatDevice.

## Also in this build
- Wake interval active-vs-pending (promotes on the device's ACK; clears pending on final fail).
- Fleet availability = liveness (last_seen ≤ active interval + tolerance), each device by its own interval.
- Interval-based availability % (gap-minus-grace) matching the dashboard.
- Device detail: active/pending interval, expected next, Alive/Offline, received/expected beats per day.

## Files
deviceHeartbeats.js · commandRunner.js · devices/commands/route.js · Heartbeats.jsx · DeviceLogs.jsx

## Update: state filter
The Fleet-availability list now has filter chips — All / Up / Down / Inactive — each with a
live count, so you can slice the fleet and read the numbers. "Up" = seen within its wake
interval + tolerance (each device by its own active interval).
