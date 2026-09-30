# Technician backend — round 6

Cumulative: includes rounds 1–5. **One migration** (same as round 5 — safe to
re-run, it is idempotent).

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch6.zip').extractall('.')"
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

## 1. Why test alarms were not being raised

Not a bug — a **policy collision**, and finding it explains the whole symptom.

The disturbance rule is deliberately graduated (`disturb_streak: 4`):

- disturbance #1 → **ignored**
- #2 and #3 → early-warning SMS/email, **no alarm row**
- #4 → alarm raised

That is right for a live site. One bump is wind, a lorry, a gate. Four in a
window means something is really happening.

It is exactly wrong for a test. A technician shakes a tracker once, the engine
files it as #1 and writes nothing, and the app polls a table that will never
have a row in it. **A perfectly working tracker failed its own test**, three
times, and then told the technician to refit it.

### The change

`apiUtils/ingest/store.js` — while a technician's on-site session is open, the
FIRST disturbance raises immediately, bypassing the streak.

The session is what distinguishes the two cases: somebody has declared they are
standing at that device doing this on purpose. The alarm is already downgraded to
the Low `DISTURBANCE_TECH` tier by the same session, so raising it immediately
costs the control room nothing — and `notifyAlarmRaised` is deliberately NOT
called on this path, because waking the escalation chain for a technician testing
their own work is the thing the session exists to prevent.

## 2. Batch operation: send test alarms

`POST mainapp/devices/batch-ops { ids, op: "test_alarm", value?: 4 }`

Raises a genuine disturbance on each selected device by feeding a disturbance
packet through the **same parse → resolve → store path a real tracker uses**.
Nothing is faked at the alarm layer: the engine decides, the row is ordinary, and
the technician app receives it exactly as it would a real shake. Good for drills
and for training someone who is not standing at a mast.

It sends the whole streak (default 4, capped at 6) precisely because of §1 — off
site there is no session to bypass the graduated rule, so a drill has to look
like a device genuinely being interfered with.

The response says what actually happened rather than claiming a flat count: the
engine still decides, and a muted, inactive or unregistered device may raise
nothing. The device lookup now joins `sites` so the simulated packet reports from
where the device actually is.

## 3. Also in this drop (from round 5)

`technician_work_sessions.device_ids` — a visit covers several trackers, and the
test-alarm queries joined on a single `device_id`, so on a four-device visit only
the first device's alarms were visible to the technician. See round 5's notes.

## Files

| Path | Change |
| --- | --- |
| `db/technician_devices.sql` | `device_ids` column, backfill, GIN index |
| `app/api/apiUtils/ingest/store.js` | **first disturbance raises while a tech is on site** |
| `app/api/mainapp/devices/batch-ops/route.js` | **new `test_alarm` op**; device lookup joins sites |
| `app/api/apiUtils/dataControl/technician.js` | session stores the device list; joins match ANY |
| `app/api/mainapp/technician/session/route.js` | accepts `device_ids` |
| the rest | unchanged from rounds 1–4 |

## Verifying

Open a job in the app, start a test, shake once. The log should show:

    [disturbance] <device> count=1/4 → TECH ON SITE, RAISED IMMEDIATELY ALM-…

And from the web, a drill on a few devices:

    curl -X POST -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
      -d '{"ids":[1,2],"op":"test_alarm"}' \
      http://localhost:3010/api/mainapp/devices/batch-ops
