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

// ---- Live alarms raised by the ingest alarm engine -------------------------
// Map the engine's alarm type to the table's (name, priority) shape.
const LIVE_META = {
  DISTURBANCE:     { priority: "Critical", name: (v) => `Disturbance${v ? ` — ${v}` : ""}` },
  CRITICAL_MOTION: { priority: "Critical", name: (v) => `Critical Motion — ${v} km/h` },
  LOW_BATTERY:     { priority: "High",     name: (v) => `Low Battery — ${v}%` },
  GEOFENCE_EXIT:   { priority: "Critical", name: (v) => `Geofence Violation — ${v} m from site` },
  DEVICE_OFFLINE:  { priority: "High",     name: () => `Device Offline` },
};

/**
 * Insert one live alarm into the shared `alarms` table (status 'Open', so it
 * counts toward the nav badge + speaker). De-duped: while an alarm of the same
 * (device, type) is still Open/Acknowledged, a repeat is a no-op — so a condition
 * that persists every second doesn't stack rows. Returns the new row or null.
 */
export async function insertLiveAlarm({ alarmType, value, deviceIdText, site, serial, lat, lng }) {
  const meta = LIVE_META[alarmType] || { priority: "Medium", name: () => alarmType };
  const name = meta.name(value);
  const { rows } = await query(
    `INSERT INTO alarms (id, name, priority, device_id, site, serial, status, lat, lng, alarm_type, source)
       SELECT 'ALM-' || to_char(now(), 'YYYY') || '-' || nextval('alarms_live_seq'),
              $1, $2, $3, $4, $5, 'Open', $6, $7, $8, 'device'
        WHERE NOT EXISTS (
          SELECT 1 FROM alarms
           WHERE device_id = $3 AND alarm_type = $8 AND status <> 'Closed'
        )
     RETURNING *`,
    [name, meta.priority, deviceIdText || null, site || null, serial || null,
     lat ?? null, lng ?? null, alarmType]
  );
  return rows[0] || null; // null = de-duped (already open)
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
