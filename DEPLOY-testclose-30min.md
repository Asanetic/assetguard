# Test alarms close right at 30 minutes

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('testclose-30min.zip').extractall('.')"
ls -l instrumentation.js           # must be at the app root
# if Next < 14.0.4: add  experimental:{ instrumentationHook:true }  to next.config.js
npm run build
pm2 restart assetguard-3010 gps-3000
pm2 logs assetguard-3010 --lines 40 --nostream | grep -iE "instrumentation|offlineSweep"
```

## What changed
- The test-alarm auto-close now runs on its OWN 1-minute timer (not the 15-min offline
  sweep), so any test alarm — acknowledged or not — is Closed within ~1 min of hitting the
  30-minute mark. closeStaleTestAlarms(30) still uses status <> 'Closed', so it closes both
  Open and Acknowledged tests.
- instrumentation.js starts these timers in the always-on web process too, so they run even
  with no device traffic.

## Files
app/api/apiUtils/ingest/offlineSweep.js · instrumentation.js (project root)
