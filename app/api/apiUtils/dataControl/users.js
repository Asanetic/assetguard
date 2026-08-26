// app/api/apiUtils/dataControl/users.js
// -----------------------------------------------------------------------------
// User data access. Identity = email OR phone. Users join to companies + roles.
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

// Columns safe to return to clients (never the password hash).
const SAFE = `
  u.id, u.name, u.email, u.phone, u.company_id, c.name AS company,
  u.role, r.name AS role_name, u.status, u.regions,
  u.email_verified, u.phone_verified, u.approved_at, u.last_seen, u.created_at`;

const FROM = `FROM users u
  LEFT JOIN companies c ON c.id = u.company_id
  LEFT JOIN roles r     ON r.key = u.role`;

export function normalizeIdentity(identity) {
  return String(identity || "").trim().toLowerCase();
}

/** Full row incl. password — for auth checks only. */
export async function findUserByIdentity(identity) {
  const id = normalizeIdentity(identity);
  if (!id) return null;
  const { rows } = await query(
    `SELECT u.*, c.name AS company, r.name AS role_name
       FROM users u
       LEFT JOIN companies c ON c.id = u.company_id
       LEFT JOIN roles r     ON r.key = u.role
      WHERE lower(u.email) = $1
         OR regexp_replace(u.phone, '\\s+', '', 'g') = regexp_replace($2, '\\s+', '', 'g')
      LIMIT 1`,
    [id, id]
  );
  return rows[0] || null;
}

export async function findUserById(id) {
  const { rows } = await query(`SELECT ${SAFE} ${FROM} WHERE u.id = $1`, [id]);
  return rows[0] || null;
}

