# Technician backend — round 10

Cumulative: includes rounds 1–7. **Supersedes rounds 8 and 9** — do not deploy
those. This is the rewrite around the model you described.

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch10.zip').extractall('.')"
    rm -f app/api/apiUtils/ingest/techOnSite.js
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

**The `rm` matters.** `techOnSite.js` is replaced by `siteUnderTest.js`, and
`extractall` overwrites but never deletes. Nothing imports the old file, so
leaving it is harmless — but it will read as live code to the next person.

Round 8's `disturb_streak_reset.sql` is withdrawn. Running it was harmless.

---

## The model, in one line

**While a technician has a job open on a site, nothing that site reports is
real. It is all test alarms.**

Not a downgrade. Not a lower threshold. A different *kind* of row.

## What I had wrong

I kept treating "technician on site" as a question about **severity** — the old
`techOnSite` hook downgraded a disturbance to a Low "tech on site" tier and left
it a real alarm in every other respect. That produced a category nobody asked
for: half-real alarms sitting in the live queue at a tier that means "ignore me",
still counted, still de-duping against real alarms, still capable of gating one.

Then I made it worse by lowering `disturb_streak` globally to fix a test problem,
which changed real alarms for every site on the platform.

Both are gone.

## Real alarms

**Untouched. Byte for byte the rule you already had.**

    #1        -> ignore
    #2, #3    -> early warning: SMS + email only, no alarm row
    #4        -> raise (+ SMS + email)
    #5+       -> event only while one is open

`disturb_streak` is 4. `disturbanceDecision` is unchanged. The engine is
unchanged except that it no longer takes a `techOnSite` flag — it decides what
happened, full stop, and has no idea tests exist.

## Test alarms

A site is **under test** when a technician has an open session on it
(`technician_work_sessions`, expiring after 30 minutes). While that is true:

**1. Every alarm from every device at that site is written `source = 'test'.'**
Not just disturbances. The geofence trip from carrying a unit to the van, the
offline blip from cutting its power — all of it is testing, none of it is an
incident. The platform already understands `source = 'test'`: hidden from the
control room's queue, out of the KPI counts, ignored by the real de-dupe.

**2. Nobody is notified.** No SMS, no email, no escalation, for any alarm type.
Sending a response team to a site somebody is booked to be working on is the
failure this exists to prevent.

**3. A disturbance raises on the FIRST instance.** It does not walk the ladder —
it skips it entirely, because the ladder exists to answer "is somebody
interfering with this asset?" and we already know the answer is no. Under the
old rule a technician's first three shakes produced nothing, so a perfectly good
tracker failed its own test.

**4. One test alarm per device per kind.** A test is a yes/no question and it is
answered the first time. Without this a technician shaking a unit for thirty
seconds while it uplinks every ten produces three identical rows to close by
hand, and a drill on twenty devices fills the tab with noise. Scoped to *open*
rows, so closing one re-arms it for the next visit, and a geofence test still
lands beside a disturbance test.

A drill fired from the web (`batch-ops`, `op: "test_alarm"`) is the same thing by
a different door: it forces `source = 'test'` on its own.

### The one place de-duplication needed catching

De-duplicating means a retry produces no *new* row, and the app's poll asks for
alarms newer than the retry's start time — so a retest would find nothing and
send the technician back to refit a working device. `findTestAlarm` now falls
back to the open test alarm for that device. That is not a fudge: the question is
"did this device report?", and the row is the evidence that it did.

## Consequences worth being explicit about

- **A site under test is a blind spot.** A real theft during a maintenance window
  is filed as a test and nobody is paged. That is what you asked for and it is
  defensible — somebody is standing there — but it is real, and the session's
  30-minute expiry is the only thing bounding it. The session closes as soon as
  the work log lands.
- **`isSiteUnderTest` fails closed.** If the lookup errors, the answer is "not
  under test" — a real alarm somebody stands down in thirty seconds, rather than
  a genuine break-in filed as a test because the database hiccuped.
- **This is not ACSYS.** The old hook was written expecting site access control
  to supply this signal, and this does not stand in for it: access control
  answers "is this person authorised to be here", a different question with
  different consequences. When it lands it deserves its own hook.
- **`DISTURBANCE_TECH` is no longer produced.** The constant and its name/priority
  mapping stay so historical rows still render. Any that are open will keep
  gating real disturbances on that device until closed — worth clearing:

      SELECT id, device_id, created_at FROM alarms
       WHERE alarm_type = 'DISTURBANCE_TECH' AND status <> 'Closed';

## Also simplified

The Tests tab's three queries were a LATERAL join reconstructing "was a
technician there when this happened?" plus a text match to make sure it was a
disturbance and not a real geofence breach that coincided with the visit. All of
it collapsed to:

    a.source = 'test'

The row already knows. Not scoped to one technician, deliberately — a test alarm
belongs to nobody, and whoever opens the tab should be able to clear it. Nothing
real can appear there, so there is nothing to leak.

## Kept from round 8 (test-path only)

- **Clock-skew clamp on the poll.** `since` is stamped on the handset,
  `created_at` is server time — a phone a few seconds fast failed every test it
  ran, all day, looking exactly like a dead tracker.
- **Device-identifier resolution.** The app fell back to the numeric primary key
  for a device with no `device_id`, so the poll searched for `42` while the alarm
  carried the IMEI. Fixed both sides.
- **Drills send one packet, not four.**

## Files

| Path | Change |
| --- | --- |
| `app/api/apiUtils/ingest/siteUnderTest.js` | **NEW — replaces `techOnSite.js`** |
| `app/api/apiUtils/ingest/techOnSite.js` | **DELETE by hand** (see the `rm` above) |
| `app/api/apiUtils/ingest/alarmEngine.js` | no longer takes a `techOnSite` flag; stops producing `DISTURBANCE_TECH`; `disturb_streak` back to 4 |
| `app/api/apiUtils/ingest/store.js` | **site under test → `source='test'` on every alarm, no notifications**; real path restored verbatim |
| `app/api/apiUtils/dataControl/alarms.js` | **one open test alarm per device per kind**; `disturbanceDecision` restored |
| `app/api/apiUtils/dataControl/technician.js` | Tests scope collapsed to `source='test'`; poll fallback for de-duplicated retries |
| `app/api/mainapp/technician/test-alarms/route.js` | ack/close gated on "is a test alarm", not on ownership |
| the rest | unchanged from rounds 1–7 |

## Verifying

**Real alarms — no job open, no drill.** Shake a tracker four times:

    [disturbance] <device> count=1/4 → skip
    [disturbance] <device> count=2/4 → EARLY WARNING (sms/email, no alarm)
    [disturbance] <device> count=3/4 → EARLY WARNING (sms/email, no alarm)
    [disturbance] <device> count=4/4 → RAISED ALM-…
    [NOTIFY] firing for ALM-… (Disturbance, Critical) site_id=…

**A technician's test.** Open a job, reach the settle step, shake once:

    [disturbance] <device> → TEST ALARM ALM-…

No `[NOTIFY]`. Shake again:

    [test-alarm] <device>/DISTURBANCE already open as ALM-… — not duplicated

**A geofence trip during a job** — carry a tracker off site with the job open:

    [alarm] GEOFENCE_EXIT → TEST ALARM ALM-… (site under test — no notification)

**Confirm the real path is clean afterwards.** Close the job, then shake the same
tracker: it should start at `count=1/4` again, not carry the test's count.

    -- test alarms, and nothing real among them
    SELECT id, device_id, alarm_type, source, status FROM alarms
     WHERE source = 'test' ORDER BY created_at DESC LIMIT 20;
