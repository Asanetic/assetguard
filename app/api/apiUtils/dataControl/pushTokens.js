// app/api/apiUtils/dataControl/pushTokens.js
// ---------------------------------------------------------------------------
// The push-token registry: which app installs belong to which user, and which
// tokens an alarm on a given site should reach.
//
// Every function here degrades to "no tokens" when db/push_tokens.sql has not
// been run, exactly as dataControl/notifications.js does for its own table.
// A server without the table keeps sending email and SMS and simply never
// sends a push — it does not throw into the ingest path.
// ---------------------------------------------------------------------------
import { query } from "../s_env/db.js";

const MISSING = /relation .*push_tokens.* does not exist/i;

/** Phones, tablets and a spare. Anything past this is not a person's devices. */
const MAX_TOKENS_PER_USER = 10;

function swallowMissing(e, what) {
  if (MISSING.test(e?.message || "")) {
    console.error(`[push] table missing — run db/push_tokens.sql to ${what}.`);
    return true;
  }
  return false;
}

/**
 * Register (or move) one device token.
 *
 * UPSERT on the token, not on the user. The token identifies the install, so
 * when a different person signs in on the same handset the row is reassigned
 * to them — otherwise that phone would keep receiving the previous user's
 * alarms, which is both a leak and a nuisance.
 */
export async function registerPushToken({ token, userId, platform, deviceModel, appVersion }) {
  const t = String(token || "").trim();
  if (!t || userId == null) return false;
  try {
    await query(
      `INSERT INTO push_tokens (token, user_id, platform, device_model, app_version, last_seen_at)
            VALUES ($1, $2, COALESCE($3,'android'), $4, $5, now())
       ON CONFLICT (token) DO UPDATE
              SET user_id      = EXCLUDED.user_id,
                  platform     = EXCLUDED.platform,
                  device_model = EXCLUDED.device_model,
                  app_version  = EXCLUDED.app_version,
                  last_seen_at = now()`,
      [t, Number(userId), platform || null, deviceModel || null, appVersion || null]
    );
    // Cap the installs one account can hold.
    //
    // Nothing about a token proves it came from a real handset — it is a string
    // in a request body — so without a ceiling one authenticated account can
    // register thousands and turn every alarm on its site into thousands of FCM
    // calls and log rows, from inside the ingest path. Ten is well past what a
    // person carries and far below what would hurt. Oldest-seen go first, so
    // the phone in someone's hand is never the one evicted.
    await query(
      `DELETE FROM push_tokens
        WHERE user_id = $1
          AND token NOT IN (
            SELECT token FROM push_tokens
             WHERE user_id = $1
             ORDER BY last_seen_at DESC
             LIMIT ${MAX_TOKENS_PER_USER}
          )`,
      [Number(userId)]
    );
    return true;
  } catch (e) {
    if (!swallowMissing(e, "register devices for push")) {
      console.error("[push] register error:", e?.message || e);
    }
    return false;
  }
}

/** Sign-out, or a token FCM has retired. Safe to call with anything. */
export async function deletePushTokens(tokens = []) {
  const list = (Array.isArray(tokens) ? tokens : [tokens])
    .map((t) => String(t || "").trim())
    .filter(Boolean);
  if (!list.length) return 0;
  try {
    const { rowCount } = await query(`DELETE FROM push_tokens WHERE token = ANY($1::text[])`, [list]);
    return rowCount;
  } catch (e) {
    if (!swallowMissing(e, "remove device tokens")) {
      console.error("[push] delete error:", e?.message || e);
    }
    return 0;
  }
}

