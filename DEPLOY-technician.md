# Technician backend — phase 4

Drop these into the Next.js project, preserving paths. **One file is a
replacement, not an addition** — see below.

    psql "$DATABASE_URL" -f db/technician.sql

## Files

| Path | New? |
| --- | --- |
| `db/technician.sql` | new — two tables, additive & idempotent |
| `app/api/apiUtils/dataControl/technician.js` | new — data layer |
| `app/api/apiUtils/ingest/techOnSite.js` | **REPLACES the existing inert stub** |
| `app/api/mainapp/technician/session/route.js` | new |
| `app/api/mainapp/technician/test-alarm/route.js` | new |
| `app/api/mainapp/technician/worklog/route.js` | new |
| `app/api/mainapp/technician/worklog/[id]/route.js` | new |

## The spec was wrong about one thing, in your favour

The spec called for a new "test window" concept and a change to the ingest/alarm
path to tag test alarms. **Neither is needed.** The codebase already had the
seam: `apiUtils/ingest/techOnSite.js` was written as a deliberately inert hook
with a note saying wiring it later would be a one-file change. It was, and that
is the only ingest-side edit here.

`store.js` already calls it and passes the result to the alarm engine, which
downgrades a disturbance to the Low `DISTURBANCE_TECH` tier. Nothing in
`store.js`, `alarmEngine.js` or `alarms.js` was touched.

The original note said the signal would eventually come from access control (a
tech badging in). That integration is still worth having and this does not block
it — both answer the same question, and a later version can return true if either
source says so.

## What the downgrade does and does not do

The alarm is **still raised, still recorded, still visible, and still findable by
the app** — which is exactly what the wizard polls for. Only its severity
changes, from a dispatch-worthy tier to Low. Nothing is hidden from the NOC; it
is labelled.

Scope is narrow by construction: the engine consults this hook for DISTURBANCE
only. Geofence violations, critical-motion events and offline alarms are still
raised at full severity during a maintenance window. Someone driving off with the
tracker mid-visit still trips a Critical alarm.

## Two safety decisions worth reviewing

**Sessions expire, hard.** An on-site session downgrades disturbances at that
site. If a technician's phone dies mid-job and nothing closes the session, an
open-ended window would leave that site quietly deaf to real disturbances —
indefinitely, and with nobody noticing. Every session therefore carries an
`expires_at` and the lookup checks it. Ceiling is **120 minutes**
(`MAX_SESSION_MINUTES` in `dataControl/technician.js`); the app asks for ~15.
Opening a session also closes any other one that technician still has open, and
submitting a work log closes theirs — so the expiry is the backstop, not the
mechanism.

**The hook fails closed.** If the lookup throws, it returns `false` — the
disturbance is raised at normal severity. A false alarm someone stands down in
thirty seconds is a recoverable failure; downgrading a real break-in because the
database hiccuped is not.

## Endpoints

    GET  mainapp/technician/session                     -> { session }
    POST mainapp/technician/session                     { action: "open"|"close", site_id, device_id, job_type, minutes }
    GET  mainapp/technician/test-alarm?device_id=&since=&scope=   -> { alarm | null }
    GET  mainapp/technician/worklog?device_id=&site_id=&from=&to=&limit=  -> { entries }
    POST mainapp/technician/worklog                     -> { entry }
    GET  mainapp/technician/worklog/{id}                -> { entry }

**`test-alarm` returns the OLDEST match, not the newest.** The first alarm after
the countdown is the one the technician caused; a later one may be a second shake
or something unrelated, and reporting that would credit the wrong event. A `null`
alarm is a normal answer meaning "not yet, keep polling" — the client owns the
timeout, because only it knows when the countdown started.

`scope=disturbance` (default) matches both `alarm_type` and `name` against
`%disturb%`, which catches the `DISTURBANCE_TECH` variant — the exact case the
wizard creates for itself. Missing that would make every correctly-configured
test look like a failure. `scope=any` accepts any alarm from that device, which
is the honest setting for an installation where what matters is that the device
reported at all.

## Visibility

Non-admins see only their own work-log entries; admins see everything, and may
filter by `technician_id`. Same rule the media route already applies to photos,
for the same reason: these rows carry a named person's GPS position and
movements. The detail route repeats the check and answers **404** rather than 403
for someone else's entry — an id is guessable, and confirming that entry 41
exists is itself a small leak.

`technician_id` on a POST is always taken from the session, never from the body.
A work log whose author can be set by the caller is not a record of anything.

## Not done

No test coverage — the repo has none to extend. The SQL is idempotent, so
re-running it is safe.
