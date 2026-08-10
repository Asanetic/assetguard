// app/api/apiUtils/dataControl/devices.js
// Device registry access. The IMEI lookup runs on every ingested packet.
import { query } from "../s_env/db.js";

export async function findDeviceByImei(imei) {
  const { rows } = await query(
    `SELECT d.*, s.name AS site, s.code AS site_code
       FROM devices d
       LEFT JOIN sites s ON s.id = d.site_id
      WHERE d.imei = $1
      LIMIT 1`,
    [String(imei)]
  );
  return rows[0] || null;
}

export async function touchDeviceLastSeen(id) {
  await query(`UPDATE devices SET last_seen = now() WHERE id = $1`, [id]);
}

export async function listDevices({ q, site_id } = {}) {
  const where = [];
  const params = [];
  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    const i = params.length;
    where.push(`(lower(d.device_id) LIKE $${i} OR lower(d.imei) LIKE $${i})`);
  }
  if (site_id) { params.push(site_id); where.push(`d.site_id = $${params.length}`); }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT d.*, s.name AS site FROM devices d
       LEFT JOIN sites s ON s.id = d.site_id ${clause}
      ORDER BY d.id ASC`,
    params
  );
  return rows;
}