/**
 * Every token that should hear about an alarm on a site, at this priority.
 *
 * Two audiences, unioned and de-duplicated by token:
 *
 * 1. **The site's own contacts, matched by email.** `flattenSiteContacts`
 *    yields email addresses, and push needs a device — so the bridge is
 *    `users.email`. This is not a widening of the audience: those addresses
 *    mostly COME from user accounts in the first place (`siteContacts.js`
 *    resolves the security and NOC staffing straight out of Users & Roles by
 *    role and region). A manually-typed alert address that belongs to nobody
 *    with an account simply has no device to reach, and still gets the email.
 *
 * 2. **Every active admin and superadmin**, site or no site.
 *
 * `status = 'Active'` on both, matching `resolveSecurityStaff`: a suspended
 * account should stop receiving alarms without anyone having to remember to
 * unregister their handset.
 *
 * **And then the security side is filtered out of anything below Critical.**
 * That is not a preference, it is the same rule the rest of the product
 * enforces: `alarmPerms()` sets `criticalOnly` for a non-admin on the security
 * side, `listAlarms` forces their list query to Critical, and the alarm detail
 * route 403s them outright on anything else. A notification is a disclosure —
 * the alarm's name, the site, the device and the time, on a lock screen — so
 * without this a response-company user would be told about every Low Battery on
 * their site and then be refused the alarm when they tapped it.
 *
 * "Security side" is transcribed from `alarmPerms`: the `field_resp` and `sec_*`
 * roles, or membership of a company whose purposes include Response. Admins are
 * never critical-only, which is why the role check comes first.
 *
 * @param {string[]} emails site contact emails, any case
 * @param {string} priority the raised alarm's priority
 * @returns {Promise<Array<{token,userId,name,email,role,reason}>>}
 */
export async function tokensForSiteAlarm(emails = [], priority = "") {
  const list = [...new Set(
    (emails || []).map((e) => String(e || "").trim().toLowerCase()).filter(Boolean)
  )];
  const isCritical = String(priority || "") === "Critical";
  try {
    const { rows } = await query(
      `SELECT p.token,
              u.id    AS user_id,
              u.name,
              u.email,
              u.role,
              -- Which audience put them on this list. Kept per row because it
              -- lands in the notifications log, where "why did MY phone buzz"
              -- is the question the log has to be able to answer.
              CASE WHEN lower(u.email) = ANY($1::text[]) THEN 'Site contact'
                   ELSE 'Administrator' END AS reason
         FROM push_tokens p
         JOIN users u ON u.id = p.user_id
         LEFT JOIN companies c ON c.id = u.company_id
        WHERE u.status = 'Active'
          AND (lower(u.email) = ANY($1::text[]) OR u.role IN ('superadmin','admin'))
          AND (
            $2::boolean
            OR u.role IN ('superadmin','admin')
            OR NOT (
              u.role = 'field_resp'
              OR u.role LIKE 'sec\\_%'
              OR EXISTS (
                SELECT 1 FROM unnest(COALESCE(c.purposes, '{}')) AS purpose
                 WHERE lower(purpose) = 'response'
              )
            )
          )`,
      [list, isCritical]
    );
    // De-dupe defensively. The token column is UNIQUE so the join cannot
    // duplicate one today, but a person who is both a site contact and an admin
    // must not be counted twice if that ever stops being true.
    const seen = new Set();
    const out = [];
    for (const r of rows) {
      if (seen.has(r.token)) continue;
      seen.add(r.token);
      out.push({
        token: r.token, userId: r.user_id, name: r.name,
        email: r.email, role: r.role, reason: r.reason,
      });
    }
    return out;
  } catch (e) {
    if (!swallowMissing(e, "reach devices by push")) {
      console.error("[push] recipient lookup error:", e?.message || e);
    }
    return [];
  }
}

/** This user's own installs — used to unregister every device on demand. */
export async function tokensForUser(userId) {
  if (userId == null) return [];
  try {
    const { rows } = await query(
      `SELECT token FROM push_tokens WHERE user_id = $1`, [Number(userId)]
    );
    return rows.map((r) => r.token);
  } catch (e) {
    if (!swallowMissing(e, "list a user's devices")) {
      console.error("[push] user token lookup error:", e?.message || e);
    }
    return [];
  }
}
