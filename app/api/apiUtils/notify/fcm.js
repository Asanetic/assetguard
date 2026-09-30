// app/api/apiUtils/notify/fcm.js
// ---------------------------------------------------------------------------
// Firebase Cloud Messaging, HTTP v1.
//
// **Why FCM at all.** The requirement is a notification that arrives when the
// app is not running. On Android that means FCM and nothing else: a background
// service is killed by the OEM battery manager, and a WorkManager poll has a
// 15-minute floor and does not run at all after a force-stop. A security alarm
// that might arrive a quarter of an hour late is not an alarm.
//
// **No new npm dependency.** The v1 API wants an OAuth2 bearer token, which is
// normally `google-auth-library`'s job. All that library does for this case is
// sign a JWT with the service account's private key and exchange it at Google's
// token endpoint — about thirty lines with node's own `crypto`, done below.
// Adding a dependency to the web app for a mobile feature is exactly the kind
// of change that has to be justified, and this one cannot be.
//
// **Credentials.** A service-account JSON from
// Firebase console -> Project settings -> Service accounts -> Generate new
// private key. Give the server either:
//     FIREBASE_SERVICE_ACCOUNT       the JSON itself, or base64 of it
//     FIREBASE_SERVICE_ACCOUNT_FILE  a path to it on disk
// Nothing here throws when they are absent — `isConfigured()` returns false and
// every send is skipped, so a server with no Firebase set up keeps working.
// ---------------------------------------------------------------------------
import crypto from "node:crypto";
import fs from "node:fs";

const TOKEN_URL = "https://oauth2.googleapis.com/token";
const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";

/** Google issues these for an hour. Renew at 55 minutes so a send never races the expiry. */
const TOKEN_TTL_MS = 55 * 60 * 1000;

let account = null;      // the parsed service account, or false once we know there is none
let cachedToken = null;  // { value, expiresAt }
let inFlight = null;     // the access-token request currently running, if any

function loadAccount() {
  if (account !== null) return account || null;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  const file = process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  let text = null;
  try {
    if (raw && raw.trim()) {
      // Accept base64 as well as the raw JSON: a multi-line private key is
      // painful to carry in a .env, and base64 is how it usually ends up there.
      text = raw.trim().startsWith("{")
        ? raw
        : Buffer.from(raw, "base64").toString("utf8");
    } else if (file && fs.existsSync(file)) {
      text = fs.readFileSync(file, "utf8");
    }
    if (!text) { account = false; return null; }
    const parsed = JSON.parse(text);
    if (!parsed.client_email || !parsed.private_key || !parsed.project_id) {
      console.error("[fcm] service account is missing client_email, private_key or project_id");
      account = false;
      return null;
    }
    account = parsed;
    return account;
  } catch (e) {
    console.error("[fcm] could not read the service account:", e?.message || e);
    account = false;
    return null;
  }
}

/** Whether push can be sent at all. Callers use this to skip quietly. */
export function isConfigured() {
  return !!loadAccount();
}

export function projectId() {
  return loadAccount()?.project_id || null;
}

const b64url = (input) =>
  Buffer.from(input).toString("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

/**
 * A self-signed JWT exchanged for an access token — the standard
 * `urn:ietf:params:oauth:grant-type:jwt-bearer` flow.
 */
async function requestAccessToken(acct) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = b64url(JSON.stringify({
    iss: acct.client_email,
    scope: SCOPE,
    aud: TOKEN_URL,
    iat: now,
    exp: now + 3600,
  }));
  const signature = crypto
    .createSign("RSA-SHA256")
    .update(`${header}.${claims}`)
    .sign(acct.private_key.replace(/\\n/g, "\n"), "base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${header}.${claims}.${signature}`,
    }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) {
    throw new Error(body.error_description || body.error || `token exchange failed (${res.status})`);
  }
  return body.access_token;
}

async function accessToken() {
  const acct = loadAccount();
  if (!acct) return null;
  if (cachedToken && cachedToken.expiresAt > Date.now()) return cachedToken.value;

  // One request at a time. A burst of alarms would otherwise each start their
  // own token exchange, and Google rate-limits that endpoint hard enough to
  // turn a busy minute into a minute with no notifications at all.
  if (!inFlight) {
    inFlight = requestAccessToken(acct)
      .then((value) => {
        cachedToken = { value, expiresAt: Date.now() + TOKEN_TTL_MS };
        return value;
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

/**
 * FCM's way of saying "this token is dead" — the app was uninstalled, or the
 * token was rotated and the old one retired. These are the only errors worth
 * acting on: the row should go, and it will never work again.
 */
function isDeadToken(status, body) {
  if (status === 404) return true;
  const code = body?.error?.details?.find?.(
    (d) => d?.["@type"]?.endsWith("FcmError")
  )?.errorCode;
  if (code === "UNREGISTERED") return true;

  // INVALID_ARGUMENT is NOT enough on its own, and treating it as enough is a
  // way to lose the entire registry in one call.
  //
  // FCM returns it for anything malformed about the REQUEST — an oversized data
  // payload, a reserved data key, a bad enum — not only for a bad token. The
  // same message goes to every recipient of an alarm, so one payload mistake
  // would come back INVALID_ARGUMENT for all of them, mark every token dead,
  // and delete every row in push_tokens. Push would then stay dead until each
  // handset happened to cold-start.
  //
  // So it only counts when the message says the token is what was invalid.
  const message = String(body?.error?.message || "");
  if (code === "INVALID_ARGUMENT" && /registration token|not a valid FCM/i.test(message)) {
    return true;
  }
  return /not.*registered|invalid.*registration/i.test(message);
}

/**
 * Send one message to one token.
 *
 * @returns {Promise<{ok:boolean, dead:boolean, error:string|null}>}
 *   `dead` means the caller should delete the token. It is separate from `ok`
 *   because an expired install is not a delivery failure worth alarming about —
 *   it is bookkeeping.
 */
export async function sendToToken(token, message) {
  const acct = loadAccount();
  if (!acct) return { ok: false, dead: false, error: "Firebase is not configured on this server" };

  const url =
    `https://fcm.googleapis.com/v1/projects/${encodeURIComponent(acct.project_id)}/messages:send`;
  const payload = JSON.stringify({ message: { token, ...message } });

  const attempt = async () => {
    const bearer = await accessToken();
    if (!bearer) return null;
    return fetch(url, {
      method: "POST",
      headers: {
        authorization: `Bearer ${bearer}`,
        "content-type": "application/json",
      },
      body: payload,
    });
  };

  try {
    let res = await attempt();
    if (!res) return { ok: false, dead: false, error: "Firebase is not configured on this server" };

    // RETRIED once on a 401, not merely invalidated.
    //
    // A 401 means the cached access token went stale early — a clock skew, or a
    // rotated key. Because one alarm fans the same message out to every
    // recipient concurrently, all of them are holding that same stale token, so
    // clearing the cache without replaying loses the push for the WHOLE
    // audience and recovers only on the next alarm.
    if (res.status === 401) {
      cachedToken = null;
      const retried = await attempt();
      if (retried) res = retried;
    }

    if (res.ok) return { ok: true, dead: false, error: null };

    const body = await res.json().catch(() => ({}));
    return {
      ok: false,
      dead: isDeadToken(res.status, body),
      error: body?.error?.message || `FCM responded ${res.status}`,
    };
  } catch (e) {
    return { ok: false, dead: false, error: e?.message || "network error" };
  }
}
