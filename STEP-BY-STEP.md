# Deploying push — step by step

You have the service account private key downloaded. Everything below assumes:

| | |
| --- | --- |
| App root on the VPS | `/var/www/html/baseapps/assetguard` |
| pm2 processes | `assetguard-3010`, `gps-3000` |
| Database URL | `postgresql://assetguard:admin001@localhost:5432/assetguard` |

Replace `YOU@YOUR-VPS` with your own SSH login wherever it appears.

Do the VPS first. The app cannot be tested until the backend can send.

---

# PART A — put the key on the VPS

### A1. Rename it on your laptop

The download has a long generated name. Rename it so nobody has to guess later:

```bash
mv ~/Downloads/assetguard-technician-*.json ~/Downloads/fcm.json
```

Open it once and confirm it has `"type": "service_account"` and a
`"private_key"`. If it instead has `"project_info"`, you downloaded
`google-services.json` — that is the *app* file (Part D), not this one.

### A2. Make a directory the web cannot serve

```bash
ssh YOU@YOUR-VPS
mkdir -p /var/www/html/baseapps/assetguard/secrets
chmod 700 /var/www/html/baseapps/assetguard/secrets
exit
```

`secrets/` is beside `app/`, **not** inside `public/`. Anything in `public/` is
served to the internet, and this key can send messages to every handset you
register.

### A3. Upload

From your laptop:

```bash
scp ~/Downloads/fcm.json YOU@YOUR-VPS:/var/www/html/baseapps/assetguard/secrets/fcm.json
```

*No scp?* Then on the VPS run `nano /var/www/html/baseapps/assetguard/secrets/fcm.json`,
paste the whole file, Ctrl-O, Enter, Ctrl-X. Paste it exactly — the `\n` escapes
inside `private_key` must survive verbatim or the signature will not verify.

### A4. Lock it down and prove it is not public

```bash
ssh YOU@YOUR-VPS
cd /var/www/html/baseapps/assetguard
chmod 600 secrets/fcm.json
ls -l secrets/fcm.json          # expect  -rw-------

# must return 404, NOT the file
curl -s -o /dev/null -w "%{http_code}\n" https://assetguard.symphony.co.ke/secrets/fcm.json
```

If that returns 200, stop and move the directory outside the web root before
going further.

### A5. Never let it into git

```bash
cd /var/www/html/baseapps/assetguard
grep -qxF 'secrets/' .gitignore 2>/dev/null || echo 'secrets/' >> .gitignore
```

---

# PART B — the environment variable

**First check what is already there:**

```bash
cd /var/www/html/baseapps/assetguard
grep -rinE 'FCM_SERVICE_ACCOUNT|FIREBASE_SERVICE_ACCOUNT|GOOGLE_APPLICATION_CREDENTIALS' \
  .env.local .env .env.production ecosystem.config.js 2>/dev/null
```

**If it finds `FIREBASE_SERVICE_ACCOUNT_FILE` or `GOOGLE_APPLICATION_CREDENTIALS`
— and that key is for the SAME Firebase project as the technician app — Part B
is a no-op. Skip to Part C.**

The push code reads, in order:

1. `FCM_SERVICE_ACCOUNT_FILE`
2. `FCM_SERVICE_ACCOUNT_JSON`
3. `FIREBASE_SERVICE_ACCOUNT_FILE`   ← the admin app's, if it has one
4. `GOOGLE_APPLICATION_CREDENTIALS`

A service account authorises against a **project**, not an app. One Firebase
project can hold both Android apps, so the credential the admin app already uses
sends to both — no new key, no new variable, and one fewer secret to rotate.

Confirm the projects match before relying on it:

```bash
node -p "JSON.parse(require('fs').readFileSync(process.env.FIREBASE_SERVICE_ACCOUNT_FILE,'utf8')).project_id"
```

That must equal the `project_id` of the Firebase project holding
`com.symphony.assetguard.technician`.

**Only if they are DIFFERENT projects**, or nothing is set, add the variable:

```bash
echo 'FCM_SERVICE_ACCOUNT_FILE=/var/www/html/baseapps/assetguard/secrets/fcm.json' >> .env.local
chmod 600 .env.local
```

`FCM_SERVICE_ACCOUNT_FILE` wins over the fallbacks, so setting it splits the two
apps apart without touching what the admin side reads.

**If your pm2 process gets its environment from an ecosystem file**, its `env`
block overrides `.env.local` for the variables it defines — put it there instead:

```js
env: { FCM_SERVICE_ACCOUNT_FILE: "/var/www/html/baseapps/assetguard/secrets/fcm.json" }
```

After the restart in Part C, the log says which source won:

    [push] credentials from FIREBASE_SERVICE_ACCOUNT_FILE — project assetguard-1d7e9

# PART C — deploy the backend

```bash
cd /var/www/html/baseapps/assetguard

# 1. extract (upload tech-patch17.zip here first)
python3 -c "import zipfile; zipfile.ZipFile('tech-patch17.zip').extractall('.')"

# 2. remove the file this drop replaces — extractall overwrites but never deletes,
#    and a stale techOnSite.js reads like live code to the next person
rm -f app/api/apiUtils/ingest/techOnSite.js

# 3. migrations (both idempotent; the second is new in this round)
psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_devices.sql
psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_push_tokens.sql

# 4. build and restart
npm run build
pm2 restart assetguard-3010 gps-3000 --update-env
```

