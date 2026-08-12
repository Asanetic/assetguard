// app/api/apiUtils/dataControl/companies.js
// -----------------------------------------------------------------------------
// Company data access (from prototype COMPANY_STORE). Purposes: Client/NOC/Response.
// sites/users counts are derived so the admin table matches the prototype.
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

/** A user's org context: role + their company's name and purposes (Client/NOC/
 *  Response). Drives the monitoring-vs-security acknowledge side. */
export async function getUserOrg(userId) {
  if (!userId) return null;
  const { rows } = await query(
    `SELECT u.role, c.name AS company, COALESCE(c.purposes, '{}') AS purposes
       FROM users u LEFT JOIN companies c ON c.id = u.company_id
      WHERE u.id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

export async function listCompanies(q) {
  const params = [];
  let clause = "";
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    clause = `WHERE lower(c.name) LIKE $1 OR lower(c.contact_email) LIKE $1
              OR lower(array_to_string(c.purposes, ' ')) LIKE $1`;
  }
  const { rows } = await query(
    `SELECT c.id, c.code, c.name, c.purposes,
            c.contact_email, c.phone,
            COALESCE(c.status, 'Active') AS status,
            c.created_at,
            (SELECT COUNT(*)::int FROM users u WHERE u.company_id = c.id) AS users
       FROM companies c
       ${clause}
      ORDER BY c.created_at DESC`,
    params
  );
  // sites don't link to companies yet, so that count stays 0 for now.
  return rows.map((r) => ({ ...r, sites: 0, type: companyType(r.purposes) }));
}

/** Bulk import: create companies that don't already exist (by name). */
export async function importCompanies(list = []) {
  let imported = 0, skipped = 0;
  for (const r of list) {
    const name = String(r?.name || "").trim();
    if (!name) { skipped += 1; continue; }
    if (await findCompanyByName(name)) { skipped += 1; continue; }
    await createCompany({
      name,
      purposes: Array.isArray(r.purposes) ? r.purposes : [],
      contactEmail: r.email || null,
      phone: r.phone || null,
    });
    imported += 1;
  }
  return { imported, skipped, total: imported + skipped };
}

export async function updateCompany(id, { name, purposes = [], contactEmail, phone, status }) {
  const { rows } = await query(
    `UPDATE companies
        SET name = $2, purposes = $3, contact_email = $4, phone = $5,
            status = COALESCE($6, status)
      WHERE id = $1
     RETURNING id, code, name, purposes, contact_email, phone, status, created_at`,
    [id, String(name || "").trim(), purposes, contactEmail || null, phone || null, status || null]
  );
  return rows[0] || null;
}

// Companies whose purposes include a given one (e.g. 'Response' for the Response
// Teams page's security-company dropdown). No admin gate — just names.
export async function listCompaniesByPurpose(purpose) {
  const { rows } = await query(
    `SELECT name FROM companies WHERE $1 = ANY(purposes) ORDER BY name`,
    [purpose]
  );
  return rows.map((r) => r.name);
}

// Classify a company from its purposes (agreed rule): Response + NOC => Security
// company; NOC only => Monitoring company; Response only => Response company; else
// Client/other.
export function companyType(purposes = []) {
  const p = (purposes || []).map((x) => String(x).toLowerCase());
  const noc = p.includes("noc"), resp = p.includes("response");
  if (resp && noc) return "Security company";
  if (noc) return "Monitoring company";
  if (resp) return "Response company";
  if (p.includes("client")) return "Client";
  return "—";
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
