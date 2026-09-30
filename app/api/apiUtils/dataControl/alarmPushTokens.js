// app/api/apiUtils/dataControl/alarmPushTokens.js
// ---------------------------------------------------------------------------
// Which app installs an ALARM should reach by push.
//
// WHY THIS EXISTS ALONGSIDE dataControl/pushTokens.js
// ---------------------------------------------------
// `pushTokens.js` reads and writes `push_tokens`. Nothing on this deployment
// writes that table: `mainapp/push/register/route.js` calls
// `push.js savePushToken`, which writes `technician_push_tokens`, and
// `pushTokens.js registerPushToken` has no caller at all. So
// `tokensForSiteAlarm` was querying a table that is always empty for our apps,
// and alarm push could never have delivered to anyone.
//
// `push_tokens` is NOT repointed or dropped here. `db/technician_push_tokens.sql`
// records that it "already exists on this deployment, created by something
// outside this codebase" — repointing a table with an unknown owner to fix our
// bug is how you break their system to mend yours. It is left exactly as it is.
//
// This module is the same idea as `tokensForSiteAlarm`, reading the table that
// is actually populated, with one rule added — see `tokensForAlarm`.
//
// Degrades to "no tokens" when the table is missing, exactly as its predecessor
// does: a server without it keeps sending email and SMS and simply never pushes.
// It must never throw into the ingest path.
// ---------------------------------------------------------------------------
import { query } from "../s_env/db.js";

const MISSING = /relation .*technician_push_tokens.* does not exist/i;

function swallowMissing(e, what) {
  if (MISSING.test(e?.message || "")) {
    console.error(`[push] table missing — run db/technician_push_tokens.sql to ${what}.`);
    return true;
  }
  return false;
}

/**
 * Every device that should be told about this alarm.
 *
 * REAL ALARMS ONLY, and never to the technician app — see the WHERE clause.
 *
 * THREE audiences, unioned:
 *
 *  1. **Site contacts** — whoever is on the site's alert list, by email.
 *  2. **Administrators** — `superadmin` / `admin`, always.
 *  3. **The response app's users** — every role authorized for the Response app
 *     (`field_resp`, the security managers/assistants `sec_*`, AND the company
 *     managers / assistant managers `company_mgr` / `asst_mgr`), or anyone at a
 *     company whose purposes include Response. **Critical alarms only, and only
 *     within the regions the user is scoped to** (no regions set = country-wide).
 *
 * The third is new, and it is what makes the Response app work. The previous
 * rule reached site contacts and admins only, so a responder received nothing
 * unless somebody had happened to list their email against the site — which is
 * not how response teams are assigned.
 *
 * **PUSH MIRRORS VISIBILITY.** A security-side user is `criticalOnly`
 * everywhere else in the product: `alarmPerms` sets it, `listAlarms` forces
 * their query to Critical, and the alarm detail route 403s them on anything
 * lower. So they are pushed exactly what they are already allowed to open —
 * every Critical alarm, and nothing else. Pushing more would be a disclosure of
 * an alarm the app would then refuse to show them; pushing less would mean a
 * responder learning about a Critical from somebody phoning them.
 *
 * And the same guard the old rule had is kept for audience 1: a site contact
 * who happens to be on the security side still does not get sub-Critical
 * alarms. A notification is a disclosure — the alarm's name, the site, the
 * device and the time, on a lock screen.
 *
 * NOTE ON SCOPE: audience 3 is not yet narrowed to the responder's own cluster,
 * because that scoping does not exist server-side yet (backend delta 4 in
 * claude/response-team-app.md). Until it does, this matches what the app
 * already shows them, which is every Critical alarm. When cluster scoping
 * lands, narrow it HERE and in `listAlarms` together — the two must not
 * disagree, or a responder is paged about an alarm they cannot open.
 *
 * @param {string[]} emails site contact emails, any case
 * @param {string} priority the raised alarm's priority
 * @returns {Promise<Array<{token,userId,name,email,role,reason}>>}
 */
