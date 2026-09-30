# Technician backend — round 12

Cumulative. **Supersedes 8–11.** This one is verified against a real Postgres,
not reasoned about — see "Verified" below.

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch12.zip').extractall('.')"
    rm -f app/api/apiUtils/ingest/techOnSite.js
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

---

## The bug: the wizard's poll was throwing on every request

**I wrote invalid SQL in round 8 and shipped it three times.**

    device_id = ANY(SELECT ARRAY[...] || ...)     -- WRONG

`ANY(subquery)` compares a value against a *set of scalars*. That subquery
returns one `text[]`, so Postgres is asked to evaluate `text = text[]` and
throws:

    ERROR:  operator does not exist: text = text[]

`findTestAlarm` is the only thing using that construct. So
`GET mainapp/technician/test-alarm` returned **500 to every poll**, for every
device, for the whole five-minute window. The app swallowed it and kept
counting down.

That explains all three symptoms in one:

| Symptom | Cause |
| --- | --- |
| Wizard never picks up the alarm | the poll route 500s |
| Notification never arrives | it fires from inside that poll |
| Tests screen shows them fine | different query, never touched the bad SQL |

The fix is `ANY(<array expression>)` — drop the `SELECT`:

    device_id = ANY(ARRAY[$1]::text[] || COALESCE((SELECT ARRAY[...] ...), ARRAY[]::text[]))

## Verified, not reasoned about

`verify-technician.mjs` is in this zip. It runs the real functions against a real
Postgres — 24 assertions covering the under-test lookup, test-alarm insert and
de-dupe, **the wizard poll**, the Tests tab, and proof the real path is
unaffected. To run it against a scratch database:

    npm install pg
    node verify-technician.mjs

I confirmed both directions: with the old SQL the poll section dies with
`operator does not exist: text = text[]`; with the fix, 24/24 pass.

I should have been doing this from the start. Everything before this round was
static reading, which is how a syntax-level error survived three drops.

## Also in this round

**The wizard now says when the poll is failing.** Every error was swallowed by
`?: continue`, so a server returning 500 to every request looked exactly like a
silent tracker. After five consecutive failures it now shows the error. That is
what would have made this a two-minute diagnosis.

## About the web app not showing them

Not a bug — `GET /api/mainapp/alarms` **hides `source = 'test'` by default**, on
purpose, so drills and technician tests never land in the control room's queue.
To see them, the web page must pass the parameter:

    /api/mainapp/alarms?test=only     just test alarms
    /api/mainapp/alarms?test=all      real + test together

The route already accepts it (`test: exclude (default) | only | all`). If your
web Test Alarms page shows nothing, it is almost certainly not sending it. No
backend change needed — but say the word and I will write the exact snippet for
that page.

Worth knowing: a test disturbance is priority **Critical**, so the Critical-only
role filter does not hide it. Nothing else filters these out.

## The model (unchanged)

| | REAL | TEST |
| --- | --- | --- |
| **When** | device not covered by an open technician job | device covered by an open job (matched by site **or** device id), or a drill |
| **Disturbance** | graduated: #1 ignore, #2/#3 early warning, #4 raise | raises on the **first** instance |
| **`alarms.source`** | `'device'` | `'test'` |
| **Notifications** | SMS, email, escalation | **none, any alarm type** |
| **Control room** | sees it | hidden unless `?test=only\|all` |
| **Duplicates** | existing rules | one open per device + type |

## Files changed this round

| Path | Change |
| --- | --- |
| `apiUtils/dataControl/technician.js` | **the SQL fix** — both `ANY(...)` sites in `findTestAlarm` |
| `mainapp/technician/test-alarm/route.js` | included for completeness; unchanged logic |
| `verify-technician.mjs` | **NEW** — the harness above |
| everything else | as shipped in round 11 |

## Verifying on the VPS

Fastest check that the fix is live — this used to 500:

    curl -s -H "Authorization: Bearer $TOKEN" \
      "http://localhost:3010/api/mainapp/technician/test-alarm?device_id=DEV-01&since=$(date -u -d '10 minutes ago' +%Y-%m-%dT%H:%M:%SZ)"

`{"alarm":null}` or `{"alarm":{...}}` = fixed.
`{"error":"Failed to check for alarm"}` = still broken; send me the pm2 log line.

Then run a real job: open one, reach the settle step, shake once.

    [underTest] DEV-01 site=(none) → TEST (session 34, matched by device)
    [disturbance] DEV-01 → TEST ALARM ALM-2026-…

The wizard should tick that device off within three seconds and the notification
should arrive with it.
