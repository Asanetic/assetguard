# Technician backend — round 16

Cumulative. **Supersedes 8–15.** The disturbance rule changes from counting
packets to measuring persistence over time.

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch16.zip').extractall('.')"
    rm -f app/api/apiUtils/ingest/techOnSite.js
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

No app change — `assetguard-technician.zip` is unchanged from round 15.

---

## The new rule

The clock starts on the first disturbance of an episode (**T0**). What escalates
it is the device **still reporting** at each mark — not how many packets arrive.

| Elapsed since T0 | First packet to cross it | Action |
| --- | --- | --- |
| — | the first disturbance | starts the clock, raises nothing |
| 0 – 60s | any number of packets | **ignored entirely** |
| ≥ 60s | the one that crosses | **Warning 1** — SMS + email, no alarm row |
| ≥ 120s | the one that crosses | **Warning 2** |
| ≥ 180s | the one that crosses | **RAISE** |

Each level fires **once**, on the packet that crosses its mark. Packets inside a
window the device is already in change nothing — which is precisely the point: a
gust that shakes a mast twenty times in forty seconds now produces **nothing at
all**, where the old count rule saw four and raised.

Notification wording is untouched. The warnings still read *"Disturbance warning
1/3"* and *"2/3"*, and the raise notification is unchanged — the decision passes
the old-convention numbers through purely so the messages render identically.

### What resets an episode

Unchanged, and it matters more than it looks: the **latest** of a 30-minute quiet
gap, the last time a disturbance alarm was closed (operator re-arm), or a
simulator cutoff. Without the gap, a device that disturbed this morning would
raise **instantly** on an unrelated bump this afternoon — because that bump is
"past minute three".

### Stateless by design

Nothing about an episode is stored. T0, the previous packet and the reset
boundary are all derived from `device_telemetry` on every evaluation. So the
ladder survives a restart mid-episode, and any decision can be reconstructed
afterwards from the packets themselves — which is what you want when someone asks
why an alarm did or did not fire.

### Tunable without a deploy

Per device via `devices.config`, or globally by environment:

    DISTURB_WARN1_SEC=60
    DISTURB_WARN2_SEC=120
    DISTURB_RAISE_SEC=180
    DISTURB_STREAK_GAP_MIN=30

`disturb_streak` is retained in config for the editor but **no longer used** by
the decision.

## The trade, now live

**Nothing raises for a full three minutes.** A theft finished in ninety seconds
produces Warning 1 and no alarm. You accepted this on the basis that the warning
still goes out — worth restating so nobody is surprised later:

- Warning 1 is an **SMS and email to site contacts**, not a control-room alarm
  row. It does not appear in the alarms list, the map, or the badge.
- Geofence Violation and Critical Motion are **untouched** and still raise at
  full severity immediately, so a unit that is carried or driven off still
  alarms.

**One thing I could not check:** how often your trackers actually report while
being disturbed. If a device uplinks every five minutes, its second packet lands
past all three marks at once and raises with **no warnings sent** — the ladder
collapses to "raise on the second packet". The tests cover this case and it
behaves correctly, but whether 60/120/180 is the right granularity depends on
that cadence. Worth a look:

    SELECT received_at, motion_byte FROM device_telemetry dt
     JOIN devices d ON d.id = dt.device_id
     WHERE d.device_id = 'YOUR-DEVICE'
       AND substr(upper(dt.motion_byte),3,1) = '1'
     ORDER BY received_at DESC LIMIT 20;

If the gaps are minutes rather than seconds, raise the marks with the env vars
above — no code change.

## Verified

Two harnesses in this zip, both against a real Postgres:

    npm install pg
    node verify-disturbance-ladder.mjs    # 14 assertions — the new time ladder
    node verify-technician.mjs            # 39 assertions — test alarms end to end

`verify-disturbance-ladder.mjs` drives real timestamps through the rule:

      PASS  T0 alone -> skip
      PASS  BURST inside the first minute -> still skip
      PASS  first packet past 60s -> warning 1
      PASS  warning wording payload unchanged ("1/3")
      PASS  past 120s -> warning 2
      PASS  past 180s -> RAISE
      PASS  second packet in the same window -> skip
      PASS  another packet after raising -> skip (not a second raise)
      PASS  a single late packet raises without warnings
      PASS  a bump after a quiet hour starts a NEW episode -> skip, NOT raise
      PASS  open alarm -> event
      PASS  closing re-arms: episode restarts from the close
      PASS  drill packets do not drive the real ladder

Two of these failed on the first run and both were **my test fixtures**, not the
code — I had mis-computed the elapsed offsets, and in one case backfilled several
packets before evaluating, which compares the last packet against itself and sees
no crossing. Worth knowing if you extend the file: insert packets in arrival
order and evaluate once per packet, the way ingest does.

## Files changed

| Path | Change |
| --- | --- |
| `apiUtils/ingest/alarmEngine.js` | **time marks replace `disturb_streak`** in the decision |
| `apiUtils/dataControl/alarms.js` | **`disturbanceDecision` rewritten as a time ladder** |
| `apiUtils/ingest/store.js` | passes the marks; logs elapsed time and level |
| `verify-disturbance-ladder.mjs` | NEW |
| everything else | as shipped in round 14 |

Test alarms are **untouched** — still first-instance, still no notification,
still one refreshed row per device and kind.

## What the log looks like now

    [disturbance] DEV-01 +0s (level 0) → skip — nothing due yet; next mark at 60s/120s/180s
    [disturbance] DEV-01 +67s (level 0→1) → EARLY WARNING 1/2 (sms/email, no alarm)
    [disturbance] DEV-01 +131s (level 1→2) → EARLY WARNING 2/2 (sms/email, no alarm)
    [disturbance] DEV-01 +194s (sustained since 2026-08-26T20:41:03Z) → RAISED ALM-2026-…
    [NOTIFY] firing for ALM-2026-… (Disturbance, Critical) site_id=12
