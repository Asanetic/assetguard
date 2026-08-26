// app/api/apiUtils/dataControl/deviceCommands.js
// -----------------------------------------------------------------------------
// Downlink command / firmware-update QUEUE access (table: device_command_queue).
// The web API enqueues jobs; the TCP listener (ingest/commandRunner.js) drains
// them as devices wake. See db/device_commands.sql for the lifecycle.
// -----------------------------------------------------------------------------
import { query } from "../s_env/db.js";

const ACTIVE = ["pending", "sent", "acked"];

/**
 * Enqueue one job per device for a batch. Any existing ACTIVE job of the SAME
 * kind on a device is canceled first (a re-queue supersedes it), so a device
 * never has two competing firmware jobs. Returns { queued, batchId }.
 * @param {{ids:number[], kind:string, command:string, batchId:string, createdBy?:string, maxAttempts?:number}} p
 */
/**
 * Queue each device's stored config as downlink commands (GS motion sensitivity,
 * update upload-interval, UPT wake-interval) — everything except the IMEI, which
 * is never pushed by command. Shared by the device Group-sync and the site-level
 * "Sync device configurations" batch op. Returns { queued, synced }.
 */
export async function syncDevicesConfig(deviceIds = [], { batchId, createdBy = null } = {}) {
  const devIds = deviceIds.map(Number).filter(Number.isFinite);
  if (!devIds.length) return { queued: 0, synced: 0 };
  const { rows } = await query(`SELECT id, config FROM devices WHERE id = ANY($1::bigint[])`, [devIds]);
  let queued = 0;
  for (const d of rows) {
    const cfg = d.config || {};
    const cmds = [];
    const mot = Math.round(Number(cfg.motion_sensitivity));
    if (Number.isFinite(mot) && mot >= 1 && mot <= 50) cmds.push(`GS,${mot}`);
    const up = Math.round(Number(cfg.upload_interval_s));
    if (Number.isFinite(up) && up >= 3 && up <= 60) cmds.push(`update,${up}`);
    const wakeSec = Number(cfg.wake_interval_sec);
    if (Number.isFinite(wakeSec)) { const m = Math.round(wakeSec / 60); if (m >= 6 && m <= 1440) cmds.push(`UPT,${m}`); }
    for (const c of cmds) { await enqueueJobs({ ids: [d.id], kind: "command", command: c, batchId, createdBy }); queued++; }
  }
  return { queued, synced: rows.length };
}

export async function enqueueJobs({ ids = [], kind = "firmware", command, batchId, createdBy = null, maxAttempts = 3 }) {
  const devIds = ids.map(Number).filter(Number.isFinite);
  if (!devIds.length || !command) return { queued: 0, batchId };
  // Supersede any active same-kind jobs on these devices.
  await query(
    `UPDATE device_command_queue
        SET status = 'canceled', note = COALESCE(note,'') || ' superseded by re-queue', last_attempt_at = now()
      WHERE device_id = ANY($1::bigint[]) AND kind = $2 AND status = ANY($3)`,
    [devIds, kind, ACTIVE]
  );
  // Insert fresh jobs, pulling each device's IMEI from the registry.
  const { rows } = await query(
    `INSERT INTO device_command_queue (device_id, imei, kind, command, batch_id, created_by, max_attempts)
       SELECT d.id, d.imei, $2, $3, $4, $5, $6
         FROM devices d
        WHERE d.id = ANY($1::bigint[]) AND d.imei IS NOT NULL AND btrim(d.imei) <> ''
     RETURNING id`,
    [devIds, kind, command, batchId, createdBy, maxAttempts]
  );
  return { queued: rows.length, batchId };
}

/** Next human rollout code, FWC-001, FWC-002, … (firmware campaigns). */
export async function nextRolloutCode() {
  try {
    const { rows } = await query(
      `SELECT count(DISTINCT batch_id)::int AS n FROM device_command_queue WHERE kind = 'firmware' AND batch_id LIKE 'FWC-%'`
    );
    return `FWC-${String((rows[0]?.n || 0) + 1).padStart(3, "0")}`;
  } catch { return `FWC-${Date.now().toString(36).slice(-4).toUpperCase()}`; }
}

/** Pause a rollout: stop sending to devices not yet applying. 'acked' jobs (already
 *  applying) are left to finish. Returns rows paused. */
export async function pauseBatch(batchId) {
  if (!batchId) return 0;
  const { rowCount } = await query(
    `UPDATE device_command_queue SET status = 'paused', last_attempt_at = now()
      WHERE batch_id = $1 AND status IN ('pending','sent')`,
    [batchId]
  );
  return rowCount;
}

