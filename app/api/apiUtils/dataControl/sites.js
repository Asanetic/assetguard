// app/api/apiUtils/dataControl/sites.js
// -----------------------------------------------------------------------------
// Site data access. A site is a registered location with an operational status.
// Statuses: Live | Testing | Maintenance | SMPMS | Pending | Offline | Inactive
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

const COLS = `id, code, name, region, location, devices, status, created_at`;

/** List sites, optionally filtered by search term, region and/or status. */
export async function listSites({ q, region, status } = {}) {
  const where = [];
  const params = [];

  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    const i = params.length;
    where.push(
      `(lower(name) LIKE $${i} OR lower(code) LIKE $${i} OR lower(location) LIKE $${i} OR lower(region) LIKE $${i})`
    );
  }
  if (region && region !== "all") {
    params.push(region);
    where.push(`region = $${params.length}`);
  }
  if (status && status !== "all") {
    params.push(status);
    where.push(`lower(status) = lower($${params.length})`);
  }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  // Include coordinates + a few detail columns so the sites map can plot markers
  // and fill popups without a second request.
  const { rows } = await query(
    `SELECT ${COLS}, lat, lng, county, dist_region, security_region,
            response_cluster, smpms_vendor,
            security_company, monitoring_company,
            armed, mute_until,
            (mute_until IS NOT NULL AND mute_until > now()) AS muted
       FROM sites ${clause} ORDER BY id ASC`,
    params
  );
  return rows;
}

/** Distinct region + status counts, for future summary chips. */
export async function siteStats() {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS n FROM sites GROUP BY status`
  );
  return rows.reduce((acc, r) => ((acc[r.status] = r.n), acc), {});
}

/** Full row incl. detail columns + JSONB (for the View/detail page). */
export async function getSite(id) {
  const { rows } = await query(`SELECT * FROM sites WHERE id = $1`, [id]);
  return rows[0] || null;
}

// Recent alarm activity for a site (its devices), newest first.
export async function recentSiteActivity(siteId, limit = 12) {
  const { rows } = await query(
    `SELECT a.id, a.name, a.priority, a.status, a.created_at, a.device_id
       FROM alarms a
       JOIN devices d ON d.device_id = a.device_id
      WHERE d.site_id = $1
      ORDER BY a.created_at DESC
      LIMIT $2`,
    [siteId, limit]
  );
  return rows;
}

export async function getSiteByCode(code) {
  const { rows } = await query(`SELECT ${COLS} FROM sites WHERE code = $1`, [code]);
  return rows[0] || null;
}

/**
 * Create a site. `code` must be unique. Accepts the simple listing fields as
 * well as the full "Add site" form payload (contacts/company/security/noc/
 * alerts are kept together in `details` JSONB).
 */
export async function createSite({
  code, name, region = null, location = null, devices = 0, status = "Pending",
  smpms_vendor = null, dist_region = null, county = null, lat = null, lng = null,
  response_cluster = null, security_region = null, country = null,
  security_company = null, monitoring_company = null, details = null,
}) {
  const { rows } = await query(
    `INSERT INTO sites
       (code, name, region, location, devices, status,
        smpms_vendor, dist_region, county, lat, lng,
        response_cluster, security_region, country,
        security_company, monitoring_company, details)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17::jsonb)
     RETURNING ${COLS}`,
    [
      code, name, region, location, Number(devices) || 0, status,
      smpms_vendor, dist_region, county, lat, lng,
      response_cluster, security_region, country,
      security_company, monitoring_company,
      details ? JSON.stringify(details) : null,
    ]
  );
  return rows[0];
}

/** Patch a site. Only provided fields change (supports the full Add/Edit form). */
export async function updateSite(id, patch = {}) {
  const allowed = [
    "code", "name", "region", "location", "devices", "status",
    "smpms_vendor", "dist_region", "county", "lat", "lng",
    "response_cluster", "security_region", "country",
    "security_company", "monitoring_company",
  ];
  const sets = [];
  const params = [];
  for (const key of allowed) {
    if (patch[key] !== undefined) {
      let v = patch[key];
      if (key === "devices") v = Number(v) || 0;
      if (key === "lat" || key === "lng") v = (v === "" || v == null) ? null : Number(v);
      params.push(v);
      sets.push(`${key} = $${params.length}`);
    }
  }
  if (patch.details !== undefined) {
    params.push(patch.details ? JSON.stringify(patch.details) : null);
    sets.push(`details = $${params.length}::jsonb`);
  }
  if (!sets.length) return getSite(id);
  params.push(id);
  const { rows } = await query(
    `UPDATE sites SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
    params
  );
  return rows[0] || null;
}

