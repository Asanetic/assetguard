// app/api/apiUtils/notify/disturbanceTeam.js
// -----------------------------------------------------------------------------
// WHO a DISTURBANCE (warning or alarm) must reach, beyond the site's own typed
// contacts:
//
//   • EVERY active NOC user — the monitoring control room covers all sites, so
//     NOC is NOT scoped by site or region.
//   • The RESPONSE team tied to the site — a response/manager user who is either
//     ASSIGNED to the site (user_sites) OR has the site's security_region
//     EXPLICITLY in their regions. An empty regions list is NOT country-wide
//     here: a response user with no region and no assignment is paged for no
//     site, so disturbances never cross into other regions.
//
// Two shapes of the same audience: `disturbanceTeamContacts` for SMS + email
// (off the user row), `disturbanceTeamTokens` for push (their device tokens).
// Both take ($1 siteId, $2 securityRegion) in that order. Never throw — a lookup
// failure returns [] and the other recipients still stand.
// -----------------------------------------------------------------------------
import { query } from "../s_env/db.js";

// The one audience definition, shared by both queries. $1 = site id, $2 = the
// site's security_region (may be null).
const AUDIENCE = `(
  -- Recipient TYPE: a NOC user or a response/manager user — by the user's OWN
  -- role, or by their company's purpose tag (noc / response).
  (
    u.role = 'noc'
    OR u.role IN ('field_resp', 'company_mgr', 'asst_mgr')
    OR u.role LIKE 'sec\\_%'
    OR EXISTS (SELECT 1 FROM unnest(COALESCE(c.purposes, '{}')) AS pp
                WHERE lower(pp) IN ('noc', 'response'))
  )
  -- …AND tied to THIS site. NOC is NO LONGER global: EVERYONE, NOC included, must
  -- be ASSIGNED to the site (user_sites) OR have the site's security_region
  -- EXPLICITLY in their regions. An empty regions list is NOT country-wide here.
  -- So nobody — not a NOC user, not anyone in a NOC/Response-purpose company — is
  -- paged for a site outside their assignment/region. (Site visibility still
  -- treats empty regions as country-wide; the notification audience is
  -- intentionally stricter than what a user can see.)
  --
  -- CONSEQUENCE: a NOC user with no site assignment and no matching region now
  -- receives NOTHING. NOC users must be assigned to their sites (or given the
  -- region) to be paged.
  AND (
    EXISTS (SELECT 1 FROM user_sites us WHERE us.user_id = u.id AND us.site_id = $1)
    OR ($2::text IS NOT NULL AND EXISTS (
          SELECT 1 FROM unnest(u.regions) AS ur WHERE lower(ur) = lower($2::text)))
  )
)`;

const ROLE_LABEL = `CASE
    WHEN u.role = 'noc'                       THEN 'Monitoring — NOC user'
    WHEN u.role = 'field_resp'                THEN 'Security — response user'
    WHEN u.role LIKE 'sec\\_%'                 THEN 'Security — manager'
    WHEN u.role IN ('company_mgr','asst_mgr') THEN 'Company manager'
    ELSE 'Response/NOC' END`;

/** The disturbance audience as SMS/email people: [{name, emails[], phones[], role}]. */
export async function disturbanceTeamContacts(siteId, securityRegion = null) {
  if (siteId == null) return [];
  try {
    const { rows } = await query(
      `SELECT u.name, u.email, u.phone, u.role, ${ROLE_LABEL} AS role_label
         FROM users u
         LEFT JOIN companies c ON c.id = u.company_id
        WHERE u.status = 'Active' AND ${AUDIENCE}`,
      [siteId, securityRegion]
    );
    return rows.map((r) => ({
      name: r.name || "",
      emails: r.email ? [r.email] : [],
      phones: r.phone ? [r.phone] : [],
      role: r.role_label,
    }));
  } catch (e) {
    console.error("[notify] disturbanceTeamContacts:", e?.message || e);
    return [];
  }
}

/** The disturbance audience as PUSH recipients: [{token, userId, name, email, role, reason}]. */
export async function disturbanceTeamTokens(siteId, securityRegion = null) {
  if (siteId == null) return [];
  try {
    const { rows } = await query(
      `SELECT p.token, u.id AS user_id, u.name, u.email, u.role, ${ROLE_LABEL} AS reason
         FROM technician_push_tokens p
         JOIN users u ON u.id::text = p.user_id
         LEFT JOIN companies c ON c.id = u.company_id
        WHERE p.disabled_at IS NULL
          AND u.status = 'Active'
          AND p.app IS DISTINCT FROM 'technician'
          AND ${AUDIENCE}`,
      [siteId, securityRegion]
    );
    return rows.map((r) => ({
      token: r.token, userId: r.user_id, name: r.name,
      email: r.email, role: r.role, reason: r.reason,
    }));
  } catch (e) {
    console.error("[notify] disturbanceTeamTokens:", e?.message || e);
    return [];
  }
}
