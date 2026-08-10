// app/api/apiUtils/dataControl/siteContacts.js
// Resolve a site's autofill contacts from REAL data:
//   - client company  <- Settings/org (national, covers every site)
//   - security staff   <- Users & Roles, matched to the site's security region
//
// Security-company staffing comes from users holding the security roles, scoped
// by their assigned regions (an empty region scope = nationwide, so those people
// appear on every site). The company is decided by whoever manages the region on
// the ground, and the country tier is read from that same company so the two
// tiers never drift apart. Register/approve a user tomorrow and every site in
// their region picks them up with no edit.

import { query } from "../s_env/db.js";
import { getOrgConfig } from "./appConfig.js";

const SEC_ROLES = ["sec_country", "sec_country_asst", "sec_regional", "sec_regional_asst"];

function asContact(u) {
  if (!u) return null;
  return {
    name: u.name,
    phones: u.phone ? [u.phone] : [],
    emails: u.email ? [u.email] : [],
    company: u.company || "",
    userId: u.id,
  };
}

/**
 * Resolve the security-company staffing for a security region from Users.
 * @param {string} region
 * @returns {Promise<{company:string, country:{opsMgr,opsAsst}, region:{fieldMgr,fieldAsst}, staffed:boolean}>}
 */
export async function resolveSecurityStaff(region) {
  const { rows } = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.role, u.regions, c.name AS company
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
      WHERE u.status = 'Active' AND u.role = ANY($1)`,
    [SEC_ROLES]
  );

  const covers = (u) => !u.regions || u.regions.length === 0 || u.regions.includes(region);
  // Prefer a user explicitly scoped to this region over a nationwide one.
  const rank = (u) => ((u.regions || []).includes(region) ? 0 : 1);
  const firstFor = (role, needCover, company) =>
    rows
      .filter((u) => u.role === role
        && (!needCover || covers(u))
        && (!company || !u.company || u.company === company))
      .sort((a, b) => rank(a) - rank(b))[0] || null;

  // The regional manager decides the company for the region.
  const regionalMgr = region ? firstFor("sec_regional", true) : null;
  const company = regionalMgr ? regionalMgr.company : null;

  const countryMgr = firstFor("sec_country", false, company);
  const countryAsst = firstFor("sec_country_asst", false, company);
  const regionalAsst = region ? firstFor("sec_regional_asst", true, company) : null;

  return {
    company: company || "",
    country: { opsMgr: asContact(countryMgr), opsAsst: asContact(countryAsst) },
    region: { fieldMgr: asContact(regionalMgr), fieldAsst: asContact(regionalAsst) },
    staffed: !!regionalMgr,
  };
}

/** Everything the Add-site form autofills for a given region: client company + security staff. */
export async function resolveSiteContacts(region) {
  const [org, security] = await Promise.all([getOrgConfig(), resolveSecurityStaff(region || "")]);
  return { org, security };
}
