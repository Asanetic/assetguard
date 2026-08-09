// app/api/apiUtils/dataControl/rawLogs.js
// Best-effort persistence of raw ingest traffic (in + out). Works once
// db/raw_logs.sql has been run; if the table is absent, callers swallow the error.
import { query } from "../s_env/db.js";

export async function insertRawLog(r) {
  await query(
    `INSERT INTO raw_logs (direction, src_ip, src_port, data, bytes)
     VALUES ($1,$2,$3,$4,$5)`,
    [r.dir, r.ip, r.port, r.data, r.bytes]
  );
}

export async function listRecentRaw(limit = 200) {
  const { rows } = await query(
    `SELECT * FROM raw_logs ORDER BY received_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}
