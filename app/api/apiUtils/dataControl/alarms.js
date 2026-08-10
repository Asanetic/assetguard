// app/api/apiUtils/dataControl/alarms.js
// Asset alarm access — the alarms landing map + list. Severity (priority) is one
// of Critical | High | Medium | Low; status is Open | Acknowledged.
import { query } from "../s_env/db.js";

export async function listAlarms({ priority, q, status, includeClosed = false } = {}) {
  const where = [];
  const params = [];
  if (priority && priority !== "All" && priority !== "All priorities") { params.push(priority); where.push(`priority = $${params.length}`); }
  if (status && status !== "All" && status !== "All statuses") { params.push(status); where.push(`status = $${params.length}`); }
  else if (!includeClosed) where.push(`status <> 'Closed'`); // the map + landing show active alarms only
  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    const i = params.length;
    where.push(`(lower(name) LIKE $${i} OR lower(device_id) LIKE $${i} OR lower(site) LIKE $${i} OR lower(serial) LIKE $${i} OR lower(id) LIKE $${i})`);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  // Open first, then Acknowledged, then Closed; newest within each.
  const { rows } = await query(
    `SELECT * FROM alarms ${clause}
      ORDER BY (status = 'Open') DESC, (status = 'Acknowledged') DESC, created_at DESC`,
    params
  );
  return rows;
}

/**
 * Severity counts (Critical/High/Medium/Low EXCLUDE closed, like the prototype),
 * plus the closed total, the open total and critical-open (for the nav badge).
 */
export async function alarmCounts() {
  const { rows } = await query(`SELECT priority, status, COUNT(*)::int AS n FROM alarms GROUP BY priority, status`);
  const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  let open = 0, criticalOpen = 0, closed = 0;
  rows.forEach((r) => {
    if (r.status === "Closed") { closed += r.n; return; } // closed isn't counted in any severity
    bySeverity[r.priority] = (bySeverity[r.priority] || 0) + r.n;
    if (r.status === "Open") { open += r.n; if (r.priority === "Critical") criticalOpen += r.n; }
  });
  return { bySeverity, closed, open, criticalOpen };
}

export async function acknowledgeAlarm(id) {
  const { rows } = await query(
    `UPDATE alarms SET status = 'Acknowledged' WHERE id = $1 AND status = 'Open' RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

// ---- Missed alarms (recorded by hand — they feed the SLA report) ----------
export async function listMissedAlarms() {
  const { rows } = await query(`SELECT * FROM missed_alarms ORDER BY created_at DESC`);
  return rows;
}
export async function addMissedAlarm({ kind, device, note }) {
  const k = kind === "timestamp" ? "timestamp" : "recording";
  const { rows } = await query(
    `INSERT INTO missed_alarms (id, kind, device, note)
       VALUES ('MIS-' || nextval('missed_alarms_seq'), $1, $2, $3)
     RETURNING *`,
    [k, String(device || "").trim() || null, String(note || "").trim() || null]
  );
  return rows[0];
}
