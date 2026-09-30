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
            COALESCE(c.contacts, '{}'::jsonb) AS contacts,
            COALESCE(c.status, 'Active') AS status,
            c.created_at,
            (SELECT COUNT(*)::int FROM users u WHERE u.company_id = c.id) AS users
       FROM companies c
       ${clause}
      ORDER BY c.created_at DESC`,
    params
  );
  // sites don't link to companies yet, so that count stays 0 for now.
  return rows.map((r) => ({ ...r, contacts: r.contacts || {}, sites: 0, type: companyType(r.purposes) }));
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
      contacts: r.contacts && typeof r.contacts === "object" ? r.contacts : undefined,
    });
    imported += 1;
  }
  return { imported, skipped, total: imported + skipped };
}

export async function updateCompany(id, { name, purposes = [], contactEmail, phone, status, contacts }) {
  const { rows } = await query(
    `UPDATE companies
        SET name = $2, purposes = $3, contact_email = $4, phone = $5,
            status = COALESCE($6, status),
            contacts = COALESCE($7::jsonb, contacts)
      WHERE id = $1
     RETURNING id, code, name, purposes, contact_email, phone, contacts, status, created_at`,
    [id, String(name || "").trim(), purposes, contactEmail || null, phone || null, status || null,
     contacts != null ? JSON.stringify(contacts) : null]
  );
  return rows[0] || null;
}

/**
 * A company's stored contacts (manager + 2 assistants), matched by name
 * (case-insensitive). Used to resolve a site's alarm recipients from the
 * company it is assigned to, rather than from the site's own details.
 */
export async function getCompanyContactsByName(name) {
  const n = String(name || "").trim();
  if (!n) return null;
  try {
    const { rows } = await query(
      `SELECT name, COALESCE(contacts, '{}'::jsonb) AS contacts
         FROM companies WHERE lower(name) = lower($1) LIMIT 1`,
      [n]
    );
    return rows[0] ? { name: rows[0].name, contacts: rows[0].contacts || {} } : null;
  } catch (e) { console.error("[companies] contacts by name:", e?.message || e); return null; }
}

/** The single global CLIENT company (purpose 'Client'), with its contacts. */
export async function getClientCompany() {
  try {
    const { rows } = await query(
      `SELECT name, COALESCE(contacts, '{}'::jsonb) AS contacts
         FROM companies WHERE 'Client' = ANY(purposes)
        ORDER BY created_at ASC LIMIT 1`
    );
    return rows[0] ? { name: rows[0].name, contacts: rows[0].contacts || {} } : null;
  } catch (e) { console.error("[companies] client company:", e?.message || e); return null; }
}

/**
 * Directory used by the Add/View-site screens: the single global Client company
 * plus the registered Security and Monitoring companies, each with their stored
 * contacts (manager + 2 assistants). Sites pick a Security company from this list
 * and inherit its Manager + Assistant live, so a change to the company record
 * flows to every site assigned to it with no per-site edit.
 */
export async function getSiteCompanyDirectory() {
  const { rows } = await query(
    `SELECT name, COALESCE(purposes, '{}') AS purposes,
            COALESCE(contacts, '{}'::jsonb) AS contacts
       FROM companies
      WHERE COALESCE(status, 'Active') = 'Active'
      ORDER BY name`
  );
  const security = [], monitoring = [], vendors = [];
  let client = null;
  for (const r of rows) {
    const entry = { name: r.name, contacts: r.contacts || {} };
    const t = companyType(r.purposes);
    if (t === "Security company") security.push(entry);
    else if (t === "Monitoring company") monitoring.push(entry);
    if (!client && (r.purposes || []).some((p) => String(p).toLowerCase() === "client")) client = entry;
    // SMPMS / service vendors — registered companies with the "Service vendor"
    // purpose (legacy alias "SMPMS vendor"). Feeds the Add-site SMPMS dropdown.
    if ((r.purposes || []).some((p) => /^(service vendor|smpms vendor)$/i.test(String(p)))) vendors.push(entry);
  }
  return { client, security, monitoring, vendors };
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
  // Response (alone OR with NOC) => Security company. NOC without Response =>
  // Monitoring company (Installer alongside NOC does not change that). Client =>
  // Main Company. Partner/Reseller/Installer-only or empty => no type.
  if (resp) return "Security company";
  if (noc) return "Monitoring company";
  if (p.includes("client")) return "Main Company";
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

/**
 * Delete a company — but only when no user still belongs to it.
 *
 * `users.company_id` is `ON DELETE SET NULL`, so the database itself would let
 * the row go and quietly orphan its users. That is exactly what must not happen
 * silently: a user's alarm permissions and region scope are derived from their
 * company's purposes, so unlinking them strips access with nothing on screen to
 * explain it. This refuses while any user is still attached and reports the
 * count, leaving the admin to reassign them first.
 *
 * @returns {Promise<null | {blocked:'users', users:number, company} | {deleted:true, company}>}
 *   null when the id does not exist.
 */
export async function deleteCompany(id) {
  const { rows: found } = await query(
    `SELECT id, code, name, purposes FROM companies WHERE id = $1`,
    [id]
  );
  const company = found[0];
  if (!company) return null;

  const { rows: cnt } = await query(
    `SELECT COUNT(*)::int AS n FROM users WHERE company_id = $1`,
    [id]
  );
  const users = cnt[0]?.n || 0;
  if (users > 0) return { blocked: "users", users, company };

  await query(`DELETE FROM companies WHERE id = $1`, [id]);
  return { deleted: true, company };
}

/** Create a company; auto-generates the CMP-### code. */
export async function createCompany({ name, purposes = [], contactEmail, phone, contacts }) {
  const { rows } = await query(
    `INSERT INTO companies (code, name, purposes, contact_email, phone, contacts)
     VALUES (
       'CMP-' || lpad(((SELECT COUNT(*) FROM companies) + 1)::text, 3, '0'),
       $1, $2, $3, $4, COALESCE($5::jsonb, '{}'::jsonb))
     RETURNING id, code, name, purposes, contact_email, phone, contacts, status, created_at`,
    [name.trim(), purposes, contactEmail || null, phone || null,
     contacts != null ? JSON.stringify(contacts) : null]
  );
  return { ...rows[0], sites: 0, users: 0 };
}
