// app/api/apiUtils/dataControl/devices.js
// Device registry access. The IMEI lookup runs on every ingested packet.
import { query } from "../s_env/db.js";
import { THRESHOLD_FIELDS, resolveConfig } from "../ingest/alarmEngine.js";
import { planToMb } from "./dataUsage.js";

// Coerce an incoming thresholds patch to the allowed numeric keys, clamped to
// each field's range. Anything else is dropped — the client can't write arbitrary
// config keys through this path.
export function sanitizeThresholds(patch = {}) {
  const out = {};
  for (const f of THRESHOLD_FIELDS) {
    if (patch[f.key] == null || patch[f.key] === "") continue;
    let n = Number(patch[f.key]);
    if (!Number.isFinite(n)) continue;
    n = Math.min(f.max, Math.max(f.min, n));
    out[f.key] = n;
  }
  return out;
}

// Every device with its resolved alarm thresholds (config merged over defaults),
// for the threshold editor + batch selection.
export async function listDeviceAlarmConfigs() {
  const { rows } = await query(
    `SELECT d.id, d.device_id, d.imei, d.status, d.config, s.name AS site
       FROM devices d LEFT JOIN sites s ON s.id = d.site_id
      ORDER BY d.device_id ASC NULLS LAST, d.id ASC`
  );
  return rows.map((d) => {
    const c = resolveConfig(d);
    const thresholds = {};
    for (const f of THRESHOLD_FIELDS) thresholds[f.key] = c[f.key];
    return { id: d.id, device_id: d.device_id, imei: d.imei, status: d.status, site: d.site, thresholds };
  });
}

// Apply a thresholds patch to one or many devices (per-device edit = one id,
// batch = many). Merges over existing config so untouched keys are preserved.
export async function batchSetAlarmConfig(ids = [], patch = {}) {
  const clean = sanitizeThresholds(patch);
  if (!ids.length || !Object.keys(clean).length) return 0;
  const { rowCount } = await query(
    `UPDATE devices SET config = COALESCE(config, '{}'::jsonb) || $2::jsonb
      WHERE id = ANY($1::bigint[])`,
    [ids.map(Number).filter(Number.isFinite), JSON.stringify(clean)]
  );
  return rowCount;
}

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

/**
 * Devices that have reported before but have now gone silent past their offline
 * window (per-device config.offline_hours, default 24 h). Never-seen devices are
 * excluded so a freshly-registered tracker isn't flagged before its first packet.
 * Drives the Device Offline sweep.
 */
// Devices that have missed their expected heartbeat window. The wake interval
// (config.wake_interval_sec, legacy offline_hours*3600, else 24 h) drives it, plus
// the ±tolerance (config.hb_tolerance_sec, default 300 s). A device is stale only
// when now - last_seen > interval + tolerance — and ANY packet (heartbeat, critical,
// tracking) refreshes last_seen, so an early critical never makes it stale.
// Devices already Inactive / Testing / Maintenance are excluded: they are not
// expected to heartbeat, so they never become "Offline".
export async function listStaleDevices(defaultHours = 24) {
  const { rows } = await query(
    `SELECT d.id, d.device_id, d.imei, d.last_seen, d.status, s.name AS site,
            EXTRACT(EPOCH FROM (now() - d.last_seen)) / 3600.0 AS hours_silent,
            COALESCE(NULLIF(d.config->>'wake_interval_sec','')::numeric,
                     NULLIF(d.config->>'offline_hours','')::numeric * 3600,
                     $1 * 3600) AS interval_sec,
            COALESCE(NULLIF(d.config->>'hb_tolerance_sec','')::numeric, 300) AS tol_sec
       FROM devices d
       LEFT JOIN sites s ON s.id = d.site_id
      WHERE d.last_seen IS NOT NULL
        AND lower(COALESCE(d.status,'')) NOT IN ('inactive','testing','maintenance')
        AND now() - d.last_seen >
            ((COALESCE(NULLIF(d.config->>'wake_interval_sec','')::numeric,
                       NULLIF(d.config->>'offline_hours','')::numeric * 3600,
                       $1 * 3600)
              + COALESCE(NULLIF(d.config->>'hb_tolerance_sec','')::numeric, 300))
             * interval '1 second')`,
    [defaultHours]
  );
  return rows;
}

// Record a heartbeat: stamp last-heartbeat = now() and predict the next one at
// now() + wake interval. Prediction stays simple; the ±tolerance window absorbs
// the device clock's small wobble.
export async function recordHeartbeat(deviceId) {
  if (!deviceId) return;
  await query(
    `UPDATE devices SET
        hb_last_at = now(),
        hb_next_at = now() + (COALESCE(NULLIF(config->>'wake_interval_sec','')::numeric,
                                       NULLIF(config->>'offline_hours','')::numeric * 3600,
                                       86400) * interval '1 second')
      WHERE id = $1`,
    [deviceId]
  );
}

