// app/api/apiUtils/dataControl/modules.js
import { query } from "../s_env/db.js";

export async function listModules() {
  const { rows } = await query(`SELECT * FROM modules ORDER BY sort, id`);
  return rows;
}

export async function createModule({ name, key, grp, type, active = true }) {
  const { rows } = await query(
    `INSERT INTO modules (name, key, grp, type, active, sort)
     VALUES ($1,$2,$3,$4,$5,(SELECT COALESCE(MAX(sort),0)+1 FROM modules))
     RETURNING *`,
    [name, key, grp, type, active]
  );
  return rows[0];
}

export async function updateModule(id, fields) {
  const allowed = ["name", "grp", "type", "active"];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return null;
  const set = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
  const vals = keys.map((k) => fields[k]);
  const { rows } = await query(`UPDATE modules SET ${set} WHERE id = $1 RETURNING *`, [id, ...vals]);
  return rows[0] || null;
}

export async function deleteModule(id) {
  await query(`DELETE FROM modules WHERE id = $1`, [id]);
  return true;
}
