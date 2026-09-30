# Technician backend — round 8

Cumulative: includes rounds 1–7.

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch8.zip').extractall('.')"
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/disturb_streak_reset.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

Both SQL files are idempotent. `technician_devices.sql` is unchanged from round 5
— skip it if already applied. **`disturb_streak_reset.sql` is new and matters**;
see §2.

---

## 1. The first disturbance now raises

`DEFAULTS.disturb_streak` **4 → 1**. The graduated rule is gone: one disturbance,
one alarm.

You asked for this because there is no ACSYS integration yet — nothing tells the
system who is legitimately at a site — and waiting for a fourth shake means a
real interference goes unrecorded three times over.

**Know what you have traded.** At 1, wind, a passing lorry and a gate being
opened each raise an alarm and each notifies the escalation chain. That noise is
exactly what the graduated rule existed to filter. When ACSYS lands, restore it
**without a code change**:

    DISTURB_STREAK=4        # in the environment, then pm2 restart

or per device via `devices.config.disturb_streak`.

## 2. Why the SQL file is not optional

`resolveConfig` prefers a device's stored `config.disturb_streak` over the
default. Any device configured while the default was 4 has that 4 saved on it,
and would keep waiting for four shakes no matter what the code says — its test
alarms simply would not come in, with nothing in the log to explain why.

`db/disturb_streak_reset.sql` removes the stored key (and the legacy nested
`config.disturbance.streak`) and leaves every other config value alone. It prints
the count before and after, so you can see what it touched.

## 3. Raise and notify are now separate decisions

This is the part that would have bitten hard, and it is worth understanding.

The tech-on-site branch in `store.js` was written as:

    if (techOnSite && dec.action !== "raise") { …raise without notifying… }

That was correct when the threshold was 4, because a technician's first shake
returned `"skip"`. **With the threshold at 1 it returns `"raise"`** — so the
branch stopped catching technician tests entirely and dropped them into the
normal path, which calls `notifyAlarmRaised`. Every single test alarm would have
paged the NOC. Lowering the threshold alone would have broken the thing the
on-site session exists to protect.

Rewritten so the two questions are asked separately:

    const raise  = techOnSite || dec.action === "raise";
    const notify = raise && !techOnSite;

There is a second reason this matters. While a disturbance alarm is **open**, the
decision is `"event"`, not `"raise"` — no new row. On a retry ladder that means
attempts 2 and 3 write nothing, so a technician told to retest finds no alarm and
a working tracker fails. With a session open, every disturbance now raises its
own row. The log says which is which:

    [disturbance] DEV-01 count=1/1 → RAISED ALM-2026-… (TECH ON SITE — no escalation)
    [disturbance] DEV-01 count=2/1 → RAISED ALM-2026-… (TECH ON SITE — no escalation) [re-raised over an open alarm]

Severity is untouched: the engine still downgrades to Low `DISTURBANCE_TECH`
while a session is open, so these are labelled, not hidden.

## 4. Making sure device-generated alarms actually arrive

Two silent-failure paths in the test poll, both fixed. Both fail as *"the device
never reported"* — indistinguishable from a dead tracker, which is the most
expensive way for this to be wrong.

**The phone's clock.** `since` is stamped on the handset; `created_at` is server
time (deliberately — trackers report wrong clocks). A handset a few seconds fast
makes `created_at > since` false for every alarm the test raises, and that one
technician's phone fails every test it runs, all day. The window is now clamped:

    created_at > GREATEST(
      LEAST($2::timestamptz, now() - interval '5 seconds'),   -- a fast phone can't overshoot
      now() - interval '10 minutes'                            -- a slow one can't reach back
    )

**The device identifier.** Alarms store `device_id || imei`. The app was falling
back to the numeric primary key for a device with no `device_id`, so the poll
searched for `42` while the alarm said the IMEI. Fixed on both sides — the app
now mirrors the server's fallback order, and `findTestAlarm` resolves whichever
of the three it is given.

## 5. Drills send one packet, not four

The `test_alarm` batch op defaulted to 4 bursts to cross the graduated streak.
With the streak gone that would write four telemetry rows and four alarms per
device for a single drill. Now 1 by default, still overridable via `value`.

## Files

| Path | Change |
| --- | --- |
| `app/api/apiUtils/ingest/alarmEngine.js` | **`disturb_streak` 4 → 1**, env-overridable |
| `app/api/apiUtils/ingest/store.js` | **raise and notify decided separately**; tech-on-site re-raises over an open alarm |
| `app/api/apiUtils/dataControl/alarms.js` | threshold defaults follow; comments corrected |
| `app/api/apiUtils/dataControl/technician.js` | **clock-skew clamp + device-id resolution** on the test poll |
| `app/api/mainapp/devices/batch-ops/route.js` | drill sends 1 packet |
| `db/disturb_streak_reset.sql` | **NEW — clears per-device overrides** |
| the rest | unchanged from rounds 1–7 |

## Verifying

Shake a tracker once with a job open. Expect, immediately:

    [disturbance] <device> count=1/1 → RAISED ALM-… (TECH ON SITE — no escalation)

Shake it again without closing that alarm — a second row, marked
`[re-raised over an open alarm]`. No SMS or email for either.

Then shake one with **no** job open: same raise, but `[NOTIFY] firing for …`
follows it. That is the trade in §1, visible in the log.

    -- nothing left overriding the threshold
    SELECT count(*) FROM devices
     WHERE config ? 'disturb_streak' OR config->'disturbance' ? 'streak';
