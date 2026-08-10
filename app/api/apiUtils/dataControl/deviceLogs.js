// app/api/apiUtils/dataControl/deviceLogs.js
// Telemetry log writes + reads.
import { query } from "../s_env/db.js";

export async function insertDeviceLog(r) {
  await query(
    `INSERT INTO device_logs
       (device_id, site_id, imei, device_time, fix, lat, lng, speed, course,
        status_hex, event, mcc, mnc, lac, cell_id, raw, src_ip, src_port)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
    [
      r.deviceId, r.siteId, r.imei, r.deviceTime, r.fix, r.lat, r.lng, r.speed, r.course,
      r.statusHex, r.event, r.mcc, r.mnc, r.lac, r.cellId, r.raw, r.ip, r.port,
    ]
  );
}

export async function insertUnknownLog(r) {
  await query(
    `INSERT INTO unknown_logs (imei, raw, src_ip, src_port) VALUES ($1,$2,$3,$4)`,
    [r.imei, r.raw, r.ip, r.port]
  );
}

export async function listRecentLogs(limit = 100) {
  const { rows } = await query(
    `SELECT l.*, d.device_id AS device_disp, s.name AS site
       FROM device_logs l
       LEFT JOIN devices d ON d.id = l.device_id
       LEFT JOIN sites   s ON s.id = l.site_id
      ORDER BY l.received_at DESC
      LIMIT $1`,
    [limit]
  );
  return rows;
}
