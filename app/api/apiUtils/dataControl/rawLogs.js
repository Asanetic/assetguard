// app/api/apiUtils/dataControl/rawLogs.js
// Raw ingest traffic capture (one row per frame), tagged with the listener port
// and the device (IMEI) once identified. Falls back gracefully if the extra
// columns aren't migrated yet.
import { query } from "../s_env/db.js";

export async function insertRawLog(r) {
  try {
    await query(
      `INSERT INTO raw_logs (direction, src_ip, src_port, port, device, data, bytes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [r.dir, r.ip, r.srcPort ?? r.port ?? null, r.port ?? null, r.device ?? null, r.data, r.bytes]
    );
  } catch (e) {
    if (/column .* does not exist/i.test(e.message || "")) {
      try { await query(`INSERT INTO raw_logs (direction, src_ip, src_port, data, bytes) VALUES ($1,$2,$3,$4,$5)`, [r.dir, r.ip, r.srcPort ?? r.port ?? null, r.data, r.bytes]); } catch {}
    }
  }
}

export async function listRecentRaw(limit = 200) {
  const { rows } = await query(`SELECT * FROM raw_logs ORDER BY received_at DESC LIMIT $1`, [limit]);
  return rows;
}

// Search + filter raw frames for the "All raw port data" page.
export async function searchRaw({ q, port, device, from, to, limit = 300 } = {}) {
  const where = [], params = [];
  if (port) { params.push(Number(port)); where.push(`port = $${params.length}`); }
  if (device) { params.push(String(device)); where.push(`device = $${params.length}`); }
  if (from) { params.push(from); where.push(`received_at >= $${params.length}`); }
  if (to) { params.push(to); where.push(`received_at <= $${params.length}`); }
  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    const i = params.length;
    where.push(`(lower(data) LIKE $${i} OR lower(coalesce(device,'')) LIKE $${i} OR cast(port as text) LIKE $${i})`);
  }
  params.push(Math.min(2000, Number(limit) || 300));
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT * FROM raw_logs ${clause} ORDER BY received_at DESC LIMIT $${params.length}`, params);
  return rows;
}

export async function countRaw() {
  const { rows } = await query(`SELECT COUNT(*)::int AS n FROM raw_logs`);
  return rows[0]?.n ?? 0;
}

// Today's frame count + bytes in (for the stats bar).
export async function rawTotalsToday() {
  const { rows } = await query(
    `SELECT COUNT(*)::int AS messages, COALESCE(SUM(bytes),0)::bigint AS bytes
       FROM raw_logs WHERE received_at::date = current_date`);
  return { messages: rows[0]?.messages ?? 0, bytes: Number(rows[0]?.bytes ?? 0) };
}

// Distinct unregistered devices seen (not enrolled).
export async function unknownDevicesCount() {
  const { rows } = await query(`SELECT COUNT(DISTINCT imei)::int AS n FROM unknown_logs`);
  return rows[0]?.n ?? 0;
}
