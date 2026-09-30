# Technician backend — round 11

Cumulative: includes rounds 1–7 and 10. **Supersedes 8, 9 and 10.**

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch11.zip').extractall('.')"
    rm -f app/api/apiUtils/ingest/techOnSite.js
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

`technician_devices.sql` is idempotent — but **it must have been run**, because
this round depends on the `device_ids` column it adds. That is the fix.

---

## Why devices were not raising test alarms

**`isSiteUnderTest` matched on the device's SITE, and a tracker being installed
usually has no site yet.**

`devices.site_id` is nullable. A unit coming out of stock has never been assigned
to one; a preloaded unit is often assigned to a different one. The session is
keyed by site. So:

    device.site_id = NULL
      -> no session matches
      -> underTest = false
      -> alarmSource = 'device'
      -> the graduated rule applies: count 1 of 4 -> skip, no row written
      -> the app polls for five minutes and reports a working tracker as failed

Three shakes, three retries, then "redo the installation" — for a device that was
working perfectly and reporting every time. The failure is invisible from the
outside because the packet arrives, the telemetry row is written, and the log
line is the same one a real first disturbance prints.

**This is exactly the case the whole feature exists for**, and site-only matching
missed it.

### The fix

The session already knows which trackers the visit covers — the app sends
`device_ids` when it opens one. Matching now happens on **either**:

    BY SITE     the device's site has an open job
    BY DEVICE   the device is named in an open session's device_ids

No schema change; `device_ids` has existed since round 5.

### And the second silent failure

If `POST technician/session` failed — no signal at the top of a mast — the app
swallowed it with a `?.let` and carried on. Same outcome: every shake treated as
real, first three discarded, working tracker fails. The app now says so on
screen instead of pretending the test can work.

## Why it took three rounds to find

The log could not tell the two cases apart. A skipped test and a skipped real
disturbance printed the identical line. Fixed — every packet carrying a
disturbance now prints one decisive line **before** anything is decided:

    [underTest] DEV-01 site=12 → TEST (session 34, matched by device)
    [underTest] DEV-01 site=(none) → REAL (no open session for site (none) or device DEV-01)

and a real-path skip now says what it means:

    [disturbance] DEV-01 count=1/4 → skip (no alarm row — needs 4. If you expected
    a TEST alarm, this device is not covered by an open technician session)

`DIAGNOSE.sql` is in this zip: set the device id at the top, run it while a job
is open, and the first block that comes back wrong is the answer.

## The model (unchanged from round 10)

| | REAL | TEST |
| --- | --- | --- |
| **When** | any device not covered by an open technician job | device covered by an open job, or a drill from batch-ops |
| **Disturbance rule** | graduated: #1 ignore, #2/#3 early warning, #4 raise | raises on the **first** instance |
| **`alarms.source`** | `'device'` | `'test'` |
| **Notifications** | SMS, email, escalation | **none, for any alarm type** |
| **Control room sees it** | yes | no — `listAlarms` and the KPI counts exclude `source='test'` |
| **Duplicates** | one open per device+type, per the existing rules | one open per device+type |
| **Who can ack/close** | the fleet's own permissions | any technician, from the Tests tab |

While a device is under test, **every** alarm from it is a test — the geofence
trip from carrying it to the van, the offline blip from cutting its power, not
just the disturbance. Real alarm logic is untouched: `disturb_streak` is 4 and
`disturbanceDecision` is unchanged.

## Files changed this round

| Path | Change |
| --- | --- |
| `app/api/apiUtils/dataControl/technician.js` | **NEW `underTestReason()`** — matches by site OR device, and returns *why* |
| `app/api/apiUtils/ingest/siteUnderTest.js` | takes `{siteId, deviceIdText}`; returns a reason, not a boolean |
| `app/api/apiUtils/ingest/store.js` | **`[underTest]` diagnostic line**; skip message says what it means |
| everything else | as shipped in round 10 |

### Every backend file this feature touches, across all rounds

| Path | Why it is in scope |
| --- | --- |
| `apiUtils/ingest/store.js` | the pipeline — decides real vs test, raises, notifies |
| `apiUtils/ingest/siteUnderTest.js` | the under-test lookup (replaces `techOnSite.js`) |
| `apiUtils/ingest/alarmEngine.js` | what happened; **no knowledge of tests** |
| `apiUtils/dataControl/alarms.js` | `insertLiveAlarm` (source, test de-dupe), `disturbanceDecision` (real only) |
| `apiUtils/dataControl/technician.js` | sessions, the under-test lookup, the test-alarm poll, the Tests tab queries, the work log |
| `apiUtils/dataControl/media.js` | photo listing scope |
| `mainapp/technician/session/route.js` | open/close the on-site window |
| `mainapp/technician/test-alarms/route.js` | the Tests tab: list, ack, close |
| `mainapp/technician/worklog/route.js` + `[id]` | the work log; closes the session on submit |
| `mainapp/devices/batch-ops/route.js` | the `test_alarm` drill |
| `mainapp/media/route.js` | device/site photo filter |
| `mainapp/sites/options/route.js` | site list with coordinates for the wizard |
| `db/technician.sql`, `db/technician_devices.sql` | the two tables and the `device_ids` column |

**Deleted:** `apiUtils/ingest/techOnSite.js` — `extractall` will not remove it,
hence the `rm` above.

## Verifying the fix

Open a job on a device with **no site assigned**, reach the settle step, shake
once. Expect:

    [underTest] <device> site=(none) → TEST (session N, matched by device)
    [disturbance] <device> → TEST ALARM ALM-…

No `[NOTIFY]`. The alarm appears in the Tests tab within twenty seconds.

Then close the job and shake the same tracker: it should be back on the real
ladder at `count=1/4`.
