# Push notifications — what to apply

Four new backend files, one hook, one SQL file, and two credential
files only you can produce. Nothing here changes email or SMS: `alarmNotify.js`
is untouched and still fires for Critical alarms only.

---

## 1. The database

```bash
psql "$DATABASE_URL" -f db/push_tokens.sql
```

Local and VPS, same as `db/notifications.sql`. Everything that reads this table
degrades to "no tokens" when it is missing, so applying the code before the SQL
is safe — push just does nothing.

## 2. The new files

```
db/push_tokens.sql
app/api/apiUtils/dataControl/pushTokens.js
app/api/apiUtils/notify/fcm.js
app/api/apiUtils/notify/alarmPush.js
app/api/mainapp/push/register/route.js
```

All new. None replaces anything.

## 3. The hook — the only edit to an existing file

`app/api/apiUtils/dataControl/alarms.js`, in `insertLiveAlarm`.

I have **not** shipped that file, because my copy of it is from 10 August and
overwriting yours would throw away whatever you have deployed since. It is a
three-line addition plus two one-word edits.

Add this above `export async function insertLiveAlarm`:

```js
/**
 * Every alarm this function actually RAISES, offered to the push channel.
 *
 * `insertLiveAlarm` is the seam because it is the only place that knows the
 * difference between raising an alarm and de-duping one — a de-duped alarm
 * returns null, and a null never reaches here.
 *
 * Note it does NOT distinguish simulated traffic: `mainapp/ingest/simulate`
 * calls `resolveAndStore`, which lands here like any device packet, and the
 * insert stamps `source='device'` on both. Use PUSH_ENABLED=false when
 * exercising the simulator on a server that has Firebase configured.
 *
 * Dynamically imported and never awaited. The dynamic import breaks what would
 * otherwise be a cycle (alarms -> alarmPush -> alarmNotify -> alarms), and not
 * awaiting means a slow or failing FCM call cannot delay a telemetry packet or
 * throw into the ingest path.
 */
function raised(row) {
  if (row) {
    import("../notify/alarmPush.js")
      .then((m) => m.pushAlarmRaised(row, {}))
      .catch((e) => console.error("[push] hook:", e?.message || e));
  }
  return row || null;
}
```

Then change **both** `return rows[0] || null;` lines inside `insertLiveAlarm` —
there are two, one in the `try` and one in the `catch` fallback — to:

```js
    return raised(rows[0]);
```

Leave the two `return null;` lines in the de-dupe block alone. Those are the
alarms that were *not* raised, and they must not push.

## 4. Firebase — the part only you can do

There is no way around this. A notification that arrives when the app is closed
requires FCM: a background service is killed by the phone's battery manager, and
a WorkManager poll has a 15-minute floor and does not run after a force-stop. A
security alarm that might turn up a quarter of an hour late is not an alarm.

It is three console steps and two files.

1. **console.firebase.google.com → Add project.** Call it AssetGuard. Analytics
   is optional and not used here.

2. **Add an Android app.** Package name must be exactly `com.example.assetguard`
   — it is the `applicationId` in `app/build.gradle.kts`, and FCM matches on it.
   Download `google-services.json` and drop it in `app/` next to
   `build.gradle.kts`. Do not commit it.

3. **Project settings → Service accounts → Generate new private key.** That
   downloads a JSON. Put it on the VPS and point the server at it:

   ```
   FIREBASE_SERVICE_ACCOUNT_FILE=/etc/assetguard/firebase-service-account.json
   ```

   or, if you would rather keep it in the environment, base64 the whole file
   into `FIREBASE_SERVICE_ACCOUNT`. `fcm.js` accepts either, and raw JSON too.

Until both files exist the feature is inert and nothing else is affected: the
Gradle plugin only applies itself when `google-services.json` is present, and
`fcm.js` reports "not configured" and every send is skipped.

**Restart the server after adding the credentials.** `fcm.js` reads them once
and caches the answer, including the answer "there are none" — it will not
notice a file that appears underneath a running process.

There is also an explicit off switch, `PUSH_ENABLED=false`, which skips every
send while leaving the credentials in place. Use it while testing with the
simulator: see the next section.

## 5. What it does once it is on

**Every alarm that is actually raised** — the volume decision you made — goes to
every registered device belonging to:

- anyone whose email appears in that site's contacts (`flattenSiteContacts`,
  the same list email and SMS use), matched to `users.email`; and
- every active `superadmin` or `admin`, on any site.

Matched by email because push goes to a *device*, and a device belongs to an
account. Most of those addresses already come from real accounts —
`siteContacts.js` resolves the security and NOC staffing straight out of Users &
Roles — so this is not a wider audience than the email, it is the same audience
minus anyone who has not installed the app.

Every send is logged to `notifications` with `channel:'push'`, so the
Notifications screen counts it beside email and SMS with no change to that page.

---

## Five things worth knowing

**The simulator pushes too, and this is the one to know about before you turn
it on.** `mainapp/ingest/simulate` calls `resolveAndStore` — the same function a
real packet goes through — and `insertLiveAlarm` writes `source='device'` for
both, so nothing downstream can tell a simulated alarm from a real one. Today
that only matters for simulated *Critical* alarms, which already email and text
every contact. With push on every priority, a test run buzzes every
administrator's handset. `PUSH_ENABLED=false` is the switch for that.

**Security-side users are held to Critical, as they are everywhere else.**
`alarmPerms()` sets `criticalOnly` for a non-admin on the security side, the
alarm detail route 403s them on anything below it, and their list query is
forced to Critical. A notification is a disclosure — alarm name, site, device
and time, on a lock screen — so `tokensForSiteAlarm` takes the priority and
excludes those users from everything except Critical. Without that they would
have been told about every Low Battery on their site and then refused the alarm
when they tapped it.

**Volume.** Every alarm means every Low Battery on every device. Three Android
notification channels exist for exactly this reason — Critical, High and Other —
because Android lets someone silence one channel and keep the others. One
channel would leave the choice of all of it or none of it, and people faced with
that turn off all of it. If it still proves too much, the narrowest change is
`NEVER_PUSH` in `alarmPush.js`, which already takes a set of alarm types.

**It also means a `notifications` row per alarm per device.** That table will
grow much faster than it does today. Worth a retention policy before long.

**Device mute does nothing — for any channel.** The batch `mute` operation says
alarms are still raised and only email and SMS are held back, but there is no
`muted_until` check anywhere in the notify path in the code I have. Push does not
check it either, because there is nothing to check yet. Wiring it belongs in
`notifyAlarmRaised` and `pushAlarmRaised` together, so both honour one rule.