/** Resume a paused rollout — paused jobs go back to pending. Returns rows resumed. */
export async function resumeBatch(batchId) {
  if (!batchId) return 0;
  const { rowCount } = await query(
    `UPDATE device_command_queue SET status = 'pending', last_attempt_at = now()
      WHERE batch_id = $1 AND status = 'paused'`,
    [batchId]
  );
  return rowCount;
}

/** Distinct IMEIs that currently have an active job — the listener's hot-path cache. */
export async function activeJobImeis() {
  const { rows } = await query(
    `SELECT DISTINCT imei FROM device_command_queue WHERE status = ANY($1)`,
    [ACTIVE]
  );
  return rows.map((r) => String(r.imei));
}

/**
 * The single active job the listener should act on for an IMEI. Prefer an
 * already-acked firmware job (so a data frame can confirm it) over a pending
 * one; otherwise the oldest pending/sent. Joins the device's display id for the
 * critical-alarm gate.
 */
export async function getActiveJob(imei) {
  const { rows } = await query(
    `SELECT q.*, d.device_id AS device_id_text
       FROM device_command_queue q
       LEFT JOIN devices d ON d.id = q.device_id
      WHERE btrim(q.imei) = btrim($1) AND q.status = ANY($2)
      ORDER BY (q.status = 'acked') DESC, q.created_at ASC
      LIMIT 1`,
    [String(imei ?? ""), ACTIVE]
  );
  return rows[0] || null;
}

export async function markSent(id) {
  await query(
    `UPDATE device_command_queue
        SET status = 'sent', attempts = attempts + 1,
            sent_at = COALESCE(sent_at, now()), last_attempt_at = now()
      WHERE id = $1`,
    [id]
  );
}
export async function markAcked(id) {
  await query(`UPDATE device_command_queue SET status = 'acked', acked_at = now() WHERE id = $1`, [id]);
}
export async function markConfirmed(id) {
  await query(`UPDATE device_command_queue SET status = 'confirmed', confirmed_at = now() WHERE id = $1`, [id]);
}
export async function markFailed(id, error = null) {
  await query(`UPDATE device_command_queue SET status = 'failed', error = $2, last_attempt_at = now() WHERE id = $1`, [id, error]);
}

/** True if the device has an OPEN (not Closed) Critical alarm — firmware gate. */
export async function hasOpenCriticalAlarm(deviceIdText, imei) {
  const { rows } = await query(
    `SELECT 1 FROM alarms
      WHERE priority = 'Critical' AND status <> 'Closed'
        AND (device_id = $1 OR serial = $2)
      LIMIT 1`,
    [deviceIdText || null, String(imei ?? "")]
  );
  return rows.length > 0;
}

/**
 * Per-device latest job for the UI (one row per device, newest first), optionally
 * scoped to device ids, a site, or a batch. Includes the device display id + site.
 */
export async function listJobs({ ids = null, siteId = null, batchId = null, sinceHours = 72 } = {}) {
  const params = [];
  const where = [];
  if (Array.isArray(ids) && ids.length) { params.push(ids.map(Number).filter(Number.isFinite)); where.push(`q.device_id = ANY($${params.length}::bigint[])`); }
  if (siteId) { params.push(Number(siteId)); where.push(`d.site_id = $${params.length}`); }
  if (batchId) { params.push(batchId); where.push(`q.batch_id = $${params.length}`); }
  params.push(sinceHours); where.push(`q.created_at > now() - ($${params.length} * interval '1 hour')`);
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  // DISTINCT ON device+kind → the most recent job per device per kind.
  const { rows } = await query(
    `SELECT DISTINCT ON (q.device_id, q.kind)
            q.id, q.device_id, q.imei, q.kind, q.command, q.status, q.batch_id,
            q.attempts, q.max_attempts, q.created_at, q.sent_at, q.acked_at,
            q.confirmed_at, q.last_attempt_at, q.error,
            d.device_id AS device_id_text, s.name AS site
       FROM device_command_queue q
       LEFT JOIN devices d ON d.id = q.device_id
       LEFT JOIN sites s ON s.id = d.site_id
       ${clause}
      ORDER BY q.device_id, q.kind, q.created_at DESC`,
    params
  );
  return rows;
}

/**
 * The whole queue for the admin "Command queue" view — EVERY job (one row each,
 * not collapsed per device), newest first. Defaults to the active statuses; pass
 * statuses=null for the full recent history. Joined to device id + site.
 */
