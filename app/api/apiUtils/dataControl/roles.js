// app/api/apiUtils/dataControl/roles.js
import { query } from "../s_env/db.js";

/** Roles + live permission-grant counts + assigned-user counts. */
export async function listRoles() {
  const { rows } = await query(
    `SELECT r.key, r.name, r.icon, r.bg, r.fg, r.description, r.sort,
       (SELECT COUNT(*)::int FROM role_permissions rp WHERE rp.role_key = r.key) AS perm_count,
       (SELECT COUNT(*)::int FROM users u WHERE u.role = r.key) AS user_count
     FROM roles r ORDER BY r.sort, r.key`
  );
  return rows;
}

export async function createRole({ key, name, icon = "ti-shield", bg = "#EDE9FE", fg = "#6D28D9", description = "" }) {
  const { rows } = await query(
    `INSERT INTO roles (key, name, icon, bg, fg, description, sort)
     VALUES ($1,$2,$3,$4,$5,$6,(SELECT COALESCE(MAX(sort),0)+1 FROM roles))
     RETURNING *`,
    [key, name, icon, bg, fg, description]
  );
  return rows[0];
}

export async function updateRole(key, fields) {
  const allowed = ["name", "icon", "bg", "fg", "description"];
  const keys = Object.keys(fields).filter((k) => allowed.includes(k));
  if (!keys.length) return null;
  const set = keys.map((k, i) => `"${k}" = $${i + 2}`).join(", ");
  const vals = keys.map((k) => fields[k]);
  const { rows } = await query(`UPDATE roles SET ${set} WHERE key = $1 RETURNING *`, [key, ...vals]);
  return rows[0] || null;
}

export async function deleteRole(key) {
  await query(`DELETE FROM roles WHERE key = $1`, [key]);
  return true;
}
