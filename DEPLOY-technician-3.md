# Technician backend — round 3

Cumulative: includes rounds 1 and 2. **No migration.**

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch3.zip').extractall('.')"
    npm run build
    pm2 restart assetguard-3010 gps-3000

## 1. Why photos were invisible everywhere else

`GET mainapp/media` scoped **every non-admin** to their own captures — a company
manager, NOC user or another technician opening a site got only the photos they
had personally taken. A technician's installation photos were visible to platform
admins and nobody else, which is the opposite of the point of taking them.

The concern behind that rule was real but **narrower than the rule**. It is about
someone paging through EVERYTHING: every site's photos, with GPS fixes and the
name of whoever was standing there. Asking for one named site or device is not
that — you already had to know which site to ask about, and if you can see the
site you can see what was done to it.

So the restriction now applies **only to the unscoped listing**. Pass `site_id`
or `device_id` and you get that subject's photos; ask for the firehose and you
still get only your own.

This is a real widening of who can see site photos. It is the change that makes
the feature work, but if your policy is that only admins ever see them, say so
and I will revert it — the technician app will then be the only place those
photos exist.

## 2. Ack/close now requires a genuine TEST alarm

Round 2 scoped ack/close to alarms raised inside the caller's own session. That
was necessary but **not sufficient**: other things happen while a technician is on
site — a geofence breach, critical motion, a device dropping offline — and the
session window alone would have let a technician close any of them just by having
a job open. That is precisely the power `alarmPerms` withholds.

Both halves are now required: inside their own session **and** a disturbance
(matched against `alarm_type` and `name`, which covers the `DISTURBANCE_TECH`
variant an open session produces). Applied to the list, the open count, and the
ownership gate on ack/close.

## Files

| Path | Change |
| --- | --- |
| `app/api/mainapp/media/route.js` | own-captures rule limited to unscoped listings |
| `app/api/apiUtils/dataControl/media.js` | `device_id` filter |
| `app/api/apiUtils/dataControl/technician.js` | test-alarm queries + disturbance-only gate |
| `app/api/mainapp/technician/test-alarms/route.js` | list + ack/close |
| `app/api/mainapp/sites/options/route.js` | coordinates + filters |
