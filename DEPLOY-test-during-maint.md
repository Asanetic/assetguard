# Test alarms during Testing/Maintenance — full behaviour

No DB migration. Restart both (ingest + web).

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('test-during-maint.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010 gps-3000
```

## Behaviour
1. A site OR device under Testing/Maintenance logs EVERY alarm it raises as a test
   (source='test', "… – test", Low) — even if it's also disarmed or muted (testing wins).
2. Test alarms route to the NOC + installers/field techs (role filter: noc | response |
   field | technician | installer).
3. NO STACKING: while an open test alarm of a given kind exists for a device, another test
   of the SAME kind from the SAME device is NOT raised (one open test per device+type).
   Tests are stamped source='test' at insert and de-dupe only against other open tests —
   so a test can neither mask nor be masked by a real alarm (real alarms keep their own
   de-dupe). The manual "Send test alarm" follows the same no-stack rule.

## Files
alarmNotify.js · alarms.js (insertLiveAlarm test path) · ingest/store.js · sites/batch/route.js

## Auto-close (unchanged, included here for completeness)
Test alarms stay Open so NOC/installers can ack them as a drill, but the offline sweep
(runs every 15 min) auto-closes any test alarm older than 30 minutes if not manually closed
— closeStaleTestAlarms(30) in alarms.js, called from offlineSweep.js.
