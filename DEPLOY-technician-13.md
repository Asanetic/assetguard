# Technician backend — round 13

Cumulative. **Supersedes 8–12.** Verified against a real Postgres — 32
assertions, including the exact duplication in your screenshot.

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch13.zip').extractall('.')"
    rm -f app/api/apiUtils/ingest/techOnSite.js
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

---

## Why the same alarm kept repeating

**There were two mechanisms making test alarms, and they did not know about each
other.** Your screenshot is what that looks like.

The one I built (round 10) marks a row `source='test'` **at insert**, which is
what the one-per-device-and-type rule keys on.

The one that already existed — and the one actually firing on your system — lives
in the notify layer. When a **site or device status is Testing/Maintenance**,
`notifyAlarmRaised` reaches back and rewrites the row it was just handed:

    UPDATE alarms SET name = name || ' – test', priority = 'Low', source = 'test'

That is exactly what your rows show: `Disturbance — 00100008 – test`, priority
**Low**. They were inserted as ordinary alarms and relabelled a moment later.

So at insert time `source` was `'device'`, the de-dupe never looked at them, and
every uplink from `001_NairobiHeadquarters_H2` wrote another row — a Disturbance
and a Geofence Violation every ~20 seconds, exactly as pictured.

I did not know that mechanism existed. It is the better signal in one respect —
a device parked in Testing is under test for as long as somebody leaves it that
way, with no session needed — so this round **unifies the two** rather than
picking a side.

### The fix

One decision, made **before** the insert. A device is under test if **any** of:

| | |
| --- | --- |
| device status | `Testing` or `Maintenance` |
| site status | `Testing` or `Maintenance` |
| technician session | open, matched by site **or** by device id |
| drill | `batch-ops` forcing it |

The row is then written as a test from the start — `source='test'`, `" – test"`
suffix, priority `Low`, the platform's existing convention kept byte-identical so
nothing downstream has to learn a second shape — and the one-open-row-per-device-
and-type rule applies to it like any other.

The notify layer's relabel stays as a safety net (it already no-ops on a row
that is correctly labelled) and its routing is untouched: test alarms still go to
NOC and field technicians only.

**Existing duplicates are not cleaned up automatically.** To clear the backlog:

    UPDATE alarms SET status = 'Closed', closed_at = now()
     WHERE source = 'test' AND status <> 'Closed'
       AND created_at < now() - interval '1 hour';

## Verified

`verify-technician.mjs` — 32 assertions against a real Postgres. The new ones
reproduce your screenshot directly:

    == status-driven testing (the duplicate bug) ==
      PASS  device status Testing -> under test
      PASS  site status Maintenance -> under test
      PASS  reason names the site status
      PASS  5 disturbance uplinks -> ONE row
      PASS  5 geofence uplinks -> ONE row
      PASS  labelled "– test" at insert
      PASS  priority Low at insert
      PASS  wizard poll finds the single row

To run it:

    npm install pg && node verify-technician.mjs

## App: one job at a time

Both requests, and they are the same rule.

**You cannot start an installation and a maintenance job together.** A technician
is one person standing in one place. Allowing both meant two open on-site
sessions, two half-finished photo queues, and no way to tell which visit a test
alarm belonged to. Now: the matching Home card becomes **"Resume installation"**,
and the other is dimmed with the reason in its own subtitle — *"Finish or exit
the maintenance job first"*. Dimmed rather than hidden: a card that vanishes
reads as a broken app. The start FABs on the Installations and Maintenance lists
obey the same rule, and send you to the job you actually have open rather than
doing nothing. The guard is in the navigation, not only in the button's enabled
flag — a UI flag is the wrong place for the only copy of a rule.

**Home goes to the job in progress.** It did already, but only for a job started
in the same app session — the flag lived in composition state. It now reads
`JobStore` on disk, so a technician who was force-stopped half-way through an
install is still sent back to it when they tap Home.

## Files changed this round

| Path | Change |
| --- | --- |
| `apiUtils/dataControl/technician.js` | `underTestReason` also checks **device and site status** |
| `apiUtils/dataControl/alarms.js` | test rows get the **`– test` suffix and Low tier at insert** |
| `apiUtils/ingest/store.js` | passes `deviceStatus` into the decision |
| `apiUtils/ingest/siteUnderTest.js` | doc: the three ways to be under test |
| app: `JobState.kt` | `JobStore.inProgress()` |
| app: `MainActivity.kt` | `JobStore.init` before anything composes |
| app: `HomeScreen.kt` | Resume / blocked cards |
| app: `Navigation.kt` | the one-at-a-time guard; Home reads disk |

## Verifying on the VPS

Park a device in Testing and let it report a few times:

    [underTest] DEV-01 site=12 → TEST (device status Testing)
    [disturbance] DEV-01 → TEST ALARM ALM-2026-…
    [test-alarm] DEV-01/DISTURBANCE already open as ALM-2026-… — not duplicated

One row per kind, however many uplinks arrive.

    SELECT device_id, alarm_type, count(*) FROM alarms
     WHERE source='test' AND status <> 'Closed'
     GROUP BY 1,2 HAVING count(*) > 1;

Should return nothing.
