// app/api/apiUtils/dataControl/missions.js
// Response missions — a field responder's record of what they did about an
// alarm: when they started, the evidence they gathered, their account of it,
// and when they finished.
//
// A NEW module. Nothing in dataControl/alarms.js or dataControl/response.js is
// touched. Missions reach the alarm page through `missionLifecycleEvents`,
// which the alarm detail ROUTE merges into the lifecycle it already builds —
// so the alarm data manager stays exactly as it is.
import { query } from "../s_env/db.js";

/* ------------------------------------------------------------------ */
/* Table bootstrap                                                     */
/* ------------------------------------------------------------------ */

let ensuring = null;

/**
 * Creates response_missions if db/response_missions.sql has not been run.
 *
 * Memoised PROMISE, not a boolean, and it PROBES FIRST — both lessons taken
 * from dataControl/media.js rather than rediscovered:
 *
 *  - two concurrent first-requests would both see a boolean `false` and both
 *    run the DDL, and CREATE TABLE IF NOT EXISTS is documented as not being
 *    race-free;
 *  - that statement also resolves the schema and checks CREATE permission
 *    BEFORE taking its "already exists" shortcut, so on Postgres 15+ it raises
 *    42501 for an ordinary app role even when the table is sitting right there.
 *    `to_regclass` asks a question the role is always allowed to ask.
 */
export async function ensureMissionsTable() {
  if (ensuring) return ensuring;
  ensuring = (async () => {
    const probe = await query(`SELECT to_regclass('public.response_missions') AS t`);
    if (probe.rows[0]?.t) return;

    await query(`
      CREATE TABLE IF NOT EXISTS response_missions (
        id                BIGSERIAL PRIMARY KEY,
        alarm_id          TEXT,
        device_id         TEXT NOT NULL,
        site_id           BIGINT,
        site_name         TEXT,
        responder_by      TEXT,
        responder_user_id BIGINT,
        team_code         TEXT,
        team_name         TEXT,
        status            TEXT NOT NULL DEFAULT 'active',
        started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
        ended_at          TIMESTAMPTZ,
        remarks           TEXT,
        outcome           TEXT,
        photos            JSONB NOT NULL DEFAULT '[]'::jsonb,
        lat               DOUBLE PRECISION,
        lng               DOUBLE PRECISION,
        accuracy_m        DOUBLE PRECISION,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
      )`);
    await query(`CREATE INDEX IF NOT EXISTS idx_response_missions_alarm  ON response_missions (alarm_id, started_at)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_response_missions_device ON response_missions (device_id, started_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_response_missions_user   ON response_missions (responder_user_id, started_at DESC)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_response_missions_status ON response_missions (status, started_at DESC)`);
    await query(`
      CREATE UNIQUE INDEX IF NOT EXISTS uniq_active_mission_per_user_device
        ON response_missions (responder_user_id, device_id)
        WHERE ended_at IS NULL AND responder_user_id IS NOT NULL`);
  })().catch((e) => { ensuring = null; throw e; });
  return ensuring;
}

/** Every column except nothing — the rows are small and the page wants it all. */
const COLS = `
  id, alarm_id, device_id, site_id, site_name,
  responder_by, responder_user_id, team_code, team_name,
  status, started_at, ended_at, remarks, outcome, photos,
  lat, lng, accuracy_m, created_at`;

const numericOrNull = (v) => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

/** Media ids arrive from a JSON client as strings as often as numbers. */
function photoIds(list) {
  if (!Array.isArray(list)) return [];
  const out = [];
  for (const v of list) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0 && !out.includes(n)) out.push(n);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Write                                                               */
/* ------------------------------------------------------------------ */

/**
 * Opens a mission, or returns the one already running for this responder on
 * this device.
 *
 * IDEMPOTENT on purpose — see the unique index in db/response_missions.sql.
 * The app calls this every time Track and respond is pressed, and a second
 * alarm on a device already being chased must attach to the running mission
 * rather than open a parallel one.
 */