/** List users, optionally filtered by status and/or a search term. */
export async function listUsers({ status, q } = {}) {
  const where = [];
  const params = [];
  if (status) {
    params.push(status);
    where.push(`u.status = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const i = params.length;
    where.push(
      `(lower(u.name) LIKE $${i} OR lower(u.email) LIKE $${i} OR lower(u.phone) LIKE $${i} OR lower(c.name) LIKE $${i})`
    );
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT ${SAFE} ${FROM} ${clause} ORDER BY u.created_at DESC`,
    params
  );
  return rows;
}

/** Count users grouped by status (for the tab badges). */
export async function countByStatus() {
  const { rows } = await query(
    `SELECT status, COUNT(*)::int AS n FROM users GROUP BY status`
  );
  return rows.reduce((acc, r) => ((acc[r.status] = r.n), acc), {});
}

/** Create a Pending registration. passwordHash must be pre-hashed. */
export async function createUser({
  name,
  email,
  phone,
  companyId,
  passwordHash,
  status = "Pending",
  emailVerified = false,
  phoneVerified = false,
}) {
  const { rows } = await query(
    `INSERT INTO users (name, email, phone, company_id, password, status, email_verified, phone_verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING id, name, email, phone, company_id, status`,
    [name, email, phone, companyId, passwordHash, status, emailVerified, phoneVerified]
  );
  return rows[0];
}

/** Approve a pending user: assign a role + optional regions, set Active. */
export async function approveUser(id, { role, regions = [], approvedBy = null }) {
  const { rows } = await query(
    `UPDATE users
        SET role = $2, regions = $3, status = 'Active',
            approved_by = $4, approved_at = now()
      WHERE id = $1
      RETURNING id, status, role`,
    [id, role, regions, approvedBy]
  );
  return rows[0] || null;
}

/** Set a user's status (Rejected / Suspended / Active). */
export async function setStatus(id, status) {
  const { rows } = await query(
    `UPDATE users SET status = $2 WHERE id = $1 RETURNING id, status`,
    [id, status]
  );
  return rows[0] || null;
}

/** Change a user's role. */
export async function setRole(id, role) {
  const { rows } = await query(
    `UPDATE users SET role = $2 WHERE id = $1 RETURNING id, role`,
    [id, role]
  );
  return rows[0] || null;
}

/** Update editable profile fields (name / email / phone / company). */
export async function updateUserProfile(id, { name, email, phone, companyId }) {
  const { rows } = await query(
    `UPDATE users
        SET name       = COALESCE($2, name),
            email      = COALESCE($3, email),
            phone      = COALESCE($4, phone),
            company_id = $5
      WHERE id = $1
      RETURNING id, name, email, phone, company_id, status`,
    [id, name || null, email || null, phone || null, companyId || null]
  );
  return rows[0] || null;
}

/** Self-service: update ONLY your own name / phone (never role/email/company). */
export async function updateSelfProfile(id, { name, phone } = {}) {
  const { rows } = await query(
    `UPDATE users SET name = COALESCE($2, name), phone = COALESCE($3, phone)
      WHERE id = $1 RETURNING id`,
    [id, name ?? null, phone ?? null]
  );
  return rows[0] || null;
}

/**
 * Self-service identity update: name, and OPTIONALLY email / phone.
 *
 * Separate from `updateSelfProfile` (name + phone only) because email and phone
 * are LOGIN IDENTITIES — `findUserByIdentity` matches on both — so changing
 * either is an account-takeover surface. The caller must have CONSUMED a
 * one-time code against the new value and re-checked the current password
 * before calling this. `mainapp/profile` PUT does both; nothing else should
 * call this function without doing the same.
 *
 * Supplying an email or phone also sets the corresponding `*_verified` flag,
 * because a value that just passed an OTP is verified by definition.
 */
export async function updateSelfIdentity(id, { name, email, phone } = {}) {
  const { rows } = await query(
    `UPDATE users
        SET name           = COALESCE($2, name),
            email          = COALESCE($3, email),
            phone          = COALESCE($4, phone),
            email_verified = CASE WHEN $3 IS NULL THEN email_verified ELSE true END,
            phone_verified = CASE WHEN $4 IS NULL THEN phone_verified ELSE true END
      WHERE id = $1
      RETURNING id, name, email, phone, email_verified, phone_verified`,
    [id, name ?? null, email ?? null, phone ?? null]
  );
  return rows[0] || null;
}

/**
 * Whether an email or phone already belongs to a DIFFERENT user.
 *
 * Same matching rule as `findUserByIdentity`, so "already taken" here means
 * exactly "someone could already sign in with it".
 */
export async function identityTakenByOther(id, { email, phone } = {}) {
  if (!email && !phone) return false;
  const { rows } = await query(
    `SELECT 1 FROM users
      WHERE id <> $1
        AND ( ($2::text IS NOT NULL AND lower(email) = lower($2))
           OR ($3::text IS NOT NULL AND regexp_replace(phone, '\\s+', '', 'g')
                                      = regexp_replace($3, '\\s+', '', 'g')) )
      LIMIT 1`,
    [id, email ?? null, phone ?? null]
  );
  return rows.length > 0;
}

/**
 * Flags one channel as verified, without touching its value.
 *
 * For an address the user already has but has never proved — an account an
 * administrator created, say. The caller must have consumed a code against the
 * STORED value first.
 */
export async function markVerified(id, channel) {
  const column = channel === "email" ? "email_verified" : "phone_verified";
  await query(`UPDATE users SET ${column} = true WHERE id = $1`, [id]);
  return true;
}

/** Password hash for one user (id) — for verifying the current password on change. */
export async function getPasswordHash(id) {
  const { rows } = await query(`SELECT password FROM users WHERE id = $1 LIMIT 1`, [id]);
  return rows[0]?.password || null;
}

/** Permanently delete a user. */
export async function deleteUser(id) {
  await query(`DELETE FROM users WHERE id = $1`, [id]);
  return true;
}

/** Set a user's password by id. passwordHash pre-hashed. */
export async function setPasswordById(id, passwordHash) {
  const { rows } = await query(
    `UPDATE users SET password = $2 WHERE id = $1 RETURNING id`,
    [id, passwordHash]
  );
  return rows[0] || null;
}

/** Reset a user's password by email/phone identity. passwordHash pre-hashed. */
export async function setPasswordByIdentity(channel, target, passwordHash) {
  if (channel === "email") {
    const { rowCount } = await query(
      `UPDATE users SET password = $2 WHERE lower(email) = lower($1)`,
      [String(target).trim(), passwordHash]
    );
    return rowCount > 0;
  }
  const { rowCount } = await query(
    `UPDATE users SET password = $2
       WHERE regexp_replace(phone, '\\s+', '', 'g') = regexp_replace($1, '\\s+', '', 'g')`,
    [String(target).trim(), passwordHash]
  );
  return rowCount > 0;
}

/** Set a user's region scope (TEXT[]). */
export async function setRegions(id, regions = []) {
  const { rows } = await query(
    `UPDATE users SET regions = $2 WHERE id = $1 RETURNING id, regions`,
    [id, Array.isArray(regions) ? regions : []]
  );
  return rows[0] || null;
}

/** Admin-create an ACTIVE user with a role. passwordHash must be pre-hashed. */
export async function createActiveUser({
  name, email, phone, companyId = null, role = null, regions = [], passwordHash,
}) {
  const { rows } = await query(
    `INSERT INTO users (name, email, phone, company_id, password, role, regions, status, email_verified, phone_verified)
     VALUES ($1,$2,$3,$4,$5,$6,$7,'Active', true, true)
     RETURNING id, name, email, status, role`,
    [name, email, phone, companyId, passwordHash, role, Array.isArray(regions) ? regions : []]
  );
  return rows[0];
}
