// app/api/apiUtils/notify/pushSend.js
// -----------------------------------------------------------------------------
// Firebase Cloud Messaging, HTTP v1.
//
// WHY v1 AND NOT THE LEGACY SERVER KEY: the legacy endpoint
// (fcm.googleapis.com/fcm/send with an `Authorization: key=...` header) is
// retired. v1 needs a short-lived OAuth2 access token minted from a service
// account, which is why there is JWT signing below rather than a single constant.
//
// NO SDK. The token is a signed JWT and the send is one POST, so this uses
// node:crypto and fetch rather than pulling in googleapis — one less dependency
// to keep current in a codebase that already builds fine without it.
//
// CONFIGURATION (either form; the file wins if both are set):
//
//   FCM_SERVICE_ACCOUNT_FILE=/path/to/service-account.json     (preferred)
//   FCM_SERVICE_ACCOUNT_JSON={"type":"service_account",...}     (inline)
//
// ...or nothing at all, if this deployment already sets one of these for the
// admin app — both are used as fallbacks, in this order:
//
//   FIREBASE_SERVICE_ACCOUNT_FILE
//   GOOGLE_APPLICATION_CREDENTIALS
//
// One Firebase project can hold both Android apps and one service account can
// send to both, so a working admin setup needs no new key for the technician
// app. The log line at startup says which source was used.
//
// UNCONFIGURED IS A NO-OP, NOT AN ERROR. Push is an enhancement on top of the
// app's own polling; if the credentials are missing the alarm pipeline must
// carry on exactly as before. Every failure here is caught and logged.
// -----------------------------------------------------------------------------

import crypto from "node:crypto";
import fs from "node:fs";
import { tokensForUsers, disablePushToken } from "../dataControl/push.js";

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

let cachedAccount = null;
let cachedAccountRaw = null;
let announced = false;
let warnedMissing = false;

/**
 * Where the credentials come from, in order of preference.
 *
 * The last two are FALLBACKS to what this deployment already has. The admin app
 * has been pushing for a while using FIREBASE_SERVICE_ACCOUNT_FILE, and both
 * Android apps live in the SAME Firebase project — a service account authorises
 * against the project, not the app — so that one credential can serve both.
 *
 * Falling back means the technician app needs no new key, no new variable, and
 * no second thing to rotate. One credential on the box is also one credential to
 * lose track of.
 *
 * The order still lets you split them later: set FCM_SERVICE_ACCOUNT_FILE and it
 * wins, without touching what the admin side reads.
 */
const SOURCES = [
  ["FCM_SERVICE_ACCOUNT_FILE", "file"],
  ["FCM_SERVICE_ACCOUNT_JSON", "inline"],
  ["FIREBASE_SERVICE_ACCOUNT_FILE", "file"],
  ["GOOGLE_APPLICATION_CREDENTIALS", "file"],
];

/** The service account, or null when push is not configured. */
export function serviceAccount() {
  let envName = null, kind = null, value = null;
  for (const [name, k] of SOURCES) {
    if (process.env[name]) { envName = name; kind = k; value = process.env[name]; break; }
  }
  if (!value) {
    // SAY SO, ONCE. This used to return null in silence, which made "push is
    // disabled" indistinguishable from "push failed" — and from the outside both
    // look like a notification that simply never arrived. The pid is here because
    // the process that RAISES the alarm is not necessarily the one you exported
    // the variable into by hand: a listener started outside Next.js does not read
    // .env.local, so it can write the alarm row perfectly and still have no
    // credentials to push with.
    if (!warnedMissing) {
      warnedMissing = true;
      console.warn(
        `[push] DISABLED in pid ${process.pid} — none of these are set: ` +
        SOURCES.map(([n]) => n).join(", ")
      );
    }
    return null;
  }

  const raw = `${envName}:${value}`;
  if (cachedAccount && cachedAccountRaw === raw) return cachedAccount;

  try {
    const text = kind === "file" ? fs.readFileSync(value, "utf8") : value;
    const acct = JSON.parse(text);
    if (!acct.client_email || !acct.private_key || !acct.project_id) {
      console.error(`[push] ${envName} is missing client_email/private_key/project_id`);
      return null;
    }
    cachedAccount = acct;
    cachedAccountRaw = raw;
    if (!announced) {
      // Said once, at startup, because "which credential is it actually using"
      // is the first question when pushes go to the wrong project.
      console.log(
        `[push] credentials from ${envName} — project ${acct.project_id} (pid ${process.pid})`
      );
      announced = true;
    }
    return acct;
  } catch (e) {
    console.error(`[push] cannot read the service account from ${envName}:`, e?.message || e);
    return null;
  }
}

