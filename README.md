# Alarm push — round 5

Cumulative. **Supersedes rounds 1–4** — re-extracting is safe.

## Round 5: the route was lying to both apps

Both Android apps decode `{ registered }` from this route and log a warning when
it is false:

    the server did not register this device — is db/push_tokens.sql applied?

**The route never sent that field.** So the default `false` was decoded on every
launch and that line was printed every time — while the write had in fact
succeeded, and while naming a table this route does not even write. A log line
that sends somebody to the wrong table is worse than no log line, and given how
long we spent on `push_tokens` vs `technician_push_tokens`, it very likely cost
real time.

The route now returns `{ ok, registered, app, named }`.

Patched copies of both apps' `PushTokens.kt` ship alongside this zip. Neither is
required — see below — but both are worth taking.

## Round 4 undoes a mistake I made in round 2

**`db/push_app_backfill.sql` caused the bug you reported.** It is deleted, and
the assumption behind it is removed from the code.

The technician app has **always** sent `"app" to "technician"` — it is right
there in its `PushTokens.register()` and `onNewToken()`. My backfill assumed any
row reading `'technician'` was the column default rather than a value a client
had deliberately set, and retagged it by role. Your account is a superadmin, so
your correctly-labelled technician handset was relabelled `'admin'` — and an
admin handset receives real alarms. That is exactly what you saw, and it started
when round 2 was deployed.

The register route's role inference had the same flaw and is gone too. **There
is no guessing left anywhere in this path.**

### What replaces it

Nothing needs to guess. Two of the three apps already name themselves:

| app | sends `app` | since |
| --- | --- | --- |
| AssetGuard Tech | `"technician"` | always |
| AssetGuard Response | `"response"` | last app build |
| AssetGuard (admin) | — nothing | — |

So an install that sends nothing **is** the admin app. That is a fact, not an
inference. `savePushToken`'s default changes from `"technician"` to `"admin"`,
which is the one value it could never legitimately be.

### You still do not need to ship an app build

The technician app already does the right thing, and `savePushToken` updates
`app` on conflict — so **the label corrects itself the next time each app is
opened.** Proven against a live database, starting from a row my backfill had
mislabelled:

    BEFORE  app=admin        (my backfill mislabelled it)
      real Critical reaches the technician handset: YES — this is the bug you saw

    AFTER   app=technician   (the app re-registered and corrected itself)
      real Critical reaches the technician handset: no — fixed

So: deploy this, then **open the technician app once** on each handset. Nothing
else.

The admin app one-liner (`"app" to "admin"`) is **optional** — the default covers
it correctly. It ships patched anyway, because "an unnamed install is the admin
app" is true today and stops being true the day a fourth app appears.

Both patched files also correct the stale `push_tokens.sql` reference in that
warning to `technician_push_tokens.sql`.

---

Round 1 fixed two breaks that left alarm push delivering to nobody. Round 2 adds
the rule you asked for: **each app is told only what it is for.**

| | real alarms | test alarms |
| --- | --- | --- |
| **AssetGuard** (admin) | ✅ all priorities | ❌ |
| **AssetGuard Response** | ✅ **Critical only** | ❌ |
| **AssetGuard Tech** | ❌ | ✅ (its own path, unchanged) |

---

## Deploy

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('alarm-push-backend.zip').extractall('.')"
    rm -f db/push_app_backfill.sql
    python3 apply-push-hook.py
    npm run build
    pm2 restart assetguard-3010

**No SQL this time.** Delete `db/push_app_backfill.sql` if round 2 left it on the
box — do NOT run it again. `apply-push-hook.py` is idempotent and prints
*"Already applied"* if you ran it before.

Then open the technician app once on each handset so it re-registers. Check:

    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -c \
      "SELECT u.name, u.role, t.app, t.last_seen_at \
         FROM technician_push_tokens t JOIN users u ON u.id::text = t.user_id \
        WHERE t.disabled_at IS NULL ORDER BY t.last_seen_at DESC;"

### Rollback

    rm app/api/apiUtils/dataControl/alarmPushTokens.js
    git checkout app/api/apiUtils/notify/alarmPush.js \
                 app/api/apiUtils/notify/pushSend.js \
                 app/api/apiUtils/dataControl/push.js \
                 app/api/mainapp/push/register/route.js
    cp app/api/apiUtils/dataControl/alarms.js.bak app/api/apiUtils/dataControl/alarms.js
    npm run build && pm2 restart assetguard-3010

The `app` column values are harmless if you roll back — nothing else reads them.

---

## Round 1, still true

Alarm push was **not delivering to anybody**. Two independent breaks:

1. **Nothing called `pushAlarmRaised`** — `apply-push-hook.py` had not been run
   against the deployed `alarms.js` (no `function raised(row)` in it).
2. **Nothing wrote the table it read.** `pushAlarmRaised` →
   `pushTokens.js tokensForSiteAlarm` → **`push_tokens`**, but
   `mainapp/push/register` → `push.js savePushToken` →
   **`technician_push_tokens`**. `registerPushToken` has no caller anywhere.

`pushTokens.js` and `push_tokens` are still **left completely alone** — your own
`technician_push_tokens.sql` records that `push_tokens` was "created by
something outside this codebase".