export async function startMission({
  alarmId, deviceId, siteId, siteName,
  responderBy, responderUserId, teamCode, teamName,
} = {}) {
  await ensureMissionsTable();
  if (!deviceId) return null;

  const existing = await activeMissionFor({ responderUserId, deviceId });
  if (existing) {
    // Late-binding the alarm: a mission opened from the device list has no
    // alarm on it until the responder takes one. Only ever fills a blank —
    // it must not repoint a mission at a different alarm mid-chase.
    if (alarmId && !existing.alarm_id) {
      const { rows } = await query(
        `UPDATE response_missions SET alarm_id = $2 WHERE id = $1 RETURNING ${COLS}`,
        [existing.id, alarmId]
      );
      return rows[0] || existing;
    }
    return existing;
  }

  const { rows } = await query(
    `INSERT INTO response_missions
       (alarm_id, device_id, site_id, site_name,
        responder_by, responder_user_id, team_code, team_name)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     RETURNING ${COLS}`,
    [
      alarmId || null, deviceId, numericOrNull(siteId), siteName || null,
      responderBy || null, numericOrNull(responderUserId),
      teamCode || null, teamName || null,
    ]
  );
  return rows[0] || null;
}

/**
 * Mid-mission saves: the draft remark, and photo ids as they upload.
 *
 * Photos are UNIONED, never replaced. The phone uploads them one at a time from
 * a queue that drains whenever signal returns, so a PATCH carrying two ids must
 * not delete the three that landed while it was in flight.
 */
export async function updateMission(id, { responderUserId, isAdmin = false, remarks, photos } = {}) {
  await ensureMissionsTable();
  const mine = await getMission(id);
  if (!mine) return null;
  if (!isAdmin && String(mine.responder_user_id ?? "") !== String(responderUserId ?? "")) return null;

  const merged = photos === undefined
    ? null
    : Array.from(new Set([...photoIds(mine.photos), ...photoIds(photos)]));

  const { rows } = await query(
    `UPDATE response_missions
        SET remarks = COALESCE($2, remarks),
            photos  = COALESCE($3::jsonb, photos)
      WHERE id = $1
      RETURNING ${COLS}`,
    [id, remarks === undefined ? null : String(remarks), merged ? JSON.stringify(merged) : null]
  );
  return rows[0] || null;
}

/**
 * Files the mission.
 *
 * Returns `{ error }` rather than throwing for the two refusals the route needs
 * to turn into a 4xx: somebody else's mission, and no evidence.
 */
export async function endMission(id, {
  responderUserId, isAdmin = false,
  remarks, outcome, photos, lat, lng, accuracyM,
} = {}) {
  await ensureMissionsTable();
  const mine = await getMission(id);
  if (!mine) return { error: "not_found" };
  if (!isAdmin && String(mine.responder_user_id ?? "") !== String(responderUserId ?? "")) {
    return { error: "not_found" };
  }
  if (mine.ended_at) return { error: "already_ended", mission: mine };

  const finalPhotos = Array.from(new Set([...photoIds(mine.photos), ...photoIds(photos)]));

  // The evidence rule, enforced HERE and not only on the phone. The app's check
  // is a courtesy to the responder; this one is what makes the record worth
  // reading. A client is never a validator.
  if (finalPhotos.length === 0) return { error: "no_photos" };

  const { rows } = await query(
    `UPDATE response_missions
        SET ended_at   = now(),
            status     = 'filed',
            remarks    = COALESCE($2, remarks),
            outcome    = COALESCE($3, outcome),
            photos     = $4::jsonb,
            lat        = COALESCE($5, lat),
            lng        = COALESCE($6, lng),
            accuracy_m = COALESCE($7, accuracy_m)
      WHERE id = $1
      RETURNING ${COLS}`,
    [
      id,
      remarks === undefined || remarks === null ? null : String(remarks),
      outcome || null,
      JSON.stringify(finalPhotos),
      numericOrNull(lat), numericOrNull(lng), numericOrNull(accuracyM),
    ]
  );
  return { mission: rows[0] || null };
}

