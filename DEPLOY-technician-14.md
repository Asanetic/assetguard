# Technician backend — round 14

Cumulative. **Supersedes 8–13.** 38 assertions against a real Postgres,
including the regression this round fixes and the one it fixed last round.

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch14.zip').extractall('.')"
    rm -f app/api/apiUtils/ingest/techOnSite.js
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

---

## What I got wrong

I de-duplicated by **returning the existing row untouched**. That looked correct
— one row, no duplicates, your screenshot fixed — and it silently deafened every
device that had one.

Here is the chain, and it is the thing I failed to think through:

1. The wizard polls for an alarm with **`created_at > since`**, where `since` is
   the moment the test started. That is the only way it can tell "the tracker
   answered *this* shake" from "there is an old alarm lying around".
2. My de-dupe returned a row whose `created_at` **never moved**.
3. So for any device with one un-closed test alarm, no report could ever satisfy
   that condition again.

**"No duplicates" became "no alarms."** One un-closed test alarm was enough to
stop that tracker ever passing another test.

### The fix: refresh, never block

The existing row is **updated** — `created_at = now()`, current name and
position — and returned. Both properties hold at once:

- the Tests tab still shows exactly **one row per device and kind**, however many
  uplinks arrive
- that row is always the **latest** report, so the poll finds it, the
  notification fires, and the position shown is current rather than stale

Two details that follow from it:

- An **acknowledged** row goes back to **Open** when the device reports again. It
  is happening again; it should not sit silently.
- A **closed** row is not touched — the next report creates a fresh one. That is
  what makes closing meaningful.

### The test that would have caught it

    == a device is NEVER deafened by its own open test alarm ==
      PASS  still ONE row
      PASS  no duplicate created
      PASS  WIZARD FINDS IT after the refresh
      PASS  created_at moved forward
      PASS  acknowledged row reopens when it recurs
      PASS  closing re-arms: a NEW row is created

I ran it against the old code to confirm it fails there:

      FAIL  WIZARD FINDS IT after the refresh — poll returned null, device is deaf
      FAIL  created_at moved forward

It is in `verify-technician.mjs`, so this specific mistake cannot come back:

    npm install pg && node verify-technician.mjs

## App: Home never leaves a pending job

The rule was written with a guard that defeated it:

    if (job != null && currentRoute != job) { go to job } else { go Home }

Pressing Home **while already inside the wizard** hit `currentRoute == job`, fell
through to the else, and dumped the technician on the front door — the one screen
the rule exists to keep them off.

The guard is gone. If a job is pending, Home goes to that job; if you are already
on it, Home does nothing. **Exit is the only way out of a job.** The pending job
is read from disk, so it survives the app being killed.

Related: a test-alarm notification tap no longer clears the job pointer. Tests is
a detour, not the end of the visit — Home still returns to the wizard afterwards.

## The model (unchanged)

| | REAL | TEST |
| --- | --- | --- |
| **When** | none of the below | device or site status `Testing`/`Maintenance`, an open technician session (matched by site **or** device id), or a drill |
| **Disturbance** | graduated: #1 ignore, #2/#3 early warning, #4 raise | raises on the **first** instance |
| **`alarms.source`** | `'device'` | `'test'`, named `"… – test"`, priority `Low` |
| **Notifications** | SMS, email, escalation | **none** |
| **Control room** | sees it | hidden unless `?test=only\|all` |
| **Repeat reports** | existing rules | **refresh the one open row**, never a new one |

## Files changed this round

| Path | Change |
| --- | --- |
| `apiUtils/dataControl/alarms.js` | **test de-dupe refreshes instead of blocking** |
| `verify-technician.mjs` | the deafening regression test |
| app: `Navigation.kt` | Home never leaves a pending job; Tests detour keeps it |
| everything else | as shipped in round 13 |

## Verifying on the VPS

Park a device in Testing and let it report repeatedly:

    [underTest] DEV-01 site=12 → TEST (device status Testing)
    [test-alarm] DEV-01/DISTURBANCE refreshed ALM-2026-… (no duplicate row)

One row, and its timestamp keeps moving:

    SELECT id, alarm_type, status, created_at FROM alarms
     WHERE device_id = 'DEV-01' AND source = 'test' ORDER BY created_at DESC;

Then run a wizard test on a device that already has an open test alarm — the case
that was broken. It should tick off within a few seconds and the notification
should arrive with it.