export async function deleteSite(id) {
  await query(`DELETE FROM sites WHERE id = $1`, [id]);
  return true;
}

// ---- batch operations (Group sites) ---------------------------------------
const BATCH_COLS = {
  region: "region", dist_region: "dist_region", response_cluster: "response_cluster",
  security_region: "security_region", smpms_vendor: "smpms_vendor",
  security_company: "security_company", monitoring_company: "monitoring_company", status: "status",
};

/** Apply the same column patch to many sites at once. Returns rows affected. */
export async function batchUpdateSites(ids = [], patch = {}) {
  if (!ids.length) return 0;
  const sets = [];
  const params = [];
  for (const k in patch) {
    if (BATCH_COLS[k]) { params.push(patch[k]); sets.push(`${BATCH_COLS[k]} = $${params.length}`); }
  }
  if (!sets.length) return 0;
  params.push(ids);
  const { rowCount } = await query(
    `UPDATE sites SET ${sets.join(", ")} WHERE id = ANY($${params.length}::bigint[])`,
    params
  );
  return rowCount;
}

export async function batchDeleteSites(ids = []) {
  if (!ids.length) return 0;
  const { rowCount } = await query(`DELETE FROM sites WHERE id = ANY($1::bigint[])`, [ids]);
  return rowCount;
}

// ---- status interlink (site <-> devices) ----------------------------------
// A site's status and its devices' statuses are linked:
//   • Cascade DOWN: setting a site Live/Testing/Maintenance applies that to every
//     device at the site (cascadeStatusToDevices).
//   • Roll UP: whenever devices change, a site whose devices ALL share one
//     effective state auto-switches to that state; a mixed site is "Live".
//     (recomputeSiteStatus). Inactive/Offline therefore surface from the devices.
// A device's *effective* state = its stored status (Inactive/Testing/Maintenance),
// else "Offline" when it is overdue past its own wake interval (+tolerance), else
// "Live". This mirrors the offline/heartbeat model used elsewhere.

const STATE_LABEL = {
  live: "Live", offline: "Offline", inactive: "Inactive",
  testing: "Testing", maintenance: "Maintenance",
};

/** Push a status to all of a site set's devices (used for Live/Testing/Maintenance). */
export async function cascadeStatusToDevices(siteIds = [], status) {
  if (!siteIds.length || !status) return 0;
  const { rowCount } = await query(
    `UPDATE devices SET status = $1 WHERE site_id = ANY($2::bigint[])`,
    [String(status), siteIds]
  );
  return rowCount;
}

/**
 * Recompute one site's status from its devices' effective states and store it.
 * Returns the new status, or null when the site has no devices (left as-is).
 */
