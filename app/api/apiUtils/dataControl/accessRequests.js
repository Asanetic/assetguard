// app/api/apiUtils/dataControl/accessRequests.js
import { query } from "../s_env/db.js";

/** New + Declined requests (Handled ones drop off the list). */
export async function listAccessRequests() {
  const { rows } = await query(
    `SELECT * FROM access_requests WHERE status IN ('New','Declined') ORDER BY created_at DESC`
  );
  return rows;
}

/** Create a request (from the public Request-access screen). */
export async function createAccessRequest({ name, email, phone, company, problem }) {
  const { rows } = await query(
    `INSERT INTO access_requests (name, email, phone, company, problem)
     VALUES ($1,$2,$3,$4,$5) RETURNING *`,
    [name, email, phone, company, problem]
  );
  const r = rows[0];
  if (!r.req_no) {
    const no = "REQ-" + String(r.id).padStart(3, "0");
    await query(`UPDATE access_requests SET req_no = $2 WHERE id = $1`, [r.id, no]);
    r.req_no = no;
  }
  return r;
}

export async function setAccessRequestStatus(id, status) {
  const { rows } = await query(
    `UPDATE access_requests SET status = $2 WHERE id = $1 RETURNING *`,
    [id, status]
  );
  return rows[0] || null;
}
