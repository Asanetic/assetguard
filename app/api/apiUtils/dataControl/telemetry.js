// app/api/apiUtils/dataControl/telemetry.js
// Writes + reads for the normalized telemetry feed and the alarms it raises.
import { query } from "../s_env/db.js";

// Insert one parsed telemetry row; returns the new id (or null on failure).
// Tries the full column set first; if the DB is missing the newer columns
// (migrations not run), it logs exactly which migration to run and falls back to
// the core columns so rows — including the geolocated lat/lng — still land.
export async function insertTelemetry(r) {
  try {
    const { rows } = await query(
      `INSERT INTO device_telemetry
         (device_id, site_id, imei, device_time, fix, lat, lng, speed, course,
          altitude, satellites, signal, battery, motion_byte,
          mems_valid, mems_x, mems_y, mems_z, roll, pitch, temperature,
          mcc, mnc, lac, cell_id, raw, src_ip, src_port,
          fix_valid, network_located, status_disturbance, status_low_batt,
          mems_dynamic, cells, wifi, alarms, accuracy, loc_source, geo_error, geo_raw)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,
               $29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40)
       RETURNING id`,
      [
        r.deviceId, r.siteId, r.imei, r.deviceTime, r.fix, r.lat, r.lng, r.speed, r.course,
        r.altitude, r.satellites, r.signal, r.battery, r.motionByte,
        r.mems?.valid ?? null, r.mems?.x ?? null, r.mems?.y ?? null, r.mems?.z ?? null,
        r.mems?.roll ?? null, r.mems?.pitch ?? null, r.mems?.temperature ?? null,
        r.mcc, r.mnc, r.lac, r.cellId, r.raw, r.ip, r.port,
        r.fixValid ?? null, r.networkLocated ?? null,
        r.status?.disturbance ?? null, r.status?.lowBattery ?? null,
        r.mems?.dynamic ?? null,
        r.cells ? JSON.stringify(r.cells) : null,
        r.wifi ? JSON.stringify(r.wifi) : null,
        r.alarms ? JSON.stringify(r.alarms) : null,
        r.accuracy ?? null, r.locSource ?? null, r.geoError ?? null,
        r.geoRaw ? JSON.stringify(r.geoRaw) : null,
      ]
    );
    return rows[0]?.id ?? null;
  } catch (e) {
    if (/column .* does not exist/i.test(e.message || "")) {
      console.error(`[telemetry] insert missing columns (${e.message}). Run: db/telemetry_extras.sql and db/telemetry_geo.sql. Storing core fields only for now.`);
      try {
        const { rows } = await query(
          `INSERT INTO device_telemetry
             (device_id, site_id, imei, device_time, fix, lat, lng, speed, course,
              altitude, satellites, signal, battery, motion_byte,
              mems_valid, mems_x, mems_y, mems_z, roll, pitch, temperature,
              mcc, mnc, lac, cell_id, raw, src_ip, src_port)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28)
           RETURNING id`,
          [
            r.deviceId, r.siteId, r.imei, r.deviceTime, r.fix, r.lat, r.lng, r.speed, r.course,
            r.altitude, r.satellites, r.signal, r.battery, r.motionByte,
            r.mems?.valid ?? null, r.mems?.x ?? null, r.mems?.y ?? null, r.mems?.z ?? null,
            r.mems?.roll ?? null, r.mems?.pitch ?? null, r.mems?.temperature ?? null,
            r.mcc, r.mnc, r.lac, r.cellId, r.raw, r.ip, r.port,
          ]
        );
        return rows[0]?.id ?? null;
      } catch (e2) { console.error("[telemetry] core insert failed:", e2.message); return null; }
    }
    console.error("[telemetry] insert failed:", e.message);
    return null;
  }
}

// Keep the devices row's live state in sync with the newest telemetry.
export async function updateDeviceState(deviceId, t) {
  await query(
    `UPDATE devices SET
        last_seen = now(),
        battery   = COALESCE($2, battery),
        data_left = data_left
      WHERE id = $1`,
    [deviceId, t.battery ?? null]
  );
}

// Site coordinates for the geofence check.
export async function getSiteLatLng(siteId) {
  if (!siteId) return null;
  const { rows } = await query(`SELECT lat, lng FROM sites WHERE id = $1 LIMIT 1`, [siteId]);
  const s = rows[0];
  return s && s.lat != null && s.lng != null ? { lat: Number(s.lat), lng: Number(s.lng) } : null;
}

// Alarm persistence lives in dataControl/alarms.js (insertLiveAlarm) so live
// alarms share the same `alarms` table as the All Alarms page + speaker.

// ---- reads (for the APIs) ----
export async function listTelemetry({ deviceId, imei, from, to, limit = 500, newest = false, q, event } = {}) {
  const where = [], params = [];
  if (deviceId) { params.push(deviceId); where.push(`t.device_id = $${params.length}`); }
  if (imei) { params.push(String(imei)); where.push(`t.imei = $${params.length}`); }
  if (from) { params.push(from); where.push(`t.received_at >= $${params.length}`); }
  if (to) { params.push(to); where.push(`t.received_at <= $${params.length}`); }
  // event filter: "position" (no alarms) or an alarm type in the alarms array
  if (event && event !== "all") {
    if (event === "position") where.push(`(t.alarms IS NULL OR jsonb_array_length(t.alarms) = 0)`);
    else { params.push(event); where.push(`t.alarms ? $${params.length}`); }
  }
  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    const i = params.length;
    where.push(`(lower(t.imei) LIKE $${i} OR cast(t.lat as text) LIKE $${i} OR cast(t.lng as text) LIKE $${i} OR lower(coalesce(t.motion_byte,'')) LIKE $${i})`);
  }
  params.push(Math.min(5000, Number(limit) || 500));
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const order = newest ? "DESC" : "ASC";
  const { rows } = await query(
    `SELECT t.*, d.device_id AS device_code, s.name AS site
       FROM device_telemetry t
       LEFT JOIN devices d ON d.id = t.device_id
       LEFT JOIN sites   s ON s.id = t.site_id
       ${clause}
      ORDER BY t.received_at ${order} LIMIT $${params.length}`, params);
  return rows;
}

export async function latestTelemetry(deviceId) {
  const { rows } = await query(
    `SELECT * FROM device_telemetry WHERE device_id = $1 ORDER BY received_at DESC LIMIT 1`,
    [deviceId]);
  return rows[0] || null;
}

