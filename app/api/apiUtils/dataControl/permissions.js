// app/api/apiUtils/dataControl/permissions.js
import { query, withTransaction } from "../s_env/db.js";

export const PERMS = [
  { k: "view", name: "View" },
  { k: "add", name: "Add" },
  { k: "edit", name: "Edit" },
  { k: "delete", name: "Delete" },
  { k: "approve", name: "Approve" },
  { k: "export", name: "Export" },
  { k: "reports", name: "Reports" },
  { k: "dash", name: "Dashboard" },
];

/** Grants for one role: [{module_key, perm_key}]. */
export async function getRolePermissions(roleKey) {
  const { rows } = await query(
    `SELECT module_key, perm_key FROM role_permissions WHERE role_key = $1`,
    [roleKey]
  );
  return rows;
}

/** Replace a role's grants with the given list [{module_key, perm_key}]. */
export async function setRolePermissions(roleKey, grants = []) {
  await withTransaction(async (client) => {
    await client.query(`DELETE FROM role_permissions WHERE role_key = $1`, [roleKey]);
    for (const g of grants) {
      if (!g?.module_key || !g?.perm_key) continue;
      await client.query(
        `INSERT INTO role_permissions (role_key, module_key, perm_key)
         VALUES ($1,$2,$3) ON CONFLICT DO NOTHING`,
        [roleKey, g.module_key, g.perm_key]
      );
    }
  });
  return true;
}
