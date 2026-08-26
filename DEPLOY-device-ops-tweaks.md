# Group Devices — operation tweaks

Small UI/logic patch on top of the full batch-ops bundle. No DB migration.

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('device-ops-tweaks.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010
```

## Changes
1. Flag SIM for replacement — REMOVED (UI + backend op).
2. Assign Data Bundle — unchanged.
3. Assign SIM Provider — unchanged behaviour; icon → ti-device-sim.
4. Removed the DUPLICATE Set motion sensitivity from Monitoring & Alerts
   (the HQ one under Remote Commands stays).
5. Removed Set upload interval from Monitoring & Alerts
   (Set moving interval under Remote Commands stays).
6. Schedule service visit — logic removed; the button stays (dimmed, "(soon)")
   for future field/Accyss integration and does nothing when clicked.

## Files
app/mainapp/devices/group/components/GroupDevices.jsx
app/api/mainapp/devices/batch/route.js
