# Group Devices — batch "Set geofence radius"

New batch operation in Group Devices (Monitoring & Alerts): select many devices
and set their geofence radius in one go. Defaults to 100 m. Range 15–500 m,
centred on each device's own site — server-evaluated, so it applies on each
device's next report with no downlink command.

## Deploy (web-only, no migration, no app change)

```bash
cd /var/www/html/baseapps/assetguard
python3 -m zipfile -e batch-geofence.zip .
npm run build
pm2 restart assetguard-3010 --update-env
```

## Files
- `app/api/mainapp/devices/batch-ops/route.js` — new `geofence` op (config merge)
- `app/mainapp/devices/group/components/GroupDevices.jsx` — the op + its input (default 100 m)
