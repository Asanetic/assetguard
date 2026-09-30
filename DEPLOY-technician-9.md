# Technician backend — round 9

Cumulative: includes rounds 1–8. **Supersedes round 8** — do not deploy that one.

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch9.zip').extractall('.')"
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

`technician_devices.sql` is unchanged from round 5 and idempotent — skip if
already applied. **Round 8's `disturb_streak_reset.sql` is withdrawn.** If you
already ran it, no harm done: it cleared per-device overrides back to the
default, and the default is 4 again. Only re-set an override if a specific device
genuinely needs a different number.

---

## The correction

Round 8 lowered `disturb_streak` to 1 globally. That was the wrong lever — it
changed real alarms to fix a test problem. Reverted.

**`disturb_streak` is 4 again, and the graduated rule is untouched:**

    #1        -> ignore
    #2, #3    -> early warning: SMS + email only, no alarm row
    #4        -> raise (+ SMS + email)
    #5+       -> event only while one is open

Wind, a passing lorry and a gate being opened go back to being filtered, exactly
as before. Nothing in the control room's queue changes.

## What a test is, and what it now does

The bypass moved out of the threshold and into `store.js`, where it can ask a
different question rather than set a different number. A test is **exactly two
things**:

| | |
| --- | --- |
| `techOnSite` | An open session in `technician_work_sessions` for this device's site — somebody has declared they are standing at the device shaking it on purpose. |
| `source = 'test'` | A drill fired from the web through batch-ops. |

For those, and only those: **the first disturbance raises, and nobody is
notified.**

    const isTest = techOnSite || alarmSource === "test";
    const raise  = isTest || dec.action === "raise";
    const notify = raise && !isTest;

Two decisions, asked separately, because a test must answer YES to *raise* and NO
to *notify*. The row is the proof the device works and the thing the app polls
for; waking the on-call chain for a technician shaking a tracker they just fitted
is the whole reason the session exists.

The bypass also covers `dec.action === "event"`. While a disturbance alarm is
open the decision is "event", not "raise" — so on a retry ladder attempts 2 and 3
would write nothing and a technician told to retest would find no alarm. During a
test, every disturbance gets its own row.

## Two ways a test was leaking into real behaviour

Both found while making the split. Neither is about tests failing — both are
about a **test quietly weakening a real alarm**, which is the one thing the
bypass must never do.

### 1. Test packets were inflating the real streak counter

The count comes from stored telemetry, and a drill feeds packets through the live
pipeline — so four drills left a device sitting at **3/4**, and the next genuine
bump raised immediately. A technician's deliberate shakes did the same: a visit
handed that site a hair-trigger counter for the rest of the run.

Both are now excluded from the count, and from the run-boundary calculation, by
one predicate applied in both places so they cannot disagree:

    src_ip IS DISTINCT FROM 'batch-test'          -- the drill
    AND NOT EXISTS (…an open session covering this packet's timestamp…)

A technician's shakes are real packets from a real device — but they are not
evidence anybody is interfering with the asset.

### 2. A forgotten test alarm silently disarmed the device

`disturbanceDecision` treated **any** open disturbance alarm as "already raised,
waiting to be closed" → every later report became an event. That included the Low
`DISTURBANCE_TECH` alarm a technician's test leaves behind.

So a technician who finished a job and did not close their test alarm **disarmed
that tracker**: the next genuine interference returned "event" and no Critical
alarm was ever raised. Nothing in the log said so.

The gate is now `alarm_type = 'DISTURBANCE'` only. A Low tech-on-site alarm never
blocks a Critical real one. Drills were already excluded by `source <> 'test'`.

## Kept from round 8

These were test-path fixes and are unaffected by the revert.

- **Clock-skew clamp on the test poll.** `since` is stamped on the handset,
  `created_at` is server time — a phone a few seconds fast failed every test it
  ran, all day, looking exactly like a dead tracker. Window now clamped to
  `GREATEST(LEAST(since, now()-5s), now()-10m)`.
- **Device-identifier resolution.** The app fell back to the numeric primary key
  for a device with no `device_id`, so the poll searched for `42` while the alarm
  carried the IMEI. Fixed both sides.
- **Drills send one packet, not four.** They bypass the streak now, so four
  bursts would write four telemetry rows and four alarms for one drill.

## Files

| Path | Change |
| --- | --- |
| `app/api/apiUtils/ingest/alarmEngine.js` | **`disturb_streak` back to 4**; still `DISTURB_STREAK`-overridable |
| `app/api/apiUtils/ingest/store.js` | **bypass scoped to `techOnSite \|\| source='test'`**; raise and notify decided separately |
| `app/api/apiUtils/dataControl/alarms.js` | **test packets excluded from the real streak**; open `DISTURBANCE_TECH` no longer gates a real raise |
| `app/api/apiUtils/dataControl/technician.js` | clock clamp + device-id resolution (round 8) |
| `app/api/mainapp/devices/batch-ops/route.js` | drill sends 1 packet |
| the rest | unchanged from rounds 1–7 |

## Verifying

**Real alarms — should be exactly as before.** Shake a tracker with no job open
and no drill:

    [disturbance] <device> count=1/4 → skip
    [disturbance] <device> count=2/4 → EARLY WARNING (sms/email, no alarm)
    [disturbance] <device> count=3/4 → EARLY WARNING (sms/email, no alarm)
    [disturbance] <device> count=4/4 → RAISED ALM-…
    [NOTIFY] firing for ALM-… (Disturbance, Critical) site_id=…

**A technician's test — first shake, no escalation:**

    [disturbance] <device> count=1/4 → RAISED ALM-… (TECH ON SITE — test, no escalation)

Shake again without closing it — a second row, `[re-raised over an open alarm]`,
still no `[NOTIFY]`.

**A drill from the web:**

    [disturbance] <device> count=1/4 → RAISED ALM-… (DRILL — test, no escalation)

Then confirm the leak is closed: run a drill four times on a device, and check a
real shake afterwards still starts at `count=1/4`, not `count=5/4`.
