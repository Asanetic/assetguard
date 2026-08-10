// app/api/apiUtils/dataControl/crud.js
// -----------------------------------------------------------------------------
// Small generic CRUD helpers built on the s_env pool. Keep them simple:
// table + plain-object filters. Anything fancier gets its own query file.
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

/** Build "col1 = $1 AND col2 = $2" and its value array from a filter object. */
function buildWhere(filters = {}, startIndex = 1) {
  const keys = Object.keys(filters);
  if (keys.length === 0) return { clause: "", values: [] };
  const parts = keys.map((k, i) => `"${k}" = $${startIndex + i}`);
  return {
    clause: "WHERE " + parts.join(" AND "),
    values: keys.map((k) => filters[k]),
  };
}

/** Return the first row matching filters, or null. */
export async function findOne(table, filters = {}) {
  const { clause, values } = buildWhere(filters);
  const { rows } = await query(
    `SELECT * FROM "${table}" ${clause} LIMIT 1`,
    values
  );
  return rows[0] || null;
}

/** Return all rows matching filters. */
export async function findMany(table, filters = {}) {
  const { clause, values } = buildWhere(filters);
  const { rows } = await query(`SELECT * FROM "${table}" ${clause}`, values);
  return rows;
}

/** Insert a record and return the created row. */
export async function insertOne(table, data = {}) {
  const keys = Object.keys(data);
  const cols = keys.map((k) => `"${k}"`).join(", ");
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(", ");
  const values = keys.map((k) => data[k]);
  const { rows } = await query(
    `INSERT INTO "${table}" (${cols}) VALUES (${placeholders}) RETURNING *`,
    values
  );
  return rows[0];
}

/** Update rows matching filters, return updated rows. */
export async function updateMany(table, filters, data) {
  const dataKeys = Object.keys(data);
  const setParts = dataKeys.map((k, i) => `"${k}" = $${i + 1}`);
  const setValues = dataKeys.map((k) => data[k]);
  const { clause, values: whereValues } = buildWhere(
    filters,
    dataKeys.length + 1
  );
  const { rows } = await query(
    `UPDATE "${table}" SET ${setParts.join(", ")} ${clause} RETURNING *`,
    [...setValues, ...whereValues]
  );
  return rows;
}