---

## How the split works

**Real alarms** — `alarmPush.js` → `alarmPushTokens.tokensForAlarm`:

```sql
AND p.app IS DISTINCT FROM 'technician'
```

A technician standing at a mast does not need every disturbance on the estate on
their lock screen. An app that buzzes about work that is not yours is an app
whose notifications get switched off — **including the test alarms it does
need.**

**Test alarms** never reach `alarmPush` at all. It now returns early:

```js
if (String(alarm?.source || "") === "test") return { skipped: "test alarm" };
```

They already have their own path — `store.js` → `testAlarmPush.js` →
`pushSend.js` → the technician whose wizard covers that device. Without the
guard, the same shake reached the control room and every responder, which is
exactly what marking it a test was meant to prevent: `listAlarms` hides these
from the alarm list by default, so people would have been paged about an alarm
they then could not find.

**And test push is now technician-only.** `pushToUsers` passes
`{ app: "technician" }`. A person signed into both apps on one handset has a row
for each, and a test they are running must buzz the app they are running it
from — not the one that is supposed to mean a real incident.

`tokensForUsers(ids, { app })` is **additive with a default of no filter**, so
every existing caller behaves exactly as before.

---

## Which app is which

`technician_push_tokens.app` is set by the client. `savePushToken` updates it on
every registration, so a handset's label is never more than one app-launch stale.

| the client sends | stored as | `named` |
| --- | --- | --- |
| `technician` / `response` / `admin` | as sent | true |
| nothing, or anything unrecognised | `admin` | false |

The route echoes it back, so a handset can check itself:

    POST /api/mainapp/push/register  ->  { "ok": true, "app": "technician", "named": true }

An unnamed install is logged — not as a warning, because it is the expected
admin case, but so that a fourth app forgetting to name itself is on the record
rather than a mystery:

    pm2 logs assetguard-3010 | grep "did not name itself"

---

## Files

| Path | |
| --- | --- |
| `apiUtils/dataControl/alarmPushTokens.js` | **new** — recipient query for real alarms |
| `apiUtils/notify/alarmPush.js` | edited — skip test alarms; use the new module |
| `apiUtils/notify/pushSend.js` | edited, 1 line — test push is technician-only |
| `apiUtils/dataControl/push.js` | edited, 1 optional param — `tokensForUsers(ids, {app})` |
| `mainapp/push/register/route.js` | edited — trust the client, default to admin, echo it back |
| `apiUtils/dataControl/push.js` | `savePushToken` default `technician` → `admin` |

`alarms.js` is **not** in the zip. The hook belongs to `apply-push-hook.py`,
which scopes the edit to `insertLiveAlarm` — `return rows[0] || null;` appears
six times in that file and four must not be touched.

---

## Verified

Against live PostgreSQL 16 with your `db/schema.sql` and
`db/technician_push_tokens.sql`, eight seeded users and seven tokens across
three apps — including **Rita, who holds both the response and technician apps**:

    Critical REAL alarm -> 5 device(s)
       adm-1  Ada Admin        Administrator
       adm-2  Sam Contact      Site contact
       rsp-3  Rita Responder   Response team
       rsp-4  Sec Regional     Response team
       rsp-6  Contact+Resp     Response team

    Low REAL alarm -> 2 device(s)
       adm-1  Ada Admin        Administrator
       adm-2  Sam Contact      Site contact

    TEST alarm -> tec-3, tec-8

      PASS  no technician-app token is ever reached by a real alarm
      PASS  no admin or response token is ever reached by a test alarm
      PASS  Rita holds BOTH apps — a real alarm reaches rsp-3 only,
              a test alarm reaches tec-3 only
      PASS  the response team gets Critical and nothing lower
      PASS  a Suspended user is never pushed
      PASS  a site contact who is also a responder is de-duped to one buzz
      PASS  tokensForUsers with no filter still returns everything (no caller broken)
      PASS  a mislabelled row corrects itself when the app re-registers, and the
              handset stops receiving real alarms in the same step
      PASS  appFor() — 'technician'/'response'/'admin' believed verbatim,
              case and whitespace tolerated; anything else -> admin, named:false
      PASS  apply-push-hook.py still applies cleanly to the live alarms.js
      PASS  all five JS files parse as ES modules; every relative import resolves

**Not verified:** the FCM send itself — that needs the real service account and
a handset. Everything that decides *who* is proven; the HTTP call to Google is
not, and that half was already working for technician test alarms.

---

## Test it on the box

    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -c \
      "SELECT u.name, u.role, t.app, left(t.token,10) \
         FROM technician_push_tokens t JOIN users u ON u.id::text = t.user_id \
        WHERE t.disabled_at IS NULL ORDER BY t.app, u.name;"

Then:

1. **Critical on a real device** → admin handsets **and** responder handsets.
   Technician handsets stay quiet.
2. **Low Battery** → admin handsets only.
3. **A drill / test alarm** → the technician running that job. Nobody else.
4. `pm2 logs assetguard-3010`:

       [push] alarm ALM-1043 (Disturbance) → 5/5 device(s) for Athi River Plant

   For a test alarm you should see **no** `[push] alarm …` line from
   `alarmPush` at all — only the technician push. That absence is the fix
   working.
