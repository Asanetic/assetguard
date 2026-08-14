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
  // Latest alarm on top (newest first), regardless of status.
  const { rows } = await query(
    `SELECT * FROM alarms ${clause}
      ORDER BY created_at DESC, id DESC`,
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

// Incident (episode) grouping. One Disturbance → one Geofence → one Critical share
// an incident_id. A new Disturbance opens a NEW incident unless the SAME episode is
// still ongoing (an OPEN disturbance for the device within INCIDENT_TTL). Once the
// episode is closed, older than the TTL, or the simulator was restarted (incidentSince
// cutoff), the next Disturbance starts a fresh incident.
const INCIDENT_TTL_MS = 6 * 3600 * 1000;   // 6 hours
const EPISODE_TYPES = new Set(["DISTURBANCE", "GEOFENCE_EXIT", "CRITICAL_MOTION"]);

/**
 * Insert one live alarm, grouped into an incident. Returns the new row, or null
 * when it's a repeat within the same episode (deduped).
 */
export async function insertLiveAlarm({ alarmType, value, deviceIdText, site, serial, lat, lng, road, at, incidentSince }) {
  const meta = LIVE_META[alarmType] || { priority: "Medium", name: () => alarmType };
  const name = meta.name(value, { road });
  // Alarm location is ALWAYS the SITE location. When a caller doesn't supply coords
  // (e.g. the Device Offline sweep) resolve the device's site so it still pins.
  let plat = lat ?? null, plng = lng ?? null;
  if ((plat == null || plng == null) && deviceIdText) {
    try {
      const { rows: sc } = await query(
        `SELECT s.lat, s.lng FROM devices d LEFT JOIN sites s ON s.id = d.site_id
          WHERE d.device_id = $1 OR d.imei = $1 LIMIT 1`, [deviceIdText]);
      if (sc[0]) { if (plat == null) plat = sc[0].lat; if (plng == null) plng = sc[0].lng; }
    } catch (e) { console.error("[insertLiveAlarm] site coord lookup:", e?.message || e); }
  }
  lat = plat; lng = plng;

  // ---- resolve the incident + per-episode de-dupe --------------------------
  const refMs = at ? Date.parse(at) : Date.now();
  let winStartMs = (Number.isFinite(refMs) ? refMs : Date.now()) - INCIDENT_TTL_MS;
  if (incidentSince) { const s = Date.parse(incidentSince); if (Number.isFinite(s)) winStartMs = Math.max(winStartMs, s); }
  const winStart = new Date(winStartMs).toISOString();
  const refIso = new Date(Number.isFinite(refMs) ? refMs : Date.now()).toISOString();

  let incidentId = null;   // attach to this; null => generate a new incident
  try {
    // the device's active episode = most recent OPEN, incident-tagged alarm in the
    // window and no newer than this packet (can't join an episode from the future).
    const act = await query(
      `SELECT incident_id FROM alarms
        WHERE device_id = $1 AND incident_id IS NOT NULL AND status <> 'Closed'
          AND created_at > $2::timestamptz AND created_at <= $3::timestamptz
        ORDER BY created_at DESC LIMIT 1`, [deviceIdText, winStart, refIso]);
    const activeInc = act.rows[0]?.incident_id || null;

    if (EPISODE_TYPES.has(alarmType)) {
      if (activeInc) {
        const has = await query(
          `SELECT 1 FROM alarms WHERE incident_id = $1 AND alarm_type = $2 AND status <> 'Closed' LIMIT 1`,
          [activeInc, alarmType]);
        if (has.rows[0]) return null;          // this episode already has this alarm type
        incidentId = activeInc;                 // attach (e.g. geofence/critical joins the disturbance)
      }
      // no active episode → incidentId stays null → a fresh incident is generated
    } else {
      // non-episode types (battery/temp/offline/…): one open per device+type,
      // tagged onto the active episode if there is one.
      const has = await query(
        `SELECT 1 FROM alarms WHERE device_id = $1 AND alarm_type = $2 AND status <> 'Closed' LIMIT 1`,
        [deviceIdText, alarmType]);
      if (has.rows[0]) return null;
      incidentId = activeInc;
    }
  } catch (e) { console.error("[insertLiveAlarm] incident resolve:", e?.message || e); }

  // ---- insert (COALESCE generates a new incident id when none was attached) --
  const NEWINC = "'INC-' || to_char(now(), 'YYYY') || '-' || nextval('alarms_incident_seq')";
  try {
    const { rows } = await query(
      `INSERT INTO alarms (id, name, priority, device_id, site, serial, status, lat, lng, alarm_type, source, road, created_at, incident_id)
         SELECT 'ALM-' || to_char(now(), 'YYYY') || '-' || nextval('alarms_live_seq'),
                $1, $2, $3, $4, $5, 'Open', $6, $7, $8, 'device', $9, COALESCE($10::timestamptz, now()),
                COALESCE($11::text, ${NEWINC})
       RETURNING *`,
      [name, meta.priority, deviceIdText || null, site || null, serial || null,
       lat ?? null, lng ?? null, alarmType, road ?? null, at ?? null, incidentId]
    );
    return rows[0] || null;
  } catch {
    const { rows } = await query(
      `INSERT INTO alarms (id, name, priority, device_id, site, serial, status, lat, lng, alarm_type, source, created_at, incident_id)
         SELECT 'ALM-' || to_char(now(), 'YYYY') || '-' || nextval('alarms_live_seq'),
                $1, $2, $3, $4, $5, 'Open', $6, $7, $8, 'device', COALESCE($9::timestamptz, now()),
                COALESCE($10::text, ${NEWINC})
       RETURNING *`,
      [name, meta.priority, deviceIdText || null, site || null, serial || null,
       lat ?? null, lng ?? null, alarmType, at ?? null, incidentId]
    );
    return rows[0] || null;
  }
}

// ---- Disturbance day-rule -------------------------------------------------
// Decide what to do with an incoming disturbance report, purely from stored data:
//   count = disturbance-bit telemetry reports for this device in the CURRENT run
//           (since `sinceIso` = EAT-midnight, or a later simulator-restart cutoff)
//   'skip'  → count < threshold (the run's 1st..3rd): no alarm.
//   'raise' → count >= threshold AND no open Disturbance for this device today:
//             log the alarm (the 4th).
//   'event' → an open Disturbance already exists for this device today: don't log a
//             new alarm (the 5th and beyond, or a simulator re-run the same day) —
//             the telemetry row itself is the event record.
// A NEW EAT day starts a fresh count and its own open-alarm check, so a genuinely
// new disturbance raises its own alarm even if yesterday's is still open (human
// error left it un-closed) — the alarms just pile up, one per device per day. The
// count is bounded by the reset cutoff so each simulator run restarts at 1 and
// raises on the 4th (never on the 1st just because the day already had reports).
const EAT_TZ = "Africa/Nairobi";
export async function disturbanceDecision(deviceIdText, alarmType, atIso, threshold = 4, sinceIso = null) {
  const dev = String(deviceIdText || "");
  const thr = Math.max(1, Number(threshold) || 4);
  let count = 0, existing = false;
  try {
    // Count the disturbance reports of the CURRENT run only — from `sinceIso` (the
    // report's EAT-midnight, or later: a simulator-restart cutoff). We bound by
    // `received_at` (the SERVER ingest time), NOT the packet's device_time: the
    // simulator reset cutoff is wall-clock, and a step-through frame is time-stamped
    // when it is drawn (before you click Send), so a device_time bound dropped the
    // first frame and the count ran one behind (0,1,2,3 instead of 1,2,3,4).
    // received_at is monotonic and always lands after the reset, so the current
    // packet (already inserted before this runs) is counted and the 4th raises.
    // Disturbance bit = 3rd digit of the 8-hex status word = '1' (see decodeStatus),
    // read from `motion_byte` (a CORE column) so it works with or without the
    // telemetry_extras migration and on any Postgres (18 local / 16 VPS).
    const { rows } = await query(
      `SELECT count(*)::int AS n
         FROM device_telemetry dt
         JOIN devices d ON d.id = dt.device_id
        WHERE (d.device_id = $1 OR d.imei = $1)
          AND substr(upper(dt.motion_byte), 3, 1) = '1'
          AND dt.received_at > COALESCE($2::timestamptz,
                date_trunc('day', now() AT TIME ZONE $4) AT TIME ZONE $4)`,
      [dev, sinceIso || null, atIso || null, EAT_TZ]);
    count = rows[0]?.n || 0;
  } catch (e) { console.error("[disturbanceDecision count]", e?.message || e); }
  try {
    const { rows } = await query(
      `SELECT 1 FROM alarms
        WHERE device_id = $1 AND alarm_type = $2 AND status <> 'Closed'
          AND (created_at AT TIME ZONE $4)::date
            = (COALESCE($3::timestamptz, now()) AT TIME ZONE $4)::date
        LIMIT 1`,
      [dev, alarmType, atIso || null, EAT_TZ]);
    existing = !!rows[0];
  } catch (e) { console.error("[disturbanceDecision existing]", e?.message || e); }
  let action = "skip";
  if (existing) action = "event";
  else if (count >= thr) action = "raise";
  return { action, count, existing, threshold: thr };
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

// Alarms that belong to the SAME incident (episode) as this one — its disturbance,
// geofence and critical. STRICTLY by incident_id (no time-window fallback, which
// over-tied unrelated alarms). A fresh alarm has its own incident_id, so it is never
// tied to a prior event.
//
// Tying applies only while the anchor is NON-closed (Open or Acknowledged), and only
// its still-open members are listed:
//   • Viewing an OPEN/ACKNOWLEDGED Disturbance → logs its Geofence Violation and
//     Critical Motion escalations under its lifecycle (the sequence).
//   • Viewing a CLOSED alarm (disturbance included) → no links at all.
//   • A CLOSED escalation is not listed under an open disturbance.
export async function getLinkedAlarms(alarm) {
  if (!alarm || !alarm.incident_id) return [];
  if (alarm.status === "Closed") return [];
  try {
    const { rows } = await query(
      `SELECT id, name, priority, alarm_type, status, created_at, incident_id
         FROM alarms
        WHERE incident_id = $1 AND id <> $2 AND status <> 'Closed'
        ORDER BY created_at ASC`,
      [alarm.incident_id, alarm.id]
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
  // The incident's originating Disturbance — geofence & critical-motion in the SAME
  // incident are escalations of it, so we tie them back to that disturbance and its
  // timestamp. Look across the anchor + linked (all share one incident_id).
  const fmtEAT = (v) => {
    if (!v) return "";
    try {
      return new Date(v).toLocaleString("en-GB", {
        timeZone: "Africa/Nairobi", day: "2-digit", month: "short",
        hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
      }) + " EAT";
    } catch { return ""; }
  };
  const isDisturb = (ty) => ty === "DISTURBANCE" || ty === "DISTURBANCE_TECH";
  const isEscalation = (ty) => ty === "GEOFENCE_EXIT" || ty === "CRITICAL_MOTION";
  const anchorIsDisturbance = isDisturb(alarm.alarm_type);
  const disturbance = [alarm, ...linked]
    .filter((a) => isDisturb(a.alarm_type))
    .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))[0] || null;
  const closedTag = (a) => (a.status === "Closed" ? " · closed" : "");
  // Detail line for an alarm event:
  //   • Viewing the DISTURBANCE → its geofence/critical read as "Escalation of this
  //     disturbance" (this is the disturbance's own case-file sequence).
  //   • Viewing an escalation → it ties back to its disturbance + timestamp.
  const alarmDetail = (a, base, { anchor = false } = {}) => {
    if (isEscalation(a.alarm_type)) {
      if (anchorIsDisturbance && !anchor) return `Escalation of this disturbance${closedTag(a)}`;
      return disturbance
        ? `Tied to Disturbance · ${fmtEAT(disturbance.created_at)}${closedTag(a)}`
        : `${base}${closedTag(a)}`;
    }
    return base;
  };
  // The anchor alarm + every linked alarm on the same device appear as alarm
  // events, titled by name; the anchor is tagged "(this alarm)".
  ev.push({ at: alarm.created_at, kind: "alarm", alarmType: alarm.alarm_type, thisAlarm: true,
    title: alarm.name, detail: alarmDetail(alarm, `This alarm · ${alarm.device_id || ""}`.trim(), { anchor: true }),
    incident_id: alarm.incident_id || null });
  for (const l of linked) {
    ev.push({ at: l.created_at, kind: "alarm", alarmType: l.alarm_type,
      title: l.name, detail: alarmDetail(l, `Linked ${l.priority} alarm · same device`),
      incident_id: l.incident_id || null });
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
