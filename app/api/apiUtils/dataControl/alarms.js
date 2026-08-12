// app/api/apiUtils/dataControl/alarms.js
// Asset alarm access — the alarms landing map + list. Severity (priority) is one
// of Critical | High | Medium | Low; status is Open | Acknowledged.
import { query } from "../s_env/db.js";

// ---- visibility ------------------------------------------------------------
// SECURITY-side users (security company + security personnel) may see ONLY
// Critical alarms; non-Critical alarms belong to the monitoring company / admins
// / senior users. Callers pass `restrictCritical` (computed from the viewer's
// company via alarmPerms). The legacy role-only helper is kept as a fallback.
const FULL_VIEW_ROLES = new Set(["admin", "superadmin"]);
export function criticalOnly(role) {
  return !FULL_VIEW_ROLES.has(String(role || "").toLowerCase());
}

export async function listAlarms({ priority, q, status, includeClosed = false, role, restrictCritical } = {}) {
  const where = [];
  const params = [];
  // A restricted (security-side) user is forced to Critical regardless of the
  // requested priority filter — they can't widen their own view.
  const restrict = restrictCritical != null ? restrictCritical : criticalOnly(role);
  const effPriority = restrict ? "Critical" : priority;
  if (effPriority && effPriority !== "All" && effPriority !== "All priorities") { params.push(effPriority); where.push(`priority = $${params.length}`); }
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
export async function alarmCounts(role, restrictCritical) {
  const { rows } = await query(`SELECT priority, status, COUNT(*)::int AS n FROM alarms GROUP BY priority, status`);
  const bySeverity = { Critical: 0, High: 0, Medium: 0, Low: 0 };
  let open = 0, criticalOpen = 0, closed = 0;
  rows.forEach((r) => {
    if (r.status === "Closed") { closed += r.n; return; } // closed isn't counted in any severity
    bySeverity[r.priority] = (bySeverity[r.priority] || 0) + r.n;
    if (r.status === "Open") { open += r.n; if (r.priority === "Critical") criticalOpen += r.n; }
  });
  const restrict = restrictCritical != null ? restrictCritical : criticalOnly(role);
  // Restricted users only ever see Critical — zero the other tiers and report the
  // open count as the critical-open count (so their badge/speaker match their view).
  if (restrict) {
    return { bySeverity: { Critical: bySeverity.Critical, High: 0, Medium: 0, Low: 0 },
             closed: 0, open: criticalOpen, criticalOpen };
  }
  return { bySeverity, closed, open, criticalOpen };
}

// ---- Live alarms raised by the ingest alarm engine -------------------------
// Map the engine's alarm type to the table's (name, priority) shape.
// engine type -> { tier, display name }. Confirmed in claude/alarms-and-severity.md.
const LIVE_META = {
  DISTURBANCE:          { priority: "Critical", name: (v) => `Disturbance${v ? ` — ${v}` : ""}` },
  DISTURBANCE_TECH:     { priority: "Low",      name: () => `Disturbance — tech on site` },
  GEOFENCE_EXIT:        { priority: "Critical", name: (v) => `Geofence Violation — ${v} m from site` },
  CRITICAL_MOTION:      { priority: "Critical", name: (v, ctx) => `Critical Motion — ${v}${ctx?.road ? ` on ${ctx.road}` : ""}` },
  CRITICAL_LOW_BATTERY: { priority: "High",     name: (v) => `Critical Low Battery — ${v}%` },
  LOW_BATTERY:          { priority: "Medium",   name: (v) => `Low Battery — ${v}%` },
  HIGH_TEMPERATURE:     { priority: "High",     name: (v) => `High Temperature — ${v}°C` },
  DEVICE_OFFLINE:       { priority: "High",     name: () => `Device Offline` },
  LOW_DATA:             { priority: "Medium",   name: (v) => `Low Data — ${v} MB left` },
  NOTIFICATION_FAILED:  { priority: "Medium",   name: () => `Notification Failed To Send` },
};

/**
 * Insert one live alarm into the shared `alarms` table (status 'Open', so it
 * counts toward the nav badge + speaker). De-duped: while an alarm of the same
 * (device, type) is still Open/Acknowledged, a repeat is a no-op — so a condition
 * that persists every second doesn't stack rows. Returns the new row or null.
 */
export async function insertLiveAlarm({ alarmType, value, deviceIdText, site, serial, lat, lng, road }) {
  const meta = LIVE_META[alarmType] || { priority: "Medium", name: () => alarmType };
  const name = meta.name(value, { road });
  // Alarm location is ALWAYS the SITE location, for every alarm category. When a
  // caller doesn't supply coordinates (e.g. the Device Offline sweep, which has no
  // packet position), resolve the device's site coordinates so the alarm still
  // pins on the map instead of vanishing.
  let plat = lat ?? null, plng = lng ?? null;
  if ((plat == null || plng == null) && deviceIdText) {
    try {
      const { rows: sc } = await query(
        `SELECT s.lat, s.lng FROM devices d LEFT JOIN sites s ON s.id = d.site_id
          WHERE d.device_id = $1 OR d.imei = $1 LIMIT 1`,
        [deviceIdText]
      );
      if (sc[0]) { if (plat == null) plat = sc[0].lat; if (plng == null) plng = sc[0].lng; }
    } catch (e) { console.error("[insertLiveAlarm] site coord lookup:", e?.message || e); }
  }
  lat = plat; lng = plng;
  // Try to store the road (Critical Motion) too; fall back to the core insert if
  // the alarms.road column hasn't been migrated yet.
  try {
    const { rows } = await query(
      `INSERT INTO alarms (id, name, priority, device_id, site, serial, status, lat, lng, alarm_type, source, road)
         SELECT 'ALM-' || to_char(now(), 'YYYY') || '-' || nextval('alarms_live_seq'),
                $1, $2, $3, $4, $5, 'Open', $6, $7, $8, 'device', $9
          WHERE NOT EXISTS (
            SELECT 1 FROM alarms WHERE device_id = $3 AND alarm_type = $8 AND status <> 'Closed'
          )
       RETURNING *`,
      [name, meta.priority, deviceIdText || null, site || null, serial || null,
       lat ?? null, lng ?? null, alarmType, road ?? null]
    );
    return rows[0] || null; // null = de-duped (already open)
  } catch {
    const { rows } = await query(
      `INSERT INTO alarms (id, name, priority, device_id, site, serial, status, lat, lng, alarm_type, source)
         SELECT 'ALM-' || to_char(now(), 'YYYY') || '-' || nextval('alarms_live_seq'),
                $1, $2, $3, $4, $5, 'Open', $6, $7, $8, 'device'
          WHERE NOT EXISTS (
            SELECT 1 FROM alarms WHERE device_id = $3 AND alarm_type = $8 AND status <> 'Closed'
          )
       RETURNING *`,
      [name, meta.priority, deviceIdText || null, site || null, serial || null,
       lat ?? null, lng ?? null, alarmType]
    );
    return rows[0] || null;
  }
}

// Auto-clear an open alarm of a given type for a device (used by the offline sweep
// when a device comes back and reports). Closes any Open/Acknowledged matching row.
export async function clearOpenAlarm(deviceIdText, alarmType) {
  if (!deviceIdText) return 0;
  const { rowCount } = await query(
    `UPDATE alarms SET status = 'Closed'
      WHERE device_id = $1 AND alarm_type = $2 AND status <> 'Closed'`,
    [deviceIdText, alarmType]
  );
  return rowCount;
}

export async function acknowledgeAlarm(id) {
  const { rows } = await query(
    `UPDATE alarms SET status = 'Acknowledged' WHERE id = $1 AND status = 'Open' RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

// ---- View Alarm: detail, linked alarms, dual acknowledge, close, lifecycle --

export async function getAlarm(id) {
  const { rows } = await query(`SELECT * FROM alarms WHERE id = $1 LIMIT 1`, [id]);
  return rows[0] || null;
}

// Other alarms on the same device around this one — the geofence / critical-motion
// / preceding alarms that belong to the same event. Window: 60 min before to 30
// min after the anchor alarm.
export async function getLinkedAlarms(alarm) {
  if (!alarm || !alarm.device_id) return [];
  try {
    const { rows } = await query(
      `SELECT id, name, priority, alarm_type, status, created_at
         FROM alarms
        WHERE device_id = $1 AND id <> $2
          AND created_at >= $3::timestamptz - interval '60 minutes'
          AND created_at <= $3::timestamptz + interval '30 minutes'
        ORDER BY created_at ASC`,
      [alarm.device_id, alarm.id, alarm.created_at]
    );
    return rows;
  } catch (e) {
    console.error("[getLinkedAlarms] error:", e?.message || e);
    return [];
  }
}

// Record one side's acknowledgement. side is 'monitoring' | 'security'. Sets that
// side's who/when/finding/note and flips Open -> Acknowledged (leaving the other
// side free to still ack). Returns the updated row.
export async function acknowledgeSide(id, side, { by, finding, note } = {}) {
  const s = side === "security" ? "security" : "monitoring"; // whitelist -> safe in SQL
  const { rows } = await query(
    `UPDATE alarms SET
        ack_${s}_at = now(), ack_${s}_by = $2, ack_${s}_finding = $3, ack_${s}_note = $4,
        status = CASE WHEN status = 'Open' THEN 'Acknowledged' ELSE status END
      WHERE id = $1
      RETURNING *`,
    [id, by || null, finding || null, note || null]
  );
  return rows[0] || null;
}

export async function closeAlarmFull(id, { by, outcome, note, photos } = {}) {
  const out = outcome === "false" ? "false" : "genuine";
  const { rows } = await query(
    `UPDATE alarms SET status = 'Closed', closed_at = now(), closed_by = $2,
            close_outcome = $3, close_note = $4, close_photos = $5::jsonb
      WHERE id = $1 AND status <> 'Closed'
      RETURNING *`,
    [id, by || null, out, note || null, JSON.stringify(Array.isArray(photos) ? photos : [])]
  );
  return rows[0] || null;
}

// Device state at/around the trigger, for the "Device snapshot" card.
export async function getAlarmDeviceSnapshot(deviceIdText) {
  if (!deviceIdText) return null;
  let dev = null;
  try {
    const { rows } = await query(
      `SELECT id, battery, data_left, firmware, status, config FROM devices WHERE device_id = $1 LIMIT 1`,
      [deviceIdText]
    );
    dev = rows[0] || null;
  } catch { dev = null; }
  let tel = null;
  if (dev) {
    try {
      const { rows } = await query(
        `SELECT speed, battery, received_at FROM device_telemetry WHERE device_id = $1 ORDER BY received_at DESC LIMIT 1`,
        [dev.id]
      );
      tel = rows[0] || null;
    } catch { tel = null; }
  }
  const cfg = (dev && dev.config) || {};
  const motion = cfg.motion_sensitivity ?? cfg.motion?.mems_mg ?? null;
  return {
    battery: tel?.battery ?? dev?.battery ?? null,
    dataBundle: dev?.data_left ?? null,
    motionSensitivity: motion != null ? `${motion}/100` : null,
    speed: tel?.speed ?? null,
    status: dev?.status ?? null,
    firmware: dev?.firmware ?? null,
  };
}

// Assemble the lifecycle log: triggered + linked alarms + each side's ack + close,
// all under this event, sorted oldest-first.
export function buildLifecycle(alarm, linked = [], responses = []) {
  const ev = [];
  // The anchor alarm + every linked alarm on the same device appear as alarm
  // events, titled by name; the anchor is tagged "(this alarm)".
  ev.push({ at: alarm.created_at, kind: "alarm", alarmType: alarm.alarm_type, thisAlarm: true,
    title: alarm.name, detail: `This alarm · ${alarm.device_id || ""}`.trim() });
  for (const l of linked) {
    ev.push({ at: l.created_at, kind: "alarm", alarmType: l.alarm_type,
      title: l.name, detail: `Linked ${l.priority} alarm · same device` });
  }
  // Response started — one per responder (several may respond); team name if the
  // responder is on a team, otherwise just their name.
  for (const rp of responses) {
    const team = rp.team_name || rp.team_code;
    ev.push({ at: rp.started_at, kind: "response", by: rp.responder_by,
      title: "Response started", detail: `by ${rp.responder_by || "responder"}${team ? ` · ${team}` : ""}` });
  }
  const actor = (by, finding, note) => {
    let s = by ? `by ${by}` : "";
    if (finding) s += `${s ? " — " : ""}${finding}`;
    if (note) s += `${s ? " · " : ""}“${note}”`;
    return s;
  };
  if (alarm.ack_monitoring_at) {
    ev.push({ at: alarm.ack_monitoring_at, kind: "ack", title: "Acknowledged — Monitoring",
      by: alarm.ack_monitoring_by, detail: actor(alarm.ack_monitoring_by, alarm.ack_monitoring_finding, alarm.ack_monitoring_note) });
  }
  if (alarm.ack_security_at) {
    ev.push({ at: alarm.ack_security_at, kind: "ack", title: "Acknowledged — Security",
      by: alarm.ack_security_by, detail: actor(alarm.ack_security_by, alarm.ack_security_finding, alarm.ack_security_note) });
  }
  if (alarm.closed_at) {
    ev.push({ at: alarm.closed_at, kind: "closed", title: `Closed — ${alarm.close_outcome === "false" ? "False alarm" : "Genuine"}`,
      by: alarm.closed_by, detail: actor(alarm.closed_by, null, alarm.close_note) });
  }
  return ev.sort((a, b) => new Date(a.at) - new Date(b.at));
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
