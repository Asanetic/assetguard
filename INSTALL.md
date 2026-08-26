# Track — device card fields (ADDITIVE)

One new file. Nothing existing is modified.

```
app/api/mainapp/track/live-detail/route.js     NEW
```

## What it does

Returns the same latest-position row `track/live` returns, plus `battery`,
`accuracy`, `loc_source` and `course` — the Battery, Fix source and Accuracy
rows on the app's device card.

## Why a new route instead of widening `track/live`

`track/live` is what the web build calls. Widening it means editing a file the
web depends on; adding a route next to it means the web keeps running the exact
code it runs today. The app asks for `live-detail` first and falls back to
`live` if the server does not have it, so nothing breaks in either direction —
an un-updated server just shows dashes in those three rows.

It is all `SELECT`. No schema change, no writes, no change to any existing file.

## About the earlier zip

`assetguard-backend-track-live.zip` (sent before this) **replaced**
`track/live/route.js`. **Do not apply it** — this supersedes it.

If you already applied it, the web is fine: the response only gained fields, and
extra JSON keys are ignored by the callers. But if you would rather have the
original file back:

```bash
cd /var/www/html/baseapps/assetguard
git diff -- app/api/mainapp/track/live/route.js     # see what changed
git checkout -- app/api/mainapp/track/live/route.js # restore it
```

Then apply this zip instead.

## Install

```bash
cd /var/www/html/baseapps/assetguard && \
python3 -c "import zipfile;zipfile.ZipFile('assetguard-backend-track-detail.zip').extractall('.')" && \
npm run build && pm2 restart assetguard-3010 --update-env && \
sleep 8 && pm2 logs assetguard-3010 --lines 20 --nostream | grep -i "live-detail" || echo clean
```

Check it directly (signed in, from a browser session):

```
/api/mainapp/track/live-detail?device=<device_id>
```

Expect `{"pos":{"lat":…,"lng":…,"speed":…,"at":…,"battery":…,"accuracy":…,"loc_source":"gps","course":…}}`.

`accuracy` and `loc_source` only exist once `telemetry_geo.sql` has run, and
`dataControl/telemetry.js` has a fallback INSERT that writes neither. The route
asks `information_schema` which columns are really present and selects only
those, so on a database without them you get the position fields and nulls
rather than a failed query.
