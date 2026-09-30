// app/api/apiUtils/dataControl/userSites.js
// Explicit user -> site assignments (user_sites), used when a user's effective
// site-scope mode is 'list'. See db/user_site_scope.sql and authUtils/regionScope.js.

import { query } from "../s_env/db.js";

/** The site ids assigned to a user. */
export async function getUserSiteIds(userId) {
  const { rows } = await query(`SELECT site_id FROM user_sites WHERE user_id = $1`, [userId]);
  return rows.map((r) => Number(r.site_id)).filter(Number.isFinite);
}

/** The assigned sites (id, code, name, region) for the admin list. */
export async function listUserSites(userId) {
  const { rows } = await query(
    `SELECT s.id, s.code, s.name, s.security_region
       FROM user_sites us JOIN sites s ON s.id = us.site_id
      WHERE us.user_id = $1
      ORDER BY s.name`,
    [userId]
  );
  return rows;
}

/** Add site assignments (idempotent). siteIds: number[]. */
export async function addUserSites(userId, siteIds = []) {
  let added = 0;
  for (const sid of siteIds) {
    const { rowCount } = await query(
      `INSERT INTO user_sites (user_id, site_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [userId, sid]
    );
    added += rowCount;
  }
  return added;
}

/** Remove one assignment. */
export async function removeUserSite(userId, siteId) {
  const { rowCount } = await query(
    `DELETE FROM user_sites WHERE user_id = $1 AND site_id = $2`,
    [userId, siteId]
  );
  return rowCount > 0;
}

/** Replace a user's whole assignment set with siteIds. */
export async function setUserSites(userId, siteIds = []) {
  await query(`DELETE FROM user_sites WHERE user_id = $1`, [userId]);
  return addUserSites(userId, siteIds);
}

/**
 * Bulk import assignments from rows of { user, site }.
 *   user = email (preferred) or exact name (case-insensitive)
 *   site = site code (preferred) or exact name (case-insensitive)
 * Optionally flips each imported user's mode to 'list' so the assignment takes
 * effect immediately (setListMode).
 *
 * @returns {{ imported, skipped, unknownUsers:string[], unknownSites:string[], users:number }}
 */
// The only role that can be scoped to an assigned site list (keep in sync with
// authUtils/regionScope.js LIST_SCOPE_ROLE).
const LIST_SCOPE_ROLE = "field_tech";

export async function importUserSites(rows = [], { setListMode = true } = {}) {
  // Resolve directories once.
  const { rows: users } = await query(`SELECT id, lower(email) AS email, lower(name) AS name, role FROM users`);
  const { rows: sites } = await query(`SELECT id, lower(code) AS code, lower(name) AS name FROM sites`);
  const userByEmail = new Map(users.filter((u) => u.email).map((u) => [u.email, u]));
  const userByName = new Map(users.filter((u) => u.name).map((u) => [u.name, u]));
  const siteByCode = new Map(sites.filter((s) => s.code).map((s) => [s.code, s.id]));
  const siteByName = new Map(sites.filter((s) => s.name).map((s) => [s.name, s.id]));

  const perUser = new Map(); // userId -> Set(siteId)
  const unknownUsers = new Set();
  const unknownSites = new Set();
  const notTechnicians = new Set(); // matched a user, but not a field technician
  let skipped = 0;

  for (const r of rows) {
    const uTok = String(r?.user || "").trim().toLowerCase();
    const sTok = String(r?.site || "").trim().toLowerCase();
    if (!uTok || !sTok) { skipped += 1; continue; }
    const user = userByEmail.get(uTok) || userByName.get(uTok);
    const sid = siteByCode.get(sTok) || siteByName.get(sTok);
    if (!user) { unknownUsers.add(r.user); skipped += 1; continue; }
    // Assigned-site scoping is a FIELD TECHNICIAN feature only — a non-technician
    // is left region-scoped, so importing sites for them would do nothing.
    if (user.role !== LIST_SCOPE_ROLE) { notTechnicians.add(r.user); skipped += 1; continue; }
    if (!sid) { unknownSites.add(r.site); skipped += 1; continue; }
    if (!perUser.has(user.id)) perUser.set(user.id, new Set());
    perUser.get(user.id).add(sid);
  }

  let imported = 0;
  for (const [uid, sids] of perUser) {
    imported += await addUserSites(uid, [...sids]);
    if (setListMode) {
      await query(`UPDATE users SET site_scope_mode = 'list' WHERE id = $1`, [uid]);
    }
  }

  return {
    imported,
    skipped,
    users: perUser.size,
    unknownUsers: [...unknownUsers],
    unknownSites: [...unknownSites],
    notTechnicians: [...notTechnicians],
  };
}