export async function recomputeSiteStatus(siteId) {
  if (!siteId) return null;

  // A scheduled maintenance window (details.maintenance_window {start,end})
  // OVERRIDES the device roll-up while active: during the window the site is
  // Maintenance (so its alarms become test alarms). An ended window is cleared,
  // then normal device-derived status resumes. A not-yet-started window is ignored.
  try {
    const { rows: sr } = await query(`SELECT details FROM sites WHERE id = $1`, [siteId]);
    const win = sr[0]?.details?.maintenance_window;
    if (win && win.start && win.end) {
      const now = Date.now(), start = Date.parse(win.start), end = Date.parse(win.end);
      if (Number.isFinite(start) && Number.isFinite(end)) {
        if (now >= start && now < end) {
          await query(`UPDATE sites SET status = 'Maintenance' WHERE id = $1`, [siteId]);
          return "Maintenance";
        }
        if (now >= end) {
          await query(`UPDATE sites SET details = details - 'maintenance_window' WHERE id = $1`, [siteId]);
        }
      }
    }
  } catch {}

  const { rows } = await query(
    `WITH eff AS (
       SELECT CASE
         WHEN lower(coalesce(d.status,'')) IN ('inactive','testing','maintenance')
           THEN lower(d.status)
         WHEN d.last_seen IS NULL THEN 'offline'
         WHEN now() - d.last_seen >
              (COALESCE(NULLIF(d.config->>'wake_interval_sec','')::numeric, 86400)
             + COALESCE(NULLIF(d.config->>'hb_tolerance_sec','')::numeric, 300)) * interval '1 second'
           THEN 'offline'
         ELSE 'live'
       END AS state
       FROM devices d
      WHERE d.site_id = $1
     )
     SELECT count(*)::int AS n,
            count(DISTINCT state)::int AS distinct_states,
            min(state) AS only_state
       FROM eff`,
    [siteId]
  );
  const r = rows[0] || { n: 0 };
  if (!r.n) return null; // no devices → don't clobber a manually-set status
  const next = r.distinct_states === 1 ? (STATE_LABEL[r.only_state] || "Live") : "Live";
  await query(`UPDATE sites SET status = $2 WHERE id = $1`, [siteId, next]);
  return next;
}

/** Recompute every site touched by a set of device ids (after a device changes). */
export async function recomputeSitesForDevices(deviceIds = []) {
  if (!deviceIds.length) return 0;
  const { rows } = await query(
    `SELECT DISTINCT site_id FROM devices
      WHERE id = ANY($1::bigint[]) AND site_id IS NOT NULL`,
    [deviceIds]
  );
  let n = 0;
  for (const row of rows) { try { await recomputeSiteStatus(row.site_id); n++; } catch {} }
  return n;
}

/** Recompute status for every site that has devices (used by the offline sweep). */
export async function recomputeAllSiteStatuses() {
  const { rows } = await query(
    `SELECT DISTINCT site_id FROM devices WHERE site_id IS NOT NULL`
  );
  let n = 0;
  for (const row of rows) { try { await recomputeSiteStatus(row.site_id); n++; } catch {} }
  return n;
}

// ---- arm / disarm + mute ---------------------------------------------------
/** Arm (armed=true) or disarm (false) monitoring for a set of sites. */
export async function setSitesArmed(ids = [], armed = true) {
  if (!ids.length) return 0;
  const { rowCount } = await query(
    `UPDATE sites SET armed = $1 WHERE id = ANY($2::bigint[])`,
    [!!armed, ids]
  );
  return rowCount;
}

/**
 * Mute alarms for a set of sites until `now() + amount unit`. Pass amount<=0 to
 * clear the mute. `unit` ∈ minutes|hours|days.
 */
export async function setSitesMute(ids = [], amount = 0, unit = "hours") {
  if (!ids.length) return 0;
  const n = Number(amount) || 0;
  if (n <= 0) {
    const { rowCount } = await query(
      `UPDATE sites SET mute_until = NULL WHERE id = ANY($1::bigint[])`, [ids]);
    return rowCount;
  }
  const u = ["minutes", "hours", "days"].includes(String(unit)) ? String(unit) : "hours";
  const { rowCount } = await query(
    `UPDATE sites SET mute_until = now() + ($1 || ' ' || $2)::interval
      WHERE id = ANY($3::bigint[])`,
    [String(n), u, ids]
  );
  return rowCount;
}

/** Transfer a set of sites to another CLIENT/owning company (details.company). */
export async function setSitesClientCompany(ids = [], companyName) {
  if (!ids.length || !companyName) return 0;
  const { rowCount } = await query(
    `UPDATE sites
        SET details = COALESCE(details, '{}'::jsonb)
                    || jsonb_build_object('company',
                         COALESCE(details->'company', '{}'::jsonb)
                         || jsonb_build_object('name', $1::text))
      WHERE id = ANY($2::bigint[])`,
    [String(companyName), ids]
  );
  return rowCount;
}

/**
 * Schedule a maintenance window for a set of sites. Pass start+end ISO strings to
 * set it, or null/empty to clear it. When the window is already active the site is
 * moved to Maintenance immediately (recompute honours it thereafter).
 */
