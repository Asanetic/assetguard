// app/api/apiUtils/dataControl/installation.js
// -----------------------------------------------------------------------------
// The read side of the admin "Installation" page. Three questions, one place:
//
//   listTechnicianPositions()   — where every technician is right now (the map)
//   listStartedInstallations()  — open install sessions + the stage each is at
//   listCompletedInstallations()— finished installs, from the permanent worklog
//   deviceInstallStatus()       — per-device "is it on, does it have a GPS fix,
//                                 how many satellites" for the devices on a visit
//
// All read-only. The writes (position, step) live in dataControl/technician.js
// because the technician app owns them; this file is only ever read by admins.
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

/** Everyone who posted a position in the last `minutes`, newest first, with the
 *  site/step of their open session attached so the map can label the pin. */
export async function listTechnicianPositions({ minutes = 90 } = {}) {
  const mins = Math.min(Math.max(Number(minutes) || 90, 1), 1440);
  const { rows } = await query(
    `SELECT p.technician_id, p.technician_name,
            p.lat, p.lng, p.accuracy_m, p.speed, p.heading, p.battery,
            p.updated_at,
            EXTRACT(EPOCH FROM (now() - p.updated_at))::bigint AS age_sec,
            s.id AS session_id, s.site_id, s.job_type, s.step, s.step_at,
            s.opened_at AS session_opened_at,
            si.name AS site_name
       FROM technician_positions p
       LEFT JOIN LATERAL (
         SELECT id, site_id, job_type, step, step_at, opened_at
           FROM technician_work_sessions
          WHERE technician_id = p.technician_id
            AND closed_at IS NULL
            AND expires_at > now()
          ORDER BY opened_at DESC
          LIMIT 1
       ) s ON true
       LEFT JOIN sites si ON si.id = s.site_id
      WHERE p.lat IS NOT NULL AND p.lng IS NOT NULL
        AND p.updated_at > now() - ($1 || ' minutes')::interval
      ORDER BY p.updated_at DESC`,
    [String(mins)]
  );
  return rows;
}

/**
 * Jobs in progress — the WHOLE job, start to finish, for BOTH installs and
 * maintenance.
 *
 * Reads the active-job signal the app reports as the technician works (not the
 * short on-site alarm session, which only covers the Settle/Test window). A row
 * is "in progress" while it is fresh; a crash that left one behind ages out of
 * the 2-hour window rather than lingering forever.
 */
export async function listActiveJobs() {
  const { rows } = await query(
    `SELECT a.technician_id AS id, a.technician_id, a.technician_name,
            a.site_id, a.device_ids, a.job_type, a.step,
            a.started_at AS opened_at, a.updated_at,
            EXTRACT(EPOCH FROM (now() - a.updated_at))::bigint AS step_age_sec,
            si.name AS site_name, si.lat AS site_lat, si.lng AS site_lng
       FROM technician_active_jobs a
       LEFT JOIN sites si ON si.id = a.site_id
      WHERE a.updated_at > now() - interval '2 hours'
      ORDER BY a.updated_at DESC`
  );
  return rows;
}

/**
 * The permanent log of finished (or abandoned) jobs — installs AND maintenance —
 * searchable and paginated, because this grows into the thousands.
 *
 * Filters (all optional): free-text `q` (technician, site or device), a
 * `from`/`to` date range, `jobType` (install|maintain), `outcome`
 * (passed|abandoned). Returns one page plus the total count for the pager.
 */
