// app/api/apiUtils/dataControl/push.js
// -----------------------------------------------------------------------------
// The FCM device-token store for the TECHNICIAN app.
// See db/technician_push_tokens.sql for why this is not the `push_tokens` table
// that already exists on the deployment.
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

/**
 * Register or refresh a device token.
 *
 * Upserts on the token, and REASSIGNS it if it now belongs to a different user.
 * That matters on a shared handset: without the reassignment the row keeps its
 * original owner and the next technician to log in receives the previous one's
 * alarms — while their own never arrive.
 */
// `app` defaults to "admin", NOT "technician".
//
// It defaulted to technician because that app was the first client. It is now
// the only one of the three that always names itself, so the default described
// the one case it could never be — and every unlabelled admin handset was
// filed as a technician install.
export async function savePushToken({ userId, token, platform = "android", app = "admin" }) {
  if (!userId || !token) return null;
  const { rows } = await query(
    `INSERT INTO technician_push_tokens (user_id, token, platform, app)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (token) DO UPDATE
        SET user_id      = EXCLUDED.user_id,
            platform     = EXCLUDED.platform,
            app          = EXCLUDED.app,
            last_seen_at = now(),
            disabled_at  = NULL,
            disabled_why = NULL
     RETURNING *`,
    [String(userId), String(token), String(platform), String(app)]
  );
  return rows[0] || null;
}

/** Drop a token — called on logout, so the next user of the handset is not pushed. */
export async function removePushToken(token) {
  if (!token) return 0;
  const { rowCount } = await query(`DELETE FROM technician_push_tokens WHERE token = $1`, [String(token)]);
  return rowCount;
}

/** Live tokens for a set of technicians. */
export async function tokensForUsers(userIds, { app = null } = {}) {
  const ids = (Array.isArray(userIds) ? userIds : [userIds])
    .filter(Boolean).map(String);
  if (!ids.length) return [];
  // `app` is OPTIONAL and defaults to no filter, so every existing caller
  // behaves exactly as before. Test-alarm push passes 'technician': a person
  // signed into both the technician and the response app on one handset has a
  // row for each, and a test they are running must buzz the app they are
  // running it from — not the one that is supposed to mean a real incident.
  const { rows } = await query(
    `SELECT token, user_id, app FROM technician_push_tokens
      WHERE user_id = ANY($1::text[])
        AND disabled_at IS NULL
        AND ($2::text IS NULL OR app = $2::text)`,
    [ids, app]
  );
  return rows;
}

/**
 * Who should be told about a test alarm on this device?
 *
 * MATCHED BY DEVICE ONLY — deliberately NOT by site.
 *
 * `underTestReason` matches either way, and that is right for deciding whether
 * an alarm is real: a site under maintenance should not page the control room
 * for anything standing on it. But a PUSH is addressed to a person, and the only
 * devices a technician asked to hear about are the ones they picked in the
 * wizard. Matching by site meant shaking any tracker at that site — one nobody
 * had selected, one another crew was working on — buzzed their phone.
 *
 * So the session's `device_ids` is the whole guest list. A device not on it is
 * still recorded as a test alarm; it just does not interrupt anybody.
 */
export async function techniciansOnSiteFor({ deviceIdText }, at = new Date()) {
  const dev = deviceIdText ? String(deviceIdText) : null;
  if (!dev) return [];
  const { rows } = await query(
    `SELECT DISTINCT technician_id
       FROM technician_work_sessions
      WHERE closed_at IS NULL
        AND opened_at <= $2
        AND expires_at > $2
        AND ($1 = ANY(device_ids) OR device_id = $1)`,
    [dev, at]
  );
  return rows.map((r) => r.technician_id);
}

/**
 * Every technician with a live handset.
 *
 * The fallback for a DRILL. A drill is fired from the web by an admin who is
 * usually not holding a technician phone, and it has no session — so targeting
 * "whoever fired it" reaches nobody, which is exactly what happened. A drill is
 * a test of the alerting chain itself, so when there is no technician on site to
 * address it to, every technician who could receive one gets it.
 *
 * Scoped to the technician app, so an admin handset registered for something
 * else is not swept in.
 */
export async function allTechnicianUsers() {
  const { rows } = await query(
    `SELECT DISTINCT user_id FROM technician_push_tokens
      WHERE disabled_at IS NULL AND app = 'technician'`
  );
  return rows.map((r) => r.user_id);
}

/** Mark a token dead, with the reason Firebase gave. */
export async function disablePushToken(token, why) {
  if (!token) return;
  try {
    await query(
      `UPDATE technician_push_tokens SET disabled_at = now(), disabled_why = $2 WHERE token = $1`,
      [String(token), String(why || "unknown")]
    );
  } catch (e) { console.error("[push] disable token:", e?.message || e); }
}
