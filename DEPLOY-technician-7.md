# Technician backend — round 7

Cumulative: includes rounds 1–6. **No new migration** — `technician_devices.sql`
is the same idempotent one from round 5, safe to re-run or skip if already applied.

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch7.zip').extractall('.')"
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

## What this round fixes

**System-generated test alarms never reached the technician's Tests tab.**

The `test_alarm` batch operation added in round 6 works — it raises a genuine
disturbance through the real ingest path. But the technician app could not see
it, because the three queries behind the Tests tab all started from a JOIN:

    FROM alarms a
    JOIN technician_work_sessions s ON <device match> AND <time window>
    WHERE s.technician_id = $1

A drill has no session. Nobody was standing anywhere; somebody pressed a button
on the web. So every drill fell out of the join, and the tab, the badge counter,
and the ack/close gate all agreed it did not exist.

### The change, in three parts

**1. Drills are marked at the source.** `insertLiveAlarm` took a hardcoded
`'device'` for the `source` column; it now takes an optional `source` argument,
and `resolveAndStore(rec, ip, port, { source: "test" })` threads it down from the
batch operation. Everything else still raises as `'device'`.

This is not a new concept — the schema already had `source = 'test'` and the rest
of the codebase already knew what it meant. `listAlarms` hides those rows from
the NOC unless asked (`test=only` / `test=all`), and `hasOpenAlarm`,
`disturbanceDecision` and `alarmCounts` all exclude them. So a drill is now
exactly what a drill should be: a real, ordinary, ackable alarm row that never
lands in the control room's queue, never inflates a KPI, and never suppresses a
real alarm on the same device through the raise de-dupe.

**2. The JOIN becomes a LATERAL.** An alarm now qualifies for the Tests tab by
either route:

    LEFT JOIN LATERAL ( …the technician's session, if there is one… ) s ON TRUE
    WHERE (
      a.source = 'test'                              -- system generated
      OR (s.id IS NOT NULL AND <is a disturbance>)   -- device generated
    )

The session arm still checks **both** halves — inside the window AND actually a
disturbance — because the window alone would let a technician close a real
geofence breach that happened to coincide with their visit. The drill arm needs
no type check: the row exists only because somebody pressed "send test alarm".

Applied identically to `listTechTestAlarms`, `countOpenTechTestAlarms` (the
badge) and `ownsTestAlarm` (the ack/close gate), so the list, the count and the
buttons cannot disagree with each other.

**3. A cheap pre-filter and a 90-day floor** on the two scanning queries, so the
planner narrows `alarms` before evaluating the lateral per row. `ownsTestAlarm`
deliberately has no floor — an old drill must stay closeable.

### A policy call worth knowing about

**Any technician can acknowledge or close a drill.** Nobody owns one: it was
fired from the web, it is invisible to the control room, and the first technician
to see it should be able to clear it. Device-generated test alarms are unchanged
— still only visible to, and closeable by, the technician whose session they were
raised inside.

If you would rather drills were scoped to whoever fired them, that needs a
`raised_by` column on the alarm; say the word and it is a small change.

## Files

| Path | Change |
| --- | --- |
| `app/api/apiUtils/dataControl/alarms.js` | **`insertLiveAlarm` accepts `source`** (defaults `'device'`) |
| `app/api/apiUtils/ingest/store.js` | **`resolveAndStore(rec, ip, port, { source })`**, applied to all three raise sites |
| `app/api/mainapp/devices/batch-ops/route.js` | the `test_alarm` drill now raises with `source: "test"` |
| `app/api/apiUtils/dataControl/technician.js` | **LATERAL + `TEST_ALARM_SCOPE`** across list, count and ownership |
| `db/technician_devices.sql` | unchanged from round 5 (idempotent) |
| the rest | unchanged from rounds 1–6 |

## Verifying

Fire a drill from the web, then open the technician app's Tests tab. The alarm
should appear within twenty seconds (the badge's background poll), labelled
**"Sent as a test from the web"**, with Acknowledge and Close live.

    -- what the tab now sees
    SELECT id, device_id, source, status, created_at
      FROM alarms
     WHERE source = 'test'
     ORDER BY created_at DESC LIMIT 10;

    -- and confirm the control room still does NOT
    -- (listAlarms adds `source IS DISTINCT FROM 'test'` by default)

## Note for the app side

The session is now opened at the **settle** step rather than at the test, and for
**30 minutes** rather than 10. Ten expired part-way through the three-strike
retry ladder, and an expired session stops downgrading — so a retry a technician
had been told to make put a full-severity alarm on the control room's board.
No backend change was needed for either; `MAX_SESSION_MINUTES` is 120.
