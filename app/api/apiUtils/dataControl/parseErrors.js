// app/api/apiUtils/dataControl/parseErrors.js
// Persist and read frames that failed to parse. Best-effort: inserts never throw
// (the ingest path swallows failures), and reads fall back to [] if the table
// isn't present yet.
import { query } from "../s_env/db.js";

export function insertParseError({ port, ip, srcPort, device, data, error } = {}) {
  return query(
    `INSERT INTO parse_errors (port, src_ip, src_port, device, data, error)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [port ?? null, ip ?? null, srcPort ?? null, device ?? null,
     data != null ? String(data).slice(0, 2000) : null,
     error != null ? String(error).slice(0, 500) : null]
  );
}

export async function listParseErrors({ limit = 100 } = {}) {
  const lim = Math.min(500, Math.max(1, Number(limit) || 100));
  try {
    const { rows } = await query(
      `SELECT id, received_at, port, src_ip, src_port, device, data, error
         FROM parse_errors ORDER BY received_at DESC LIMIT $1`, [lim]);
    return rows;
  } catch { return []; }
}

export async function countParseErrorsToday() {
  try {
    const { rows } = await query(
      `SELECT count(*)::int AS n FROM parse_errors WHERE received_at >= date_trunc('day', now())`);
    return rows[0]?.n || 0;
  } catch { return 0; }
}