export function pushConfigured() {
  return !!serviceAccount();
}

const b64url = (buf) =>
  Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

let cachedToken = null;   // { value, expiresAtMs }

/**
 * A Google OAuth2 access token for the messaging scope.
 *
 * Cached until a minute before it expires. Without the cache this would sign a
 * JWT and make a round trip for every single push — on a multi-device test that
 * is several needless RSA signatures and HTTP calls inside the alarm hot path.
 */
async function accessToken() {
  const acct = serviceAccount();
  if (!acct) return null;
  if (cachedToken && cachedToken.expiresAtMs > Date.now() + 60_000) return cachedToken.value;

  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: acct.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  const signature = b64url(signer.sign(acct.private_key));
  const assertion = `${header}.${claims}.${signature}`;

  try {
    const res = await fetch(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.access_token) {
      console.error("[push] token exchange failed:", res.status, body.error_description || body.error || "");
      return null;
    }
    cachedToken = {
      value: body.access_token,
      expiresAtMs: Date.now() + (Number(body.expires_in) || 3600) * 1000,
    };
    return cachedToken.value;
  } catch (e) {
    console.error("[push] token exchange error:", e?.message || e);
    return null;
  }
}

/**
 * Send one notification to one token.
 *
 * `data` reaches the app whether or not it is running, which is the entire point
 * of this file — the app's own poll dies with its process, this does not.
 */
async function sendToToken({ token, title, body, data, accessTok, projectId }) {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessTok}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          token,
          // NOTIFICATION + DATA. The notification block is what makes Android
          // display it while the app is dead — a data-only message is handed to
          // a process that is not running and is simply dropped. The data block
          // carries what the app needs to deep-link once it is opened.
          notification: { title, body },
          data: Object.fromEntries(
            Object.entries(data || {}).map(([k, v]) => [k, String(v ?? "")])
          ),
          android: {
            priority: "HIGH",
            notification: {
              channel_id: "test_alarms",   // must match TechNotifications.CHANNEL_ID
              sound: "default",
              // UNIQUE PER ALARM, not per device.
              //
              // A phone that was offline — in a pocket, at a remote mast, out of
              // signal — comes back to EVERY test result FCM queued for it, and
              // every one must be shown: several from one device, or one each
              // from many. A per-device tag (what this used to be) made the
              // system REPLACE every queued result from a device with the last,
              // so a technician who shook a tracker four times saw one alert.
              //
              // Keyed by alarm id, each queued result is its own notification.
              // A push and the app's own locally-polled alert for the SAME
              // event still share this tag (both carry that alarm's id), so they
              // still merge into one instead of showing twice — which is the
              // collapse this line was actually here to get. Device is only a
              // fallback for the impossible case of a test push with no id.
              tag: `test_alarm_${data?.alarm_id || data?.device_id || "x"}`,
            },
          },
        },
      }),
    }
  );

  if (res.ok) return { ok: true };

  const err = await res.json().catch(() => ({}));
  const status = err?.error?.status || String(res.status);
  // A token for an app that has been uninstalled or whose registration has
  // rotated. Retiring it keeps the table from filling with corpses that fail on
  // every alarm forever.
  if (status === "UNREGISTERED" || status === "INVALID_ARGUMENT" || res.status === 404) {
    await disablePushToken(token, status);
  }
  return { ok: false, status, message: err?.error?.message || "" };
}

/**
 * Push to every live device of every listed technician.
 *
 * Never throws. Returns a small summary so the caller can log it.
 */
export async function pushToUsers(userIds, { title, body, data } = {}) {
  const acct = serviceAccount();
  if (!acct) return { skipped: "not configured" };

  let tokens = [];
  try {
    // TECHNICIAN APP ONLY. This function is reached from testAlarmPush, and a
    // test alarm has no business on the admin or response apps — those are for
    // real incidents, and a drill appearing there would be indistinguishable
    // from one.
    tokens = await tokensForUsers(userIds, { app: "technician" });
  } catch (e) {
    console.error("[push] token lookup:", e?.message || e);
    return { error: e?.message || "token lookup failed" };
  }
  if (!tokens.length) return { attempted: 0, delivered: 0, noTokens: true };

  const accessTok = await accessToken();
  if (!accessTok) return { error: "no access token" };

  let delivered = 0;
  const failures = [];
  for (const { token } of tokens) {
    try {
      const r = await sendToToken({ token, title, body, data, accessTok, projectId: acct.project_id });
      if (r.ok) delivered += 1; else failures.push(r.status);
    } catch (e) {
      failures.push(e?.message || "send error");
    }
  }
  return { attempted: tokens.length, delivered, failures };
}