/**
 * Auto-end missions whose alarm has been CLOSED but the responder never pressed
 * "End mission". Runs from the 15-min background sweep (offlineSweep.js), so it
 * needs no change to the responder app — which is already deployed and must not
 * be touched.
 *
 * Rule: a mission is auto-ended only once BOTH are true —
 *   1. its alarm is Closed, and
 *   2. the alarm was closed more than `hoursAfterClose` hours ago (default 3),
 * and the mission is still open (ended_at IS NULL). The grace window gives a
 * responder who is still finishing up time to file their own report first.
 *
 * An alarm can be closed two ways: by a supervisor (closeAlarmFull, which stamps
 * closed_at) or automatically by the system when the device settles down
 * (clearOpenAlarm). The latter historically left closed_at NULL, so we fall back
 * to the alarm's created_at for the age test — otherwise a mission on a
 * system-cleared alarm would stay "in progress" forever.
 *
 * Unlike endMission(), this does NOT require a photo — an administrative
 * auto-close is not the responder filing evidence. The row is marked
 * status = 'auto_closed' and a remark is appended so the record is honest about
 * how it ended; the responder's own `outcome` field is left untouched. Because
 * ended_at is now set, the alarm view/report shows this mission's end time
 * instead of "in progress". Missions the responder filed themselves already
 * have ended_at set and are never touched.
 *
 * @returns {Promise<number>} how many missions were auto-ended.
 */
export async function autoEndStaleMissions(hoursAfterClose = 3) {
  await ensureMissionsTable();
  const hrs = Number(hoursAfterClose);
  const h = Number.isFinite(hrs) && hrs >= 0 ? hrs : 3;
  try {
    const { rowCount } = await query(
      `UPDATE response_missions m
          SET ended_at = now(),
              status   = 'auto_closed',
              remarks  = CASE
                           WHEN COALESCE(m.remarks, '') = '' THEN $2
                           ELSE m.remarks || E'\n' || $2
                         END
         FROM alarms a
        WHERE m.alarm_id = a.id
          AND m.ended_at IS NULL
          AND a.status = 'Closed'
          AND COALESCE(a.closed_at, a.created_at) < now() - ($1 || ' hours')::interval`,
      [String(h), `Auto-ended: the alarm was closed and the mission was not ended within ${h} hours.`]
    );
    return rowCount || 0;
  } catch (e) {
    console.error("[autoEndStaleMissions]", e?.message || e);
    return 0;
  }
}

/**
 * Fire-and-forget, throttled auto-end for the WEB process.
 *
 * The 15-min background sweep (offlineSweep.js) runs only on the ingest process
 * and only once a packet has arrived — so if that process is down, unbuilt, or
 * idle, stale missions never close. This runs the same auto-end from any
 * ordinary web request instead, at most once per `throttleMs`, so as long as the
 * app is being used at all a mission closes within minutes of crossing 3 h.
 * Never awaited by its caller and never throws.
 */
let _lastAutoEndAt = 0;
export function maybeAutoEndStaleMissions(hoursAfterClose = 3, throttleMs = 5 * 60 * 1000) {
  const now = Date.now();
  if (now - _lastAutoEndAt < throttleMs) return;
  _lastAutoEndAt = now;
  autoEndStaleMissions(hoursAfterClose)
    .then((n) => { if (n) console.log(`[maybeAutoEndStaleMissions] auto-ended ${n} mission(s)`); })
    .catch((e) => console.error("[maybeAutoEndStaleMissions]", e?.message || e));
}

/* ------------------------------------------------------------------ */
/* Read                                                                */
/* ------------------------------------------------------------------ */

export async function getMission(id) {
  await ensureMissionsTable();
  const n = numericOrNull(id);
  if (n === null) return null;
  const { rows } = await query(`SELECT ${COLS} FROM response_missions WHERE id = $1`, [n]);
  return rows[0] || null;
}

export async function activeMissionFor({ responderUserId, deviceId } = {}) {
  await ensureMissionsTable();
  const uid = numericOrNull(responderUserId);
  if (uid === null || !deviceId) return null;
  const { rows } = await query(
    `SELECT ${COLS} FROM response_missions
      WHERE responder_user_id = $1 AND device_id = $2 AND ended_at IS NULL
      ORDER BY started_at DESC LIMIT 1`,
    [uid, deviceId]
  );
  return rows[0] || null;
}

/**
 * The listing behind the app's dashboard and the admin's missions page.
 *
 * `ownerId` is the visibility rule, applied by the ROUTE, not chosen here — see
 * the note there. This function just filters on what it is handed.
 */