export async function tokensForAlarm(emails = [], priority = "", securityRegion = null) {
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
                   WHEN u.role IN ('superadmin','admin')  THEN 'Administrator'
                   ELSE 'Response team' END AS reason
         FROM technician_push_tokens p
         -- p.user_id is the JWT sub and is TEXT; users.id is numeric. The
         -- cast is on the USER side so any index on p.user_id still applies.
         JOIN users u ON u.id::text = p.user_id
         LEFT JOIN companies c ON c.id = u.company_id
        WHERE p.disabled_at IS NULL
          AND u.status = 'Active'
          -- THE TECHNICIAN APP NEVER RECEIVES A REAL ALARM.
          --
          -- It exists to install and test devices. A technician standing at a
          -- mast does not need every disturbance on the estate on their lock
          -- screen, and an app that buzzes about work that is not yours is an
          -- app whose notifications get switched off — including the test
          -- alarms it does need. Test alarms reach it by a different path
          -- entirely: store.js -> testAlarmPush.js -> pushSend.js.
          AND p.app IS DISTINCT FROM 'technician'
          AND (
                -- 1 + 2: site contacts and admins, with the security side held
                -- back below Critical exactly as before.
                (
                  (lower(u.email) = ANY($1::text[]) OR u.role IN ('superadmin','admin'))
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
                  )
                )
                -- 3: everyone authorized for the RESPONSE APP, Critical only, and
                -- only within THEIR region. This is the response-app role set from
                -- authUtils/appAccess.js — Field Response, the security managers /
                -- assistants (sec_*), AND the company managers / assistant managers
                -- (company_mgr / asst_mgr) — plus anyone at a Response-purpose company.
                -- (a user with no regions set is country-wide, covering every region.)
                OR (
                  $2::boolean
                  -- Case-insensitive region match: "WESTERN"/"Western"/"western"
                  -- all count as the user's region (see dataControl/sites.js).
                  AND (u.regions = '{}'::text[]
                       OR EXISTS (SELECT 1 FROM unnest(u.regions) AS ur
                                   WHERE lower(ur) = lower($3::text)))
                  AND (
                    u.role IN ('field_resp', 'company_mgr', 'asst_mgr')
                    OR u.role LIKE 'sec\\_%'
                    OR EXISTS (
                      SELECT 1 FROM unnest(COALESCE(c.purposes, '{}')) AS purpose
                       WHERE lower(purpose) = 'response'
                    )
                  )
                )
              )`,
      [list, isCritical, securityRegion]
    );

    // De-dupe by TOKEN. A responder who is also a site contact matches two
    // branches of that OR, and one handset must buzz once.
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

/**
 * Retire tokens Firebase has told us are dead (UNREGISTERED / INVALID).
 *
 * DISABLED, not deleted — `technician_push_tokens` is built to keep the row so
 * a token that comes back to life is one UPDATE, and so "why did this phone
 * stop getting pushes" stays answerable. The old `deletePushTokens` deleted,
 * because `push_tokens` has nowhere to record it.
 */
export async function disableDeadTokens(tokens = [], why = "unregistered") {
  const list = [...new Set((tokens || []).map((t) => String(t || "").trim()).filter(Boolean))];
  if (!list.length) return 0;
  try {
    const { rowCount } = await query(
      `UPDATE technician_push_tokens
          SET disabled_at = now(), disabled_why = $2
        WHERE token = ANY($1::text[]) AND disabled_at IS NULL`,
      [list, String(why)]
    );
    if (rowCount) console.log(`[push] disabled ${rowCount} dead token(s)`);
    return rowCount;
  } catch (e) {
    if (!swallowMissing(e, "retire dead tokens")) {
      console.error("[push] disable dead tokens:", e?.message || e);
    }
    return 0;
  }
}