export async function listQueue({ statuses = ["pending", "sent", "acked", "paused"], sinceHours = 336, limit = 500 } = {}) {
  const params = [];
  const where = [];
  if (Array.isArray(statuses) && statuses.length) { params.push(statuses); where.push(`q.status = ANY($${params.length})`); }
  params.push(sinceHours); where.push(`q.created_at > now() - ($${params.length} * interval '1 hour')`);
  params.push(Math.min(2000, Math.max(1, limit)));
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT q.id, q.device_id, q.imei, q.kind, q.command, q.status, q.batch_id,
            q.attempts, q.max_attempts, q.created_at, q.sent_at, q.acked_at,
            q.confirmed_at, q.last_attempt_at, q.error, q.created_by,
            d.device_id AS device_id_text, s.name AS site
       FROM device_command_queue q
       LEFT JOIN devices d ON d.id = q.device_id
       LEFT JOIN sites s ON s.id = d.site_id
       ${clause}
      ORDER BY q.created_at DESC
      LIMIT $${params.length}`,
    params
  );
  return rows;
}

/**
 * Batch HISTORY for the admin view — one row per batch (firmware rollout FWC-… or a
 * command batch), newest first, with a status roll-up. Lets completed operations be
 * reviewed instead of vanishing. kind/command are uniform within a batch.
 */
export async function listBatches({ sinceHours = 720, limit = 200 } = {}) {
  try {
    const { rows } = await query(
      `SELECT q.batch_id,
              max(q.kind)                       AS kind,
              max(q.command)                    AS command,
              min(q.created_at)                 AS created_at,
              max(q.last_attempt_at)            AS last_at,
              max(q.created_by)                 AS created_by,
              count(*)::int                     AS total,
              count(*) FILTER (WHERE q.status = 'confirmed')::int AS confirmed,
              count(*) FILTER (WHERE q.status = 'failed')::int    AS failed,
              count(*) FILTER (WHERE q.status = 'canceled')::int  AS canceled,
              count(*) FILTER (WHERE q.status IN ('pending','sent','acked','paused'))::int AS active
         FROM device_command_queue q
        WHERE q.batch_id IS NOT NULL
          AND q.created_at > now() - ($1 * interval '1 hour')
        GROUP BY q.batch_id
        ORDER BY min(q.created_at) DESC
        LIMIT $2`,
      [sinceHours, Math.min(1000, Math.max(1, limit))]
    );
    return rows;
  } catch (e) {
    console.error("[listBatches] error:", e?.message || e);
    return [];
  }
}

/** Cancel specific jobs by their queue id (active or paused). Returns rows canceled. */
export async function cancelJobIds(jobIds = []) {
  const ids = jobIds.map(Number).filter(Number.isFinite);
  if (!ids.length) return 0;
  const { rowCount } = await query(
    `UPDATE device_command_queue
        SET status = 'canceled', last_attempt_at = now(), note = COALESCE(note,'') || ' canceled by admin'
      WHERE id = ANY($1::bigint[]) AND status = ANY($2)`,
    [ids, ["pending", "sent", "acked", "paused"]]
  );
  return rowCount;
}

/** Cancel active jobs on the given devices (optionally only one kind). */
export async function cancelJobs({ ids = [], kind = null } = {}) {
  const devIds = ids.map(Number).filter(Number.isFinite);
  if (!devIds.length) return 0;
  const params = [devIds, ACTIVE];
  let kindClause = "";
  if (kind) { params.push(kind); kindClause = ` AND kind = $${params.length}`; }
  const { rowCount } = await query(
    `UPDATE device_command_queue
        SET status = 'canceled', last_attempt_at = now(), note = COALESCE(note,'') || ' canceled by admin'
      WHERE device_id = ANY($1::bigint[]) AND status = ANY($2)${kindClause}`,
    params
  );
  return rowCount;
}

/**
 * Fail jobs that have stalled:
 *  - 'sent' with no reply for a long time and out of attempts, or
 *  - 'acked' (firmware) but the device never resumed data within the deadline.
 * Called opportunistically by the listener. Windows are generous; the happy path
 * confirms in well under 5 minutes.
 */
export async function sweepStalled({ ackDataDeadlineMin = 15, sentDeadlineMin = 180 } = {}) {
  const { rowCount: a } = await query(
    `UPDATE device_command_queue
        SET status = 'failed', error = 'no data resumed after update', last_attempt_at = now()
      WHERE status = 'acked' AND kind = 'firmware'
        AND acked_at < now() - ($1 * interval '1 minute')`,
    [ackDataDeadlineMin]
  );
  const { rowCount: b } = await query(
    `UPDATE device_command_queue
        SET status = 'failed', error = 'no reply from device', last_attempt_at = now()
      WHERE status = 'sent'
        AND attempts >= max_attempts
        AND sent_at < now() - ($1 * interval '1 minute')`,
    [sentDeadlineMin]
  );
  return (a || 0) + (b || 0);
}