export async function listMissions({
  ownerId, alarmId, deviceId, siteId, status, from, to, limit = 100,
} = {}) {
  await ensureMissionsTable();
  const where = [];
  const params = [];
  const add = (sql, value) => { params.push(value); where.push(sql.replace("$?", `$${params.length}`)); };

  if (ownerId !== undefined && ownerId !== null) add("responder_user_id = $?", numericOrNull(ownerId));
  if (alarmId) add("alarm_id = $?", String(alarmId));
  if (deviceId) add("device_id = $?", String(deviceId));
  if (siteId) add("site_id = $?", numericOrNull(siteId));
  if (status) add("status = $?", String(status));
  if (from) add("started_at >= $?", from);
  if (to) add("started_at <= $?", to);

  const n = Math.min(Math.max(Number(limit) || 100, 1), 500);
  params.push(n);

  const { rows } = await query(
    `SELECT ${COLS} FROM response_missions
      ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
      ORDER BY started_at DESC
      LIMIT $${params.length}`,
    params
  );
  return rows;
}

/* ------------------------------------------------------------------ */
/* The alarm activity log                                              */
/* ------------------------------------------------------------------ */

/** "1h 12m" / "8m" — the same shape the web's SummaryModal already prints. */
function durationLabel(fromIso, toIso) {
  const a = new Date(fromIso), b = toIso ? new Date(toIso) : new Date();
  if (isNaN(a) || isNaN(b)) return null;
  const m = Math.max(0, Math.round((b - a) / 60000));
  return m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
}

/**
 * ONE event per completed mission: **Response ended**.
 *
 * The pair the alarm log shows is
 *
 *   Response started   already emitted by buildLifecycle from `alarm_responses`,
 *                      written when Track and respond is pressed
 *   Response ended     this — written when the responder ends the mission
 *
 * So this module deliberately emits NOTHING for the start. `POST
 * response/missions` writes the `alarm_responses` row through response.js, and
 * that row is what the timeline already draws; a "Mission started" event beside
 * it would be the same fact twice, one millisecond apart.
 *
 * A mission still RUNNING contributes nothing either. The log is a record of
 * what happened, not a status board — "started" with no "ended" already says
 * a response is out.
 *
 * NO PHOTOS ON THE EVENT. Mission evidence belongs in the alarm's REPORT, next
 * to the photos of completed work, not scattered through the timeline. The
 * alarm detail route returns the mission rows separately for exactly that.
 *
 * `kind: "response"` matches the started event, so the pair share the orange
 * `ti-run` icon the web already maps for that kind — no new icon, no new CSS.
 */
export async function missionLifecycleEvents(alarmId) {
  if (!alarmId) return [];
  try {
    const rows = await listMissions({ alarmId, limit: 50 });
    return rows
      .filter((m) => m.ended_at)
      .map((m) => {
        const who = m.responder_by || "responder";
        const team = m.team_name || m.team_code;
        const count = Array.isArray(m.photos) ? m.photos.length : 0;
        const bits = [`by ${who}${team ? ` \u00b7 ${team}` : ""}`];
        const took = durationLabel(m.started_at, m.ended_at);
        if (took) bits.push(`took ${took}`);
        if (count) bits.push(`${count} photo${count === 1 ? "" : "s"}`);
        if (m.outcome) bits.push(m.outcome);
        if (m.remarks) bits.push(`\u201c${String(m.remarks).trim()}\u201d`);
        return {
          at: m.ended_at,
          kind: "response",
          by: m.responder_by,
          title: "Response ended",
          detail: bits.join(" \u00b7 "),
          missionId: m.id,
        };
      });
  } catch (e) {
    // Best effort, like every other piece the alarm detail route assembles: a
    // missing table must omit this section, never blank the page.
    console.error("[missions lifecycle]", e?.message);
    return [];
  }
}

/**
 * The mission rows behind an alarm, for the alarm REPORT.
 *
 * Separate from the lifecycle events on purpose: the timeline wants one line
 * per event, the report wants the evidence.
 */
export async function missionsForAlarm(alarmId) {
  if (!alarmId) return [];
  try {
    return await listMissions({ alarmId, limit: 50 });
  } catch (e) {
    console.error("[missions for alarm]", e?.message);
    return [];
  }
}
