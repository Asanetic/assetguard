// app/api/apiUtils/dataControl/audit.js
// -----------------------------------------------------------------------------
// Audit log data access (from prototype AUDIT_STORE). The log is append-only:
//   listAudit()  reads the trail, newest first, with optional search + category.
//   writeAudit() appends one entry — call it from any route after a meaningful
//                action (user approved, site deleted, company registered, ...).
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";
import { getAuth } from "../authUtils/session.js";

// Categories the UI knows how to colour. Anything else falls back to "System".
export const AUDIT_CATEGORIES = ["Users", "Sites", "Devices", "Alarms", "Companies", "System"];

function clientIp(request) {
  try {
    const xff = request.headers.get("x-forwarded-for");
    if (xff) return xff.split(",")[0].trim();
    return request.headers.get("x-real-ip") || null;
  } catch { return null; }
}

/**
 * Fire-and-forget audit logging for use inside route handlers. Reads the actor
 * from the request's session, then writes an entry WITHOUT blocking or throwing
 * into the request path — a failed audit write must never break the action it
 * describes. Call it right after the action succeeds.
 *
 * @param {Request} request  the route's Request (for actor + IP)
 * @param {{ action: string, category?: string, detail?: string }} entry
 */
export function logAudit(request, { action, category = "System", detail = "" } = {}) {
  try {
    const user = getAuth(request);
    writeAudit({
      actorName: (user && (user.name || user.email)) || "System",
      actorRole: (user && user.role) || null,
      action,
      category,
      detail,
      ip: clientIp(request),
    }).catch(() => {});
  } catch { /* never let auditing break the request */ }
}

/**
 * Read the audit trail, newest first.
 * @param {{ q?: string, category?: string, limit?: number }} [opts]
 */
export async function listAudit(opts = {}) {
  const { q, category, limit = 1000 } = opts;
  const params = [];
  const where = [];

  if (category && category !== "all") {
    params.push(category);
    where.push(`category = $${params.length}`);
  }
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where.push(
      `(lower(actor_name) LIKE $${params.length} OR lower(action) LIKE $${params.length} OR lower(detail) LIKE $${params.length})`
    );
  }
  params.push(Math.min(Number(limit) || 1000, 5000));

  const { rows } = await query(
    `SELECT to_char(ts, 'YYYY-MM-DD HH24:MI:SS') AS ts,
            actor_name AS user, actor_role AS role,
            action, category AS cat, detail, ip
       FROM audit_logs
       ${where.length ? "WHERE " + where.join(" AND ") : ""}
      ORDER BY ts DESC, id DESC
      LIMIT $${params.length}`,
    params
  );
  return rows;
}

/**
 * Append one entry to the audit trail.
 * @param {{ actorName: string, actorRole?: string, action: string, category?: string, detail?: string, ip?: string }} entry
 */
export async function writeAudit(entry) {
  const {
    actorName, actorRole = null, action,
    category = "System", detail = "", ip = null,
  } = entry || {};
  if (!actorName || !action) throw new Error("writeAudit requires actorName and action");
  const cat = AUDIT_CATEGORIES.includes(category) ? category : "System";
  const { rows } = await query(
    `INSERT INTO audit_logs (actor_name, actor_role, action, category, detail, ip)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING to_char(ts, 'YYYY-MM-DD HH24:MI:SS') AS ts,
               actor_name AS user, actor_role AS role, action, category AS cat, detail, ip`,
    [actorName, actorRole, action, cat, detail, ip]
  );
  return rows[0];
}