export async function listCompleted({
  q, from, to, jobType, outcome, limit = 25, offset = 0,
} = {}) {
  const where = [];
  const params = [];

  if (q && String(q).trim()) {
    params.push(`%${String(q).trim().toLowerCase()}%`);
    const i = params.length;
    where.push(
      `(lower(coalesce(technician_name,'')) LIKE $${i}` +
      ` OR lower(coalesce(site_name,'')) LIKE $${i}` +
      ` OR lower(coalesce(device_id,'')) LIKE $${i})`
    );
  }
  if (jobType === "install" || jobType === "maintain") {
    params.push(jobType); where.push(`job_type = $${params.length}`);
  }
  if (outcome === "passed" || outcome === "abandoned") {
    params.push(outcome); where.push(`outcome = $${params.length}`);
  }
  if (from) { params.push(from); where.push(`COALESCE(finished_at, created_at) >= $${params.length}::date`); }
  // `to` is inclusive of the whole day: < the day AFTER.
  if (to)   { params.push(to);   where.push(`COALESCE(finished_at, created_at) < ($${params.length}::date + 1)`); }

  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";

  const cap = Math.min(Math.max(Number(limit) || 25, 1), 100);
  const off = Math.max(Number(offset) || 0, 0);

  const { rows: countRows } = await query(
    `SELECT count(*)::int AS n FROM technician_worklog ${clause}`, params
  );
  const total = countRows[0]?.n ?? 0;

  params.push(cap); const limIdx = params.length;
  params.push(off); const offIdx = params.length;
  const { rows } = await query(
    `SELECT id, session_id, technician_id, technician_name, job_type, maintenance_type,
            site_id, site_name, device_id, started_at, finished_at, outcome, tests,
            lat, lng, accuracy_m, created_at
       FROM technician_worklog
      ${clause}
      ORDER BY COALESCE(finished_at, created_at) DESC, id DESC
      LIMIT $${limIdx} OFFSET $${offIdx}`,
    params
  );
  return { rows, total };
}

/**
 * For a set of device identifiers (device_id OR imei — the session stores the
 * human device_id, but either may appear), the latest telemetry that tells an
 * installer what they need on site: is it ON (reporting recently), does it have
 * a GPS fix, how many satellites, and when it last streamed.
 *
 * Returns a map keyed by BOTH device_id and imei → status object, so the caller
 * can look a device up by whichever string the session carried.
 */
export async function deviceInstallStatus(idTexts = []) {
  const ids = [...new Set((idTexts || []).map((x) => String(x).trim()).filter(Boolean))];
  if (!ids.length) return {};
  const { rows } = await query(
    `SELECT d.id, d.device_id, d.imei, d.status AS device_status, d.battery AS device_battery,
            d.last_seen,
            EXTRACT(EPOCH FROM (now() - d.last_seen))::bigint AS last_seen_age_sec,
            t.fix, t.fix_valid, t.satellites, t.lat, t.lng, t.speed,
            t.received_at,
            EXTRACT(EPOCH FROM (now() - t.received_at))::bigint AS age_sec
       FROM devices d
       LEFT JOIN LATERAL (
         SELECT fix, fix_valid, satellites, lat, lng, speed, received_at
           FROM device_telemetry
          WHERE device_id = d.id
          ORDER BY received_at DESC
          LIMIT 1
       ) t ON true
      WHERE d.device_id = ANY($1::text[]) OR d.imei = ANY($1::text[])`,
    [ids]
  );

  const map = {};
  for (const r of rows) {
    const ageSec = r.age_sec != null ? Number(r.age_sec) : null;
    const lastSeenAge = r.last_seen_age_sec != null ? Number(r.last_seen_age_sec) : null;
    // "On" = reporting recently. Telemetry within 5 min is the clearest signal;
    // fall back to the devices.last_seen heartbeat when no telemetry row exists.
    const streaming = ageSec != null && ageSec <= 300;
    const recentlySeen = lastSeenAge != null && lastSeenAge <= 300;
    const status = {
      device_id: r.device_id || null,
      imei: r.imei || null,
      device_status: r.device_status || null,
      on: streaming || recentlySeen,
      streaming,
      fix: r.fix || null,
      fix_valid: r.fix_valid === true,
      has_fix: r.fix === "A" && r.fix_valid !== false,
      satellites: r.satellites == null ? null : Number(r.satellites),
      battery: r.device_battery == null ? null : Number(r.device_battery),
      lat: r.lat == null ? null : Number(r.lat),
      lng: r.lng == null ? null : Number(r.lng),
      speed: r.speed == null ? null : Math.round(Number(r.speed)),
      last_telemetry_at: r.received_at || null,
      age_sec: ageSec,
      last_seen: r.last_seen || null,
      last_seen_age_sec: lastSeenAge,
    };
    if (r.device_id) map[r.device_id] = status;
    if (r.imei) map[r.imei] = status;
  }
  return map;
}