// Set a device's operational status (Live | Offline | Testing | Maintenance | Inactive).
export async function setDeviceStatus(deviceId, status) {
  if (!deviceId || !status) return;
  await query(`UPDATE devices SET status = $2 WHERE id = $1`, [deviceId, String(status)]);
  // Roll the change up to the device's site (all-same → that state; mixed → Live).
  try {
    const { recomputeSitesForDevices } = await import("./sites.js");
    await recomputeSitesForDevices([deviceId]);
  } catch {}
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
            s.lat AS site_lat, s.lng AS site_lng,
            u.up_bytes, u.up_n
       FROM devices d
       LEFT JOIN sites s ON s.id = d.site_id
       LEFT JOIN LATERAL (
         SELECT COALESCE(SUM(COALESCE(octet_length(dt.raw), 90)), 0)::bigint AS up_bytes,
                COUNT(*)::int AS up_n
           FROM device_telemetry dt
          WHERE dt.device_id = d.id
            AND (NULLIF(d.config->>'data_reset_at','') IS NULL
                 OR dt.received_at >= (d.config->>'data_reset_at')::timestamptz)
       ) u ON true
       ${clause}
      ORDER BY d.id ASC`,
    params
  );
  // Attach an estimated data-bundle summary (uplink-only for the list — downlink is
  // tiny; the device page computes the full figure).
  const MB = 1024 * 1024;
  for (const d of rows) {
    const cfg = d.config || {};
    const assignedMb = planToMb(cfg.data_plan, cfg.data_bundle_mb);
    const usedMb = (Number(d.up_bytes || 0) + Number(d.up_n || 0) * 40) / MB;
    const remainingMb = assignedMb > 0 ? Math.max(0, assignedMb - usedMb) : null;
    d.data_usage = {
      assigned_mb: assignedMb > 0 ? assignedMb : null,
      used_mb: Math.round(usedMb * 100) / 100,
      remaining_mb: remainingMb != null ? Math.round(remainingMb * 100) / 100 : null,
      pct: assignedMb > 0 ? Math.min(100, Math.round((usedMb / assignedMb) * 1000) / 10) : null,
      estimate: true,
    };
    d.data_left = remainingMb != null ? (remainingMb >= 1024 ? `${Math.round((remainingMb / 1024) * 100) / 100} GB` : `${Math.round(remainingMb)} MB`) : (d.data_left || null);
    delete d.up_bytes; delete d.up_n;
  }
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
// Factory defaults applied to every new device (manual add + import), so alarms /
// heartbeat behave sensibly from day one. Any provided config overrides these.
export const DEVICE_DEFAULT_CONFIG = {
  geofence_enabled: true,
  geofence_radius_m: 30,
  motion_sensitivity: 30,
  upload_interval_s: 3,     // moving/report cadence
  wake_interval_sec: 86400, // 24 h sleep/wake interval
  data_bundle_mb: 50,       // default data bundle: 50 MB, annually (manual reset only)
  data_bundle_period: "annually",
  data_plan: "50 MB annually",
};

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
  // Persist install settings over the factory defaults. Only fill missing keys on an
  // EXISTING device so we don't clobber a re-imported device's saved config.
  if (rows[0]) {
    const merged = { ...DEVICE_DEFAULT_CONFIG, ...(config || {}) };
    if (!merged.data_reset_at) merged.data_reset_at = new Date().toISOString(); // start the bundle counter now
    try {
      await query(
        `UPDATE devices SET config = $2::jsonb || COALESCE(config, '{}'::jsonb) WHERE id = $1`,
        [rows[0].id, JSON.stringify(merged)]
      );
    } catch { /* config column not present yet — device still saved */ }
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
    // Imported devices get status Testing + the factory default config (geofence 30 m,
    // sensitivity 30, moving 3 s, wake 24 h). Existing devices keep their own config.
    const { rows: out } = await query(
      `INSERT INTO devices (device_id, imei, sim, site_id, orientation, status, config)
         VALUES ($1,$2,$3,$4,$5,'Testing',$6::jsonb)
       ON CONFLICT (imei) DO UPDATE SET
         site_id = EXCLUDED.site_id, orientation = EXCLUDED.orientation,
         sim = COALESCE(EXCLUDED.sim, devices.sim),
         config = COALESCE(devices.config, EXCLUDED.config)
       RETURNING (xmax = 0) AS inserted`,
      [device_id, imei, sim, site.id, o, JSON.stringify({ ...DEVICE_DEFAULT_CONFIG, data_reset_at: new Date().toISOString() })]
    );
    if (out[0]?.inserted) imported++; else updated++;
  }
  return { imported, updated, skipped, total: imported + updated };
}

// ---- batch operations (Group devices) -------------------------------------
const DEVICE_BATCH_COLS = { status: "status", firmware: "firmware" };

// ---- per-device monitoring controls (Group devices) -----------------------
/** Arm (true) / disarm (false) a set of devices. */
export async function setDevicesArmed(ids = [], armed = true) {
  if (!ids.length) return 0;
  const { rowCount } = await query(
    `UPDATE devices SET armed = $1 WHERE id = ANY($2::bigint[])`, [!!armed, ids]);
  return rowCount;
}

/** Mute a set of devices for `amount unit` (minutes|hours|days); amount<=0 clears. */
export async function setDevicesMute(ids = [], amount = 0, unit = "hours") {
  if (!ids.length) return 0;
  const n = Number(amount) || 0;
  if (n <= 0) {
    const { rowCount } = await query(
      `UPDATE devices SET mute_until = NULL WHERE id = ANY($1::bigint[])`, [ids]);
    return rowCount;
  }
  const u = ["minutes", "hours", "days"].includes(String(unit)) ? String(unit) : "hours";
  const { rowCount } = await query(
    `UPDATE devices SET mute_until = now() + ($1 || ' ' || $2)::interval
      WHERE id = ANY($3::bigint[])`, [String(n), u, ids]);
  return rowCount;
}

/** Merge a config JSONB patch into a set of devices (data plan / SIM / flags). */
export async function setDevicesConfig(ids = [], patch = {}) {
  if (!ids.length || !patch || !Object.keys(patch).length) return 0;
  const { rowCount } = await query(
    `UPDATE devices SET config = COALESCE(config, '{}'::jsonb) || $2::jsonb
      WHERE id = ANY($1::bigint[])`, [ids, JSON.stringify(patch)]);
  return rowCount;
}

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
