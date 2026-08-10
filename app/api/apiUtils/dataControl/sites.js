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
            security_company, monitoring_company
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
