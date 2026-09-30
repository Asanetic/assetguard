# Technician backend — round 2

Includes the earlier `sites/options` change, so this supersedes `sites-options.zip`.
**No migration.**

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch2.zip').extractall('.')"
    npm run build
    pm2 restart assetguard-3010 gps-3000

## Files

| Path | Change |
| --- | --- |
| `app/api/mainapp/technician/test-alarms/route.js` | NEW — list + ack/close, self-scoped |
| `app/api/apiUtils/dataControl/technician.js` | adds the test-alarm queries |
| `app/api/apiUtils/dataControl/media.js` | `listPhotos` accepts `device_id` |
| `app/api/mainapp/media/route.js` | passes `device_id` through |
| `app/api/mainapp/sites/options/route.js` | coordinates + filters (from round 1) |

## The permission decision — please review

`alarmPerms` gives a `field_tech` **neither `canAck` nor `canClose`**, so
`mainapp/alarms/{id}/ack` 403s them. That is correct and I did not change it — a
technician has no business acknowledging the fleet's alarms.

But they do need to clear the alarms they set off themselves, or every install
leaves litter for the control room to identify and tidy.

So `test-alarms` grants exactly that and nothing wider: the alarm id must belong
to one of the **caller's own sessions** or the request is a 404. Ownership is a
SQL join — alarms on that device, inside a window that technician opened, bounded
by `LEAST(COALESCE(closed_at, expires_at), expires_at)` so an alarm raised after
they left is not theirs. `alarmPerms` is untouched; no role gained a capability.

A 404 rather than 403 for someone else's alarm is deliberate: confirming that
`ALM-2026-0081` exists is itself a small leak, and a technician has no legitimate
way to have learned that id.

## Media `device_id`

`listPhotos` now filters by device. The app previously fetched a site's newest 60
photos and matched `device_id` client-side — which silently returned nothing for a
device on a busy site, because 60 photos of other devices filled the page first.
Installation photos are the record of the fitting, so that list has to be complete.

Site placeholders needed no change: media rows already carry `site_id`, and
`ViewSite` already reads them.
