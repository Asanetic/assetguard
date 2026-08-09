// app/api/apiUtils/dataControl/companies.js
// -----------------------------------------------------------------------------
// Company data access (from prototype COMPANY_STORE). Purposes: Client/NOC/Response.
// sites/users counts are derived so the admin table matches the prototype.
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

export async function listCompanies(q) {
  const params = [];
  let clause = "";
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    clause = `WHERE lower(c.name) LIKE $1 OR lower(c.contact_email) LIKE $1
              OR lower(array_to_string(c.purposes, ' ')) LIKE $1`;
  }
  const { rows } = await query(
    `SELECT c.id, c.code, c.name, c.purposes, c.contact_email, c.phone, c.status,
            c.created_at,
            (SELECT COUNT(*)::int FROM users u WHERE u.company_id = c.id) AS users
       FROM companies c
       ${clause}
      ORDER BY c.created_at DESC`,
    params
  );
  // sites count is 0 until the sites module exists.
  return rows.map((r) => ({ ...r, sites: 0 }));
}

export async function findCompanyByName(name) {
  const { rows } = await query(
    "SELECT * FROM companies WHERE lower(name) = lower($1) LIMIT 1",
    [String(name || "").trim()]
  );
  return rows[0] || null;
}

/** Company names for the registration dropdown. */
export async function companyNames() {
  const { rows } = await query(
    "SELECT name FROM companies WHERE status = 'Active' ORDER BY name"
  );
  return rows.map((r) => r.name);
}

/** Create a company; auto-generates the CMP-### code. */
export async function createCompany({ name, purposes = [], contactEmail, phone }) {
  const { rows } = await query(
    `INSERT INTO companies (code, name, purposes, contact_email, phone)
     VALUES (
       'CMP-' || lpad(((SELECT COUNT(*) FROM companies) + 1)::text, 3, '0'),
       $1, $2, $3, $4)
     RETURNING id, code, name, purposes, contact_email, phone, status, created_at`,
    [name.trim(), purposes, contactEmail || null, phone || null]
  );
  return { ...rows[0], sites: 0, users: 0 };
}
