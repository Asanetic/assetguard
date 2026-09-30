# Technician backend — round 17

Cumulative. **Supersedes 8–16.** Adds FCM push. **Read `FCM-SETUP.md` first** —
two artefacts have to come from you before push can work.

    cd /var/www/html/baseapps/assetguard
    python3 -c "import zipfile; zipfile.ZipFile('tech-patch17.zip').extractall('.')"
    rm -f app/api/apiUtils/ingest/techOnSite.js
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
    psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_push_tokens.sql
    npm run build
    pm2 restart assetguard-3010 gps-3000

`db/technician_push_tokens.sql` is new and idempotent. Without the FCM credentials the app
and backend behave exactly as they did in round 16 — push is a no-op, not an
error.

---

## Why this was needed

The old notification was **local**: posted by the app's own polling loop, inside
the app's own process. That meant:

| | Old (local) | New (push) |
| --- | --- | --- |
| App open | ✅ | ✅ |
| Backgrounded, phone in use | ✅ | ✅ |
| **Phone locked in a pocket** | ❌ Doze suspends the poll | ✅ |
| **App swiped away or killed** | ❌ nothing, ever | ✅ |

Which matters because the workflow puts the phone in a pocket by design: 3½
minutes of settling, then a 5-minute test.

The app also **claimed** more than it delivered — the wizard said *"you can put
the phone away and carry on"*. That copy is corrected in the app build regardless
of whether you set up Firebase.

## What is pushed

Only **test alarms**, only to technicians with an **open session covering that
device** (matched by site or by the session's device list). Real alarms still go
through the existing escalation chain untouched. A web-fired drill has no session
so it pushes to nobody — it appears in the Tests tab, where whoever fired it is
already looking.

## Verified

    node verify-technician.mjs           # 39 assertions
    node verify-disturbance-ladder.mjs   # 14 assertions

Plus, for this round specifically, run against a real Postgres and a throwaway
RSA key:

      PASS  JWT signature verifies against the public key
      PASS  claims aud / exp are well-formed
      PASS  unconfigured push is a clean no-op, not a throw
      PASS  two handsets for one technician
      PASS  shared handset REASSIGNS, not duplicates
      PASS  a dead token is not pushed to
      PASS  re-registering revives it
      PASS  recipient found by device id
      PASS  recipient found by site
      PASS  no session -> no recipient

**What is NOT verified:** the actual send. That needs real Firebase credentials
and a real handset, which do not exist here. The JWT assembly, token caching,
recipient targeting, token lifecycle and the unconfigured no-op are all proven;
the HTTP call to Google is not. Expect to shake out the setup itself rather than
the code — most first-time FCM failures are a package-name or SHA-1 mismatch,
which is why `FCM-SETUP.md` leads with those.

## Files added

| Path | |
| --- | --- |
| `db/technician_push_tokens.sql` | the token table |
| `apiUtils/dataControl/push.js` | token store + recipient targeting |
| `apiUtils/notify/pushSend.js` | FCM HTTP v1: JWT → OAuth token → send |
| `apiUtils/notify/testAlarmPush.js` | the hook, fire-and-forget |
| `mainapp/push/register/route.js` | POST register / DELETE unregister |
| `apiUtils/ingest/store.js` | calls the hook when a test alarm lands |

## App side

| Path | |
| --- | --- |
| `utils/PushTokens.kt` | fetch + register the token; unregister on logout |
| `utils/FcmMessagingService.kt` | receives pushes; posts them when in the foreground |
| `AndroidManifest.xml` | the service + default icon/colour/channel |
| `build.gradle.kts` | Firebase, **applied only if google-services.json exists** |
| `Navigation.kt` | register on launch and login, unregister on logout |

The Gradle gate matters: the Google Services plugin fails the build outright when
the file is missing, so applying it unconditionally would stop anyone compiling
until Firebase was set up. Drop the file in and push builds itself in.
