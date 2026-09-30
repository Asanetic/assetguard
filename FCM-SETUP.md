# Push notifications — what you need to create

Everything else is built and in this drop. These two artefacts can only come from
you, because they are tied to your Google account and your app's signing key.

Until both exist, **nothing breaks**: the app builds and runs without push, and
the backend treats it as unconfigured and carries on. You lose only the alert on
a locked or closed phone.

---

## 1. `google-services.json` → goes in the Android project at `app/`

1. <https://console.firebase.google.com> → **Add project** (or reuse an existing
   AssetGuard one).
2. Inside the project → **Add app → Android**.
3. **Android package name** must be exactly:

       com.symphony.assetguard.technician

   A mismatch here is the single most common reason push silently never
   arrives — Firebase accepts the registration and drops every message.
4. Add your release signing SHA-1 (the same keystore as the admin app):

       keytool -list -v -keystore <your.keystore> -alias <your-alias>

5. Download `google-services.json` and drop it at:

       assetguard-technician/app/google-services.json

The Gradle file checks for it. Present → the Firebase plugin applies and push is
built in. Absent → it logs a line and builds without, so nobody is blocked from
compiling by a missing Firebase project.

## 2. A service account key → goes on the VPS

Same Firebase project → **⚙ Project settings → Service accounts → Generate new
private key**. That downloads a JSON file. Put it somewhere the app can read but
the web cannot serve:

    mkdir -p /var/www/html/baseapps/assetguard/secrets
    chmod 700 /var/www/html/baseapps/assetguard/secrets
    # copy the JSON in as fcm.json
    chmod 600 /var/www/html/baseapps/assetguard/secrets/fcm.json

**Do not put it under `public/`, and do not commit it.** It can send messages to
every device you have registered.

Then set one environment variable for the Next.js process:

    FCM_SERVICE_ACCOUNT_FILE=/var/www/html/baseapps/assetguard/secrets/fcm.json

With pm2, add it to your ecosystem file or:

    pm2 set assetguard-3010:FCM_SERVICE_ACCOUNT_FILE /var/www/.../secrets/fcm.json
    pm2 restart assetguard-3010 --update-env

(`FCM_SERVICE_ACCOUNT_JSON` with the JSON inline also works if you would rather
not have a file on disk.)

---

## Checking it works

**Is the backend configured?** On startup, a push attempt with no credentials
logs nothing at all — it returns `{skipped:"not configured"}` silently by design.
The quickest positive check is to run a test and look for:

    [push] test alarm ALM-2026-… → 1 technician(s): 1/1 delivered

**Is the handset registered?**

    SELECT user_id, platform, last_seen_at, disabled_at
      FROM technician_push_tokens ORDER BY last_seen_at DESC LIMIT 10;

A row appears on the technician's first launch after installing the build that
contains `google-services.json`. No row means the app has no Firebase config —
check step 1.

**End to end:** sign in on the handset, start a job, reach the settle step, then
**force-close the app** and shake the tracker. The notification should still
arrive. That is the whole point of this work — the old local notification could
not do it.

## What gets pushed, and to whom

Only **test alarms**, and only to the technicians with an **open session covering
that device** — matched by site or by the session's device list, the same two ways
the ingest pipeline decides a device is under test.

- A drill fired from the web has no session, so it pushes to nobody. It still
  appears in the Tests tab, where whoever fired it is already looking.
- **Real alarms are not pushed by this.** They go through the existing escalation
  chain — SMS and email to site contacts — untouched.
- A technician's own devices only. Nobody receives another technician's tests.

## Notes on the implementation

- **HTTP v1, not the legacy server key.** The legacy endpoint is retired. v1
  needs a short-lived OAuth2 token minted from the service account, which is why
  there is JWT signing in `pushSend.js` rather than a constant. No SDK: it is a
  signed JWT and one POST, so `node:crypto` and `fetch` do it without adding
  `googleapis` to the dependency tree.
- **Sent fire-and-forget**, never awaited by ingest. Every inbound packet from
  every device passes through that path; a slow or unreachable Firebase must not
  hold up telemetry. The alarm row is already written and the app's poll is still
  a working fallback.
- **Both `notification` and `data` blocks are sent.** The notification block is
  what lets Android display it while the app is dead — a data-only message to a
  dead process is dropped. The data block carries the deep-link target so a tap
  opens the Tests tab.
- **Dead tokens retire themselves.** A push rejected as `UNREGISTERED` or
  `INVALID_ARGUMENT` marks that row disabled, so an uninstalled app does not fail
  on every alarm forever. Re-registering revives it.
- **A shared handset reassigns rather than duplicates.** Registering a token that
  already belongs to someone else moves it, so the next technician to log in does
  not receive the previous one's alarms.
- **Logout unregisters** — before the session is cleared, since the call needs it.
