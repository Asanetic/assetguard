# Test alarms — drill mode (B) + Test filter

No DB migration (uses the existing alarms.source column).

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('test-alarms.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010 gps-3000
```

## Behaviour
- Test alarms are now tagged source='test' (relabelled "… – test", Low).
- DRILL MODE: they stay Open so NOC/field techs can ack them as practice, and AUTO-CLOSE
  after 30 min (offline sweep) so they don't linger.
- They NEVER block real alarms: the raise de-dupe now ignores source='test', so an open
  test alarm of a type can't mask a genuine alarm of the same type on that device.
- They're EXCLUDED from KPIs / the nav badge (alarmCounts) and hidden from the main alarms
  list by default.
- All Alarms has a Real / Test toggle (Test shows the count); the alarms API accepts
  ?test=exclude|only|all (default exclude).

## Files
alarms.js · alarmNotify.js · alarms/route.js · offlineSweep.js · AllAlarms.jsx
