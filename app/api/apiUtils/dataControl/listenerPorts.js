// app/api/apiUtils/dataControl/listenerPorts.js
// CRUD for the managed TCP listener ports (config only — the live sockets are
// owned by ingest/portManager.js).
import { query } from "../s_env/db.js";

export async function listPorts() {
  const { rows } = await query(`SELECT * FROM listener_ports ORDER BY port ASC`);
  return rows;
}

export async function addPort({ port, deviceModel }) {
  const { rows } = await query(
    `INSERT INTO listener_ports (port, proto, device_model, enabled)
     VALUES ($1, 'TCP', $2, false)
     ON CONFLICT (port) DO UPDATE SET device_model = EXCLUDED.device_model
     RETURNING *`,
    [Number(port), deviceModel || null]
  );
  return rows[0];
}

export async function removePort(port) {
  await query(`DELETE FROM listener_ports WHERE port = $1`, [Number(port)]);
}

export async function setPortEnabled(port, enabled) {
  await query(`UPDATE listener_ports SET enabled = $2 WHERE port = $1`, [Number(port), !!enabled]);
}
