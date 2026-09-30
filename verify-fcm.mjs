// verify-fcm.mjs — prove the Firebase credentials work, before trusting them.
// ---------------------------------------------------------------------------
// Run this on the VPS after installing the service account key. It does the two
// things that actually fail in practice, and tells you which one broke:
//
//   1. Read the key and mint a Google OAuth2 access token.
//   2. Optionally send a real push to one device token.
//
//   node verify-fcm.mjs                     # credentials only
//   node verify-fcm.mjs <device-token>      # and send a test push
//
// The device token comes from the handset once it has signed in:
//   psql "$DATABASE_URL" -c "SELECT token FROM push_tokens ORDER BY last_seen_at DESC LIMIT 1;"
// ---------------------------------------------------------------------------

import crypto from "node:crypto";
import fs from "node:fs";

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

// The SAME order the server uses, so this tests what will actually run.
// FIREBASE_SERVICE_ACCOUNT_FILE is the fallback to whatever the admin app
// already has — one project, one service account, both Android apps.
const SOURCES = [
  ["FCM_SERVICE_ACCOUNT_FILE", "file"],
  ["FCM_SERVICE_ACCOUNT_JSON", "inline"],
  ["FIREBASE_SERVICE_ACCOUNT_FILE", "file"],
  ["GOOGLE_APPLICATION_CREDENTIALS", "file"],
];

let envName = null, kind = null, value = null;
for (const [n, k] of SOURCES) {
  if (process.env[n]) { envName = n; kind = k; value = process.env[n]; break; }
}

if (!value) {
  console.error("FAIL  No service account configured. Looked for, in order:");
  for (const [n] of SOURCES) console.error(`        ${n}`);
  console.error("      The backend treats this as 'push disabled' and stays silent, so this");
  console.error("      is the first thing to check when nothing arrives.");
  process.exit(1);
}
console.log(`      source: ${envName}${kind === "file" ? ` → ${value}` : " (inline)"}`);

const file = kind === "file" ? value : null;
const inline = kind === "inline" ? value : null;

let acct;
try {
  acct = JSON.parse(file ? fs.readFileSync(file, "utf8") : inline);
} catch (e) {
  console.error(`FAIL  Cannot read the service account: ${e.message}`);
  if (file) console.error(`      Path: ${file}  — check it exists and the Node process can read it.`);
  process.exit(1);
}

for (const k of ["client_email", "private_key", "project_id"]) {
  if (!acct[k]) {
    console.error(`FAIL  The service account JSON has no "${k}".`);
    console.error("      Make sure you downloaded the SERVICE ACCOUNT key (Project settings →");
    console.error("      Service accounts → Generate new private key), not google-services.json.");
    process.exit(1);
  }
}
console.log(`OK    Service account read.`);
console.log(`      project_id   : ${acct.project_id}`);
console.log(`      client_email : ${acct.client_email}`);

const b64url = (b) =>
  Buffer.from(b).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

const now = Math.floor(Date.now() / 1000);
const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
const claims = b64url(JSON.stringify({
  iss: acct.client_email, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600,
}));

let assertion;
try {
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(`${header}.${claims}`);
  assertion = `${header}.${claims}.${b64url(signer.sign(acct.private_key))}`;
  console.log("OK    JWT signed with the private key.");
} catch (e) {
  console.error(`FAIL  Could not sign with private_key: ${e.message}`);
  console.error("      Usually a mangled key — the \\n escapes must survive whatever copied it.");
  process.exit(1);
}

let accessToken;
try {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const text = await res.text();
  let body = {};
  try { body = JSON.parse(text); } catch { /* keep the raw text below */ }
  if (!res.ok || !body.access_token) {
    console.error(`FAIL  Google rejected the credentials (HTTP ${res.status}).`);
    // Google does not always populate error/error_description — print whatever
    // came back rather than an empty line, which is a dead end to debug.
    const detail = [body.error, body.error_description].filter(Boolean).join(" — ")
      || text.slice(0, 400) || "(no detail returned)";
    console.error(`      ${detail}`);
    console.error("");
    console.error("      Common causes:");
    console.error("        403 / PERMISSION_DENIED  the Firebase Cloud Messaging API is not");
    console.error("                                 enabled on that project, or the service");
    console.error("                                 account lacks the Firebase Messaging role");
    console.error("        invalid_grant            the VPS clock is wrong — check `timedatectl`");
    console.error("        invalid_client           the key was deleted in the Firebase console");
    process.exit(1);
  }
  accessToken = body.access_token;
  console.log(`OK    Access token minted (expires in ${body.expires_in}s).`);
} catch (e) {
  console.error(`FAIL  Could not reach Google: ${e.message}`);
  console.error("      Check the VPS has outbound HTTPS to oauth2.googleapis.com.");
  process.exit(1);
}

const deviceToken = process.argv[2];
if (!deviceToken) {
  console.log("");
  console.log("DONE  Credentials are good. Push will work once a handset registers.");
  console.log("      Pass a device token to send a real test:  node verify-fcm.mjs <token>");
  process.exit(0);
}

try {
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${acct.project_id}/messages:send`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        message: {
          token: deviceToken,
          notification: { title: "AssetGuard test", body: "Push is working." },
          data: { type: "test_alarm", device_id: "SETUP-CHECK", open: "tests" },
          android: {
            priority: "HIGH",
            notification: { channel_id: "test_alarms", sound: "default" },
          },
        },
      }),
    }
  );
  const body = await res.json().catch(() => ({}));
  if (res.ok) {
    console.log(`OK    Push accepted by Firebase: ${body.name || "(sent)"}`);
    console.log("");
    console.log("DONE  Look at the handset. If nothing appears, the message was delivered");
    console.log("      but the phone dropped it — check notification permission is granted");
    console.log("      and that battery optimisation is not restricting the app.");
  } else {
    const status = body?.error?.status || res.status;
    console.error(`FAIL  Firebase rejected the send: ${status}`);
    console.error(`      ${body?.error?.message || ""}`);
    if (String(status) === "UNREGISTERED") {
      console.error("      That token is dead — the app was reinstalled or cleared. Get a fresh one.");
    }
    if (String(status) === "INVALID_ARGUMENT") {
      console.error("      Usually a token from a DIFFERENT Firebase project, or a truncated copy.");
    }
    process.exit(1);
  }
} catch (e) {
  console.error(`FAIL  Send failed: ${e.message}`);
  process.exit(1);
}
