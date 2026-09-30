// app/api/apiUtils/authUtils/regionScope.js
// Site visibility scope for the signed-in user. Most users are scoped by REGION
// (users.regions; empty = country-wide). FIELD TECHNICIANS are the only role that
// can instead be scoped to an explicit imported LIST of sites (user_sites) — the
// installation team is often given a fixed set of sites rather than a whole
// region. Which mode a technician uses comes from a global default
// (app_config 'siteScope') and an optional per-technician override
// (users.site_scope_mode). Everyone who is not a field technician is ALWAYS
// region-scoped, regardless of the default or any stray override.
// Platform admins (superadmin/admin) always see everything.
//
// The JWT carries neither regions nor the mode, so we read them from the DB by
// the token's sub.
import { query } from "../s_env/db.js";
import { getSiteScopeConfig } from "../dataControl/appConfig.js";

const ADMIN_ROLES = new Set(["superadmin", "admin"]);
// Only this role may be scoped by an imported site list.
const LIST_SCOPE_ROLE = "field_tech";

/**
 * Resolve a user's EFFECTIVE scope.
 * @returns {Promise<
 *   { all:true } |
 *   { all:false, mode:'region', regions:string[] } |
 *   { all:false, mode:'list', siteIds:number[] }
 * >}
 */
export async function getEffectiveSiteScope(me) {
  if (!me?.sub) return { all: false, mode: "region", regions: [] };
  if (ADMIN_ROLES.has(me.role)) return { all: true };
  try {
    const { rows } = await query(
      `SELECT regions, site_scope_mode, role FROM users WHERE id = $1`,
      [me.sub]
    );
    const row = rows[0] || {};
    const role = row.role || me.role;

    // List mode is available ONLY to field technicians. For every other role the
    // mode is forced to 'region', so a leftover override or a 'list' global
    // default never changes what a non-technician sees.
    let mode = "region";
    if (role === LIST_SCOPE_ROLE) {
      const override = row.site_scope_mode;
      const desired = override === "region" || override === "list"
        ? override
        : (await getSiteScopeConfig()).mode;
      mode = desired === "list" ? "list" : "region";
    }

    if (mode === "list") {
      const { rows: a } = await query(
        `SELECT site_id FROM user_sites WHERE user_id = $1`,
        [me.sub]
      );
      // An empty list is a real state: the technician has been put in list mode
      // but has no sites assigned yet, so they see nothing until imported.
      return { all: false, mode: "list", siteIds: a.map((r) => Number(r.site_id)).filter(Number.isFinite) };
    }

    const regions = Array.isArray(row.regions) ? row.regions.filter(Boolean) : [];
    // Region mode with no regions set = country-wide.
    return regions.length
      ? { all: false, mode: "region", regions }
      : { all: true };
  } catch (e) {
    console.error("[siteScope]", e?.message || e);
    return { all: true }; // fail open (never lock a user out on a DB hiccup)
  }
}

/**
 * The filters to pass to the list functions. Exactly one of `regions` / `siteIds`
 * is a non-null array (or both null for admin / country-wide). List functions
 * apply whichever is set; passing both null means "no filter".
 * @returns {Promise<{ regions: string[]|null, siteIds: number[]|null }>}
 */
export async function scopeFilterFor(me) {
  const s = await getEffectiveSiteScope(me);
  if (s.all) return { regions: null, siteIds: null };
  if (s.mode === "list") return { regions: null, siteIds: s.siteIds };
  return { regions: s.regions, siteIds: null };
}

/** Back-compat: the regions array to pass to list functions, or null. NOTE: a
 *  user in LIST mode returns null here, so callers that scope must use
 *  scopeFilterFor and honour siteIds — do not add new callers of this. */
export async function regionFilterFor(me) {
  const f = await scopeFilterFor(me);
  return f.regions;
}

/** Legacy shape kept for any importer of it. */
export async function getUserRegionScope(me) {
  const s = await getEffectiveSiteScope(me);
  if (s.all) return { all: true, regions: [] };
  if (s.mode === "region") return { all: false, regions: s.regions };
  return { all: false, regions: [] };
}
