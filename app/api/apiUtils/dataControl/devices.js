// app/api/apiUtils/dataControl/devices.js
// Device registry access. The IMEI lookup runs on every ingested packet.
import { query } from "../s_env/db.js";

export async function findDeviceByImei(imei) {
  const { rows } = await query(
    `SELECT d.*, s.name AS site, s.code AS site_code
       FROM devices d
       LEFT JOIN sites s ON s.id = d.site_id
      WHERE btrim(d.imei) = btrim($1)
      LIMIT 1`,
    [String(imei ?? "").trim()]
  );
  return rows[0] || null;
}

export async function touchDeviceLastSeen(id) {
  await query(`UPDATE devices SET last_seen = now() WHERE id = $1`, [id]);
}

export async function listDevices({ q, site_id, status, orientation } = {}) {
  const where = [];
  const params = [];
  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    const i = params.length;
    where.push(`(lower(d.device_id) LIKE $${i} OR lower(d.imei) LIKE $${i} OR lower(s.name) LIKE $${i})`);
  }
  if (site_id) { params.push(site_id); where.push(`d.site_id = $${params.length}`); }
  if (status && status !== "all") { params.push(status); where.push(`lower(d.status) = lower($${params.length})`); }
  if (orientation && orientation !== "all") { params.push(orientation); where.push(`lower(d.orientation) = lower($${params.length})`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT d.*, s.name AS site, s.code AS site_code, s.region AS region,
            s.lat AS site_lat, s.lng AS site_lng
       FROM devices d
       LEFT JOIN sites s ON s.id = d.site_id ${clause}
      ORDER BY d.id ASC`,
    params
  );
  return rows;
}

/** Status counts, for the devices-map legend. */
export async function deviceStatusCounts() {
  const { rows } = await query(`SELECT status, COUNT(*)::int AS n FROM devices GROUP BY status`);
  return rows.reduce((a, r) => ((a[r.status] = r.n), a), {});
}

// ---- registration (Add device + Import devices) ----------------------------
// Devices are registered with just a site, an IMEI and an orientation; the human
// display id is generated the same way the prototype documents it:
//   <site-number>_<SiteNamePascal>_<V|H>   e.g. 001_NairobiHeadquarters_V
// battery / data / last_seen stay null until the device starts reporting.

function siteNumFromCode(code) {
  const m = String(code || "").match(/(\d+)\s*$/);
  return m ? m[1].padStart(3, "0") : "000";
}
function normOrientation(v) {
  const s = String(v || "").trim().toLowerCase();
  if (s.startsWith("v")) return "Vertical";
  if (s.startsWith("h")) return "Horizontal";
  return null;
}
/**
 * Resolve a site from a "Site ID" reference. A Site ID is a number (e.g. 619142),
 * but we also accept the full site code (NBI-HQ-001) so existing sheets keep
 * working. Matching order: exact code -> primary key id -> the numeric part of
 * the code (001 in NBI-HQ-001).
 */
async function getSiteByRef(ref) {
  const s = String(ref || "").trim();
  if (!s) return null;
  let r = await query(`SELECT id, name, code FROM sites WHERE upper(code) = upper($1) LIMIT 1`, [s]);
  if (r.rows[0]) return r.rows[0];
  if (/^\d+$/.test(s)) {
    const n = parseInt(s, 10);
    r = await query(`SELECT id, name, code FROM sites WHERE id = $1 LIMIT 1`, [n]);
    if (r.rows[0]) return r.rows[0];
    r = await query(`SELECT id, name, code FROM sites WHERE NULLIF(regexp_replace(code, '\\D', '', 'g'), '')::int = $1 LIMIT 1`, [n]);
    if (r.rows[0]) return r.rows[0];
  }
  return null;
}
async function deviceIdExists(id) {
  const { rows } = await query(`SELECT 1 FROM devices WHERE device_id = $1 LIMIT 1`, [id]);
  return rows.length > 0;
}
/** Generate a unique display id for a site + orientation (bumps on collision). */
async function uniqueDeviceId(site, orientation) {
  const oL = (normOrientation(orientation) || "Vertical").charAt(0);
  const base = `${siteNumFromCode(site.code)}_${String(site.name || "").replace(/\s+/g, "")}_${oL}`;
  let candidate = base, i = 1;
  // eslint-disable-next-line no-await-in-loop
  while (await deviceIdExists(candidate)) { i++; candidate = `${base}${i}`; }
  return candidate;
}

/** Register one device. Returns the created row (joined to its site). */
export async function createDevice({ site_code, imei, orientation, sim = null, status = "Testing", config = null }) {
  const code = String(site_code || "").trim();
  const imeiV = String(imei || "").trim();
  if (!imeiV) throw new Error("IMEI is required");
  const site = await getSiteByRef(code);
  if (!site) throw new Error(`Unknown Site ID: ${code}`);
  const o = normOrientation(orientation);
  const device_id = await uniqueDeviceId(site, o);
  const { rows } = await query(
    `INSERT INTO devices (device_id, imei, sim, site_id, orientation, status)
       VALUES ($1,$2,$3,$4,$5,$6)
     ON CONFLICT (imei) DO UPDATE SET site_id = EXCLUDED.site_id, orientation = EXCLUDED.orientation, sim = COALESCE(EXCLUDED.sim, devices.sim)
     RETURNING id`,
    [device_id, imeiV, sim, site.id, o, status || "Testing"]
  );
  // Persist the extra install settings (geofence / sensor / notes) when the
  // optional `config` JSONB column exists. Safe no-op if the migration hasn't run.
  if (config && rows[0]) {
    try { await query(`UPDATE devices SET config = $2::jsonb WHERE id = $1`, [rows[0].id, JSON.stringify(config)]); }
    catch { /* config column not present yet — device still saved */ }
  }
  const { rows: full } = await query(
    `SELECT d.*, s.name AS site, s.code AS site_code, s.lat AS site_lat, s.lng AS site_lng
       FROM devices d LEFT JOIN sites s ON s.id = d.site_id WHERE d.id = $1`,
    [rows[0].id]
  );
  return full[0];
}

/**
 * Bulk import from the "Import devices from Excel" flow. Each row carries only
 * the three columns the template ships with: site code, IMEI, orientation.
 * Upserts by IMEI (re-importing an IMEI just re-points it at the site / flips
 * its orientation). Returns { imported, updated, skipped, total }.
 */
export async function importDevices(rows = []) {
  let imported = 0, updated = 0, skipped = 0;
  for (const raw of rows) {
    const code = String(raw.site || "").trim();
    const imei = String(raw.imei || "").trim();
    if (!code || !imei) { skipped++; continue; }
    // eslint-disable-next-line no-await-in-loop
    const site = await getSiteByRef(code);
    if (!site) { skipped++; continue; }
    const o = normOrientation(raw.ori);
    const sim = String(raw.sim || "").trim() || null;
    // eslint-disable-next-line no-await-in-loop
    const device_id = await uniqueDeviceId(site, o);
    // eslint-disable-next-line no-await-in-loop
    const { rows: out } = await query(
      `INSERT INTO devices (device_id, imei, sim, site_id, orientation, status)
         VALUES ($1,$2,$3,$4,$5,'Testing')
       ON CONFLICT (imei) DO UPDATE SET
         site_id = EXCLUDED.site_id, orientation = EXCLUDED.orientation,
         sim = COALESCE(EXCLUDED.sim, devices.sim)
       RETURNING (xmax = 0) AS inserted`,
      [device_id, imei, sim, site.id, o]
    );
    if (out[0]?.inserted) imported++; else updated++;
  }
  return { imported, updated, skipped, total: imported + updated };
}

// ---- batch operations (Group devices) -------------------------------------
const DEVICE_BATCH_COLS = { status: "status", firmware: "firmware" };

/** Apply the same column patch to many devices. Returns rows affected. */
export async function batchUpdateDevices(ids = [], patch = {}) {
  if (!ids.length) return 0;
  const sets = [];
  const params = [];
  for (const k in patch) {
    if (DEVICE_BATCH_COLS[k]) { params.push(patch[k]); sets.push(`${DEVICE_BATCH_COLS[k]} = $${params.length}`); }
  }
  if (!sets.length) return 0;
  params.push(ids);
  const { rowCount } = await query(
    `UPDATE devices SET ${sets.join(", ")} WHERE id = ANY($${params.length}::bigint[])`,
    params
  );
  return rowCount;
}

/** Reassign many devices to another site (by Site ID or code). Rows affected. */
export async function reassignDevices(ids = [], siteRef) {
  if (!ids.length) return 0;
  const site = await getSiteByRef(siteRef);
  if (!site) throw new Error(`Unknown Site ID: ${siteRef}`);
  const { rowCount } = await query(
    `UPDATE devices SET site_id = $1 WHERE id = ANY($2::bigint[])`,
    [site.id, ids]
  );
  return rowCount;
}

export async function batchDeleteDevices(ids = []) {
  if (!ids.length) return 0;
  const { rowCount } = await query(`DELETE FROM devices WHERE id = ANY($1::bigint[])`, [ids]);
  return rowCount;
}