export async function setSitesMaintenanceWindow(ids = [], start, end) {
  if (!ids.length) return 0;
  if (!start || !end) {
    const { rowCount } = await query(
      `UPDATE sites SET details = COALESCE(details,'{}'::jsonb) - 'maintenance_window'
        WHERE id = ANY($1::bigint[])`, [ids]);
    for (const id of ids) { try { await recomputeSiteStatus(id); } catch {} }
    return rowCount;
  }
  const { rowCount } = await query(
    `UPDATE sites
        SET details = COALESCE(details,'{}'::jsonb)
                    || jsonb_build_object('maintenance_window',
                         jsonb_build_object('start', $1::text, 'end', $2::text))
      WHERE id = ANY($3::bigint[])`,
    [String(start), String(end), ids]
  );
  for (const id of ids) { try { await recomputeSiteStatus(id); } catch {} }
  return rowCount;
}

/**
 * The live monitoring policy for a site (read by the alarm-notify layer).
 * @returns {Promise<{armed:boolean, muted:boolean, testing:boolean, status:string}|null>}
 */
export async function getSitePolicy(siteId) {
  if (!siteId) return null;
  const { rows } = await query(
    `SELECT status, COALESCE(armed, true) AS armed,
            (mute_until IS NOT NULL AND mute_until > now()) AS muted
       FROM sites WHERE id = $1`,
    [siteId]
  );
  const s = rows[0];
  if (!s) return null;
  const testing = /^(testing|maintenance)$/i.test(String(s.status || ""));
  return { armed: !!s.armed, muted: !!s.muted, testing, status: s.status };
}

// -----------------------------------------------------------------------------
// Bulk import (from the "Import sites from Excel" flow).
// Each row carries the nine sheet columns. We upsert by `code`:
//   - new code  -> INSERT (status defaults to Pending, devices 0)
//   - seen code -> UPDATE the detail columns (keeps its status/devices)
// Returns { imported, updated, total }.
// -----------------------------------------------------------------------------
function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function importSites(rows = []) {
  let imported = 0;
  let updated = 0;

  for (const raw of rows) {
    const code = String(raw.code || "").trim().toUpperCase();
    const name = String(raw.name || "").trim();
    if (!code || !name) continue; // required fields — skip incomplete rows

    // The listing shows Region + Location; derive them from the richer columns.
    const region = (raw.dist || raw.sec || "").toString().trim() || null;
    const location = (raw.county || "").toString().trim() || null;

    // xmax = 0 on the returned row means the row was freshly inserted.
    const { rows: out } = await query(
      `INSERT INTO sites
         (code, name, region, location, smpms_vendor, dist_region, county, lat, lng,
          response_cluster, security_region, security_company, monitoring_company)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (code) DO UPDATE SET
         name               = EXCLUDED.name,
         region             = EXCLUDED.region,
         location           = EXCLUDED.location,
         smpms_vendor       = EXCLUDED.smpms_vendor,
         dist_region        = EXCLUDED.dist_region,
         county             = EXCLUDED.county,
         lat                = EXCLUDED.lat,
         lng                = EXCLUDED.lng,
         response_cluster   = EXCLUDED.response_cluster,
         security_region    = EXCLUDED.security_region,
         security_company   = COALESCE(EXCLUDED.security_company, sites.security_company),
         monitoring_company = COALESCE(EXCLUDED.monitoring_company, sites.monitoring_company)
       RETURNING (xmax = 0) AS inserted`,
      [
        code, name, region, location,
        (raw.smpms || "").toString().trim() || null,
        (raw.dist || "").toString().trim() || null,
        (raw.county || "").toString().trim() || null,
        num(raw.lat), num(raw.lng),
        (raw.cluster || "").toString().trim() || null,
        (raw.sec || "").toString().trim() || null,
        (raw.secco || "").toString().trim() || null,
        (raw.monco || "").toString().trim() || null,
      ]
    );
    if (out[0]?.inserted) imported++; else updated++;
  }

  return { imported, updated, total: imported + updated };
}