### C1. Prove the credentials work — before touching the app

```bash
cd /var/www/html/baseapps/assetguard
export $(grep FCM_SERVICE_ACCOUNT_FILE .env.local)
node verify-fcm.mjs
```

Expected:

```
OK    Service account read.
      project_id   : assetguard-technician
      client_email : firebase-adminsdk-…@assetguard-technician.iam.gserviceaccount.com
OK    JWT signed with the private key.
OK    Access token minted (expires in 3599s).

DONE  Credentials are good. Push will work once a handset registers.
```

**Do not continue until you see that.** The script names the cause of each
failure — wrong file, mangled key, clock skew, FCM API not enabled, no outbound
HTTPS.

---

# PART D — build and install the app

### D1. Extract the project on the machine with Android Studio

```bash
cd <wherever you keep the project>
python3 -c "import zipfile; zipfile.ZipFile('assetguard-technician.zip').extractall('.')"
```

This writes into `assetguard-technician/`. Your `google-services.json` is **not**
in the zip, so a file you have already placed survives the extract.

### D2. Delete stale files

`extractall` overwrites but never deletes. `app/src/main/java/.../ui/job/` must
contain **exactly three** files:

```
JobState.kt   JobViewModel.kt   JobScreen.kt
```

Anything else there — `InstallViewModel.kt`, `MaintainViewModel.kt`,
`InstallScreen.kt` — is stale and will fail the build with a type mismatch that
survives every other fix. `InstallViewModel` and `MaintainViewModel` are declared
at the bottom of `JobViewModel.kt`. See `STALE-FILES.txt`.

### D3. Drop `google-services.json` in

It goes in the **`app/` module folder**, not the project root:

```
assetguard-technician/
  app/
    google-services.json      ← here
    build.gradle.kts
```

Get it from Firebase → your project → **Add app → Android**, with the package
name **exactly**:

```
com.symphony.assetguard.technician
```

and your release SHA-1:

```bash
keytool -list -v -keystore <your.keystore> -alias <your-alias>
```

A package-name or SHA-1 mismatch is the most common reason push silently never
arrives — Firebase accepts the registration and drops every message.

### D4. Sync and confirm the plugin engaged

Open the project in Android Studio → **Sync Project with Gradle Files**.

Watch the build output:

- **Nothing about Firebase** → good, the file was found and push is compiled in.
- `AssetGuard: google-services.json not found in app/ — building WITHOUT push`
  → the file is missing or in the wrong folder. Fix D3 and re-sync.

### D5. Build a signed release APK

**Build → Generate Signed App Bundle / APK → APK**, using the **same keystore as
the admin app** — that is what makes the SHA-1 you registered in D3 correct.

Then install it on the handset:

```bash
adb install -r app/release/app-release.apk
```

---

# PART E — prove it end to end

### E1. Sign in and confirm the handset registered

Open the app and sign in. Then on the VPS:

```bash
psql "postgresql://assetguard:admin001@localhost:5432/assetguard" \
  -c "SELECT user_id, platform, last_seen_at, disabled_at FROM technician_push_tokens ORDER BY last_seen_at DESC LIMIT 5;"
```

A row should appear within seconds. **No row** means the app has no Firebase
config — go back to D3/D4.

### E2. Send a push by hand

```bash
cd /var/www/html/baseapps/assetguard
export $(grep FCM_SERVICE_ACCOUNT_FILE .env.local)
TOKEN=$(psql -tA "postgresql://assetguard:admin001@localhost:5432/assetguard" \
  -c "SELECT token FROM technician_push_tokens ORDER BY last_seen_at DESC LIMIT 1;")
node verify-fcm.mjs "$TOKEN"
```

The handset should show **"AssetGuard test — Push is working."**

If Firebase accepts it but nothing appears: notification permission is not
granted, or battery optimisation is restricting the app. Check
**Settings → Apps → AssetGuard Tech → Notifications**, and set battery usage to
**Unrestricted**.

### E3. The real test — the one that was impossible before

1. Start a job on the handset and reach the settle step.
2. **Force-close the app** (swipe it away from recents).
3. Shake the tracker.

The notification should still arrive. Watch the VPS log while you do it:

```bash
pm2 logs assetguard-3010 --lines 100 | grep -E "underTest|disturbance|test-alarm|push"
```

Expected:

```
[underTest] DEV-01 site=12 → TEST (session 34, matched by device)
[disturbance] DEV-01 → TEST ALARM ALM-2026-…
[push] test alarm ALM-2026-… → 1 technician(s): 1/1 delivered
```

`0/1 delivered` with a failure status means the token is stale — reinstall and
sign in again. **No `[push]` line at all** means either the credentials are not
loaded (re-run C1) or no technician has an open session covering that device.

---

## Rolling back

The key and the env var are additive. To disable push without redeploying:

```bash
cd /var/www/html/baseapps/assetguard
sed -i '/FCM_SERVICE_ACCOUNT_FILE/d' .env.local
pm2 restart assetguard-3010 --update-env
```

The backend returns to treating push as unconfigured — a silent no-op — and the
app falls back to its in-app poll, exactly as before this round.
