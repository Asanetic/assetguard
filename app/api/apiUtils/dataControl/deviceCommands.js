// app/api/apiUtils/dataControl/deviceCommands.js
// -----------------------------------------------------------------------------
// Downlink command / firmware-update QUEUE access (table: device_command_queue).
// The web API enqueues jobs; the TCP listener (ingest/commandRunner.js) drains
// them as devices wake. See db/device_commands.sql for the lifecycle.
// -----------------------------------------------------------------------------
import { query } from "../s_env/db.js";

const ACTIVE = ["pending", "sent", "acked"];

// ---------------------------------------------------------------------------
// SYNCED CONFIG PARAMETERS — the single source of truth for the three settings
// that live BOTH in a device's stored config AND on the device itself, and so
// must be pushed by a downlink whenever they change.
//
// Every surface that changes one of these (the device detail edit, a batch op)
// goes through queueParamChange below, so all three behave identically:
//   1. the downlink is QUEUED (sent on the device's next wake, with retries),
//   2. the desired value is recorded as a PENDING key — the LIVE key is NOT
//      touched yet, because the device has not accepted it,
//   3. commandRunner promotes pending -> live only when the device CONFIRMS,
//      and DROPS the pending key if the command ultimately FAILS.
// So the device details never show a value the device has not actually taken,
// and a failed command cleanly leaves the last confirmed value standing.
//
// `word` is the downlink verb (matched against a device reply / a queued row);
// `toStored` converts the command's numeric argument to the value we store
// (UPT is sent in MINUTES but stored in SECONDS).
// ---------------------------------------------------------------------------
export const PARAM_OPS = {
  sensitivity: { word: "GS",     min: 1, max: 50,   toCmd: (n) => `GS,${n}`,     live: "motion_sensitivity", pending: "pending_motion_sensitivity", toStored: (n) => n },
  interval:    { word: "update", min: 3, max: 60,   toCmd: (n) => `update,${n}`, live: "upload_interval_s",  pending: "pending_upload_interval_s",  toStored: (n) => n },
  upt:         { word: "UPT",    min: 6, max: 1440, toCmd: (n) => `UPT,${n}`,    live: "wake_interval_sec",  pending: "pending_wake_interval_sec",  toStored: (n) => n * 60 },
};

/** The synced-param spec for a UI op ("sensitivity"|"interval"|"upt"), or null. */
export function paramOpSpec(op) {
  return PARAM_OPS[String(op || "").trim().toLowerCase()] || null;
}

/** The synced-param spec for a queued command string ("GS,20", "update,10", "UPT,60"), or null. */
export function paramSyncForCommand(command) {
  const w = String(command || "").split(",")[0].trim().toLowerCase();
  return Object.values(PARAM_OPS).find((s) => s.word.toLowerCase() === w) || null;
}

/** The numeric argument in a "WORD,<n>" command, or null. */
export function commandArg(command) {
  const m = String(command || "").match(/,\s*(\d+)/);
  return m ? Number(m[1]) : null;
}

/**
 * Change a synced config parameter on one or many devices: queue the downlink
 * AND apply the new value immediately (optimistic).
 *
 * The LIVE value is written now so the device details reflect the requested
 * setting straight away (and after a reload), rather than sitting on the old
 * value until the tracker happens to ACK — which never lands for a device that
 * isn't completing the confirm loop. The command is still queued and sent on the
 * device's next wake; the `pending_*` key is kept purely as a "syncing to
 * device…" marker and is cleared by commandRunner when the device confirms (or
 * the command finally fails). Out-of-range values are rejected here so an
 * accepted value always maps to a real command.
 *
 * @returns {Promise<{queued:number, command:string, pending:string, value:number} | {invalid:true, reason:string}>}
 */
export async function queueParamChange({ ids = [], op, value, batchId = null, createdBy = null }) {
  const spec = paramOpSpec(op);
  if (!spec) return { invalid: true, reason: "unknown parameter" };
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < spec.min || n > spec.max) {
    return { invalid: true, reason: `out of range (${spec.min}–${spec.max})` };
  }
  const command = spec.toCmd(n);
  const { queued } = await enqueueJobs({ ids, kind: "command", command, batchId, createdBy });
  const devIds = ids.map(Number).filter(Number.isFinite);
  if (devIds.length) {
    try {
      // Record only the PENDING target. The LIVE value flips when the device
      // confirms (commandRunner promotes pending -> live and clears pending).
      await query(
        `UPDATE devices
            SET config = COALESCE(config, '{}'::jsonb) || jsonb_build_object($2::text, $3::int)
          WHERE id = ANY($1::bigint[])`,
        [devIds, spec.pending, spec.toStored(n)]
      );
    } catch (e) { console.error("[queueParamChange] pending set:", e?.message || e); }
  }
  return { queued, command, pending: spec.pending, value: spec.toStored(n) };
}

/**
 * Bring a device's LIVE param values in line with what the command queue has
 * CONFIRMED, so the device details reflect a setting the moment its command shows
 * confirmed — independently of the pending_* marker or whether commandRunner's
 * live-promotion fired. Called when serving a device (idempotent, cheap).
 *
 * For each synced param (motion / interval / wake):
 *   - a command for it is still active (pending/sent/acked) -> leave everything
 *     (the change is in flight; the "-> pending" marker stays).
 *   - the newest command for it is CONFIRMED -> set the live value to that
 *     command's number and clear the pending marker.
 *   - no active and no confirmed command, but a pending marker lingers -> the
 *     command didn't succeed; drop the marker so it doesn't show "pending" forever.
 */
export async function reconcileDevicePending(deviceId) {
  const id = Number(deviceId);
  if (!Number.isFinite(id)) return;
  let cfg;
  try {
    const { rows } = await query(`SELECT config FROM devices WHERE id = $1`, [id]);
    cfg = rows[0]?.config || {};
  } catch { return; }

  for (const spec of Object.values(PARAM_OPS)) {
    const hasPending = cfg[spec.pending] != null;

    // Still-in-flight command for this param? If so, leave it alone.
    let active = 0;
    try {
      const { rows } = await query(
        `SELECT count(*)::int AS n FROM device_command_queue
          WHERE device_id = $1 AND lower(split_part(command, ',', 1)) = lower($2)
            AND status IN ('pending','sent','acked')`,
        [id, spec.word]
      );
      active = rows[0]?.n || 0;
    } catch { continue; }
    if (active > 0) continue;

    // The newest CONFIRMED command for this param (the value the device took).
    let confirmedCmd = null;
    try {
      const { rows } = await query(
        `SELECT command FROM device_command_queue
          WHERE device_id = $1 AND lower(split_part(command, ',', 1)) = lower($2)
            AND status = 'confirmed'
          ORDER BY COALESCE(confirmed_at, created_at) DESC LIMIT 1`,
        [id, spec.word]
      );
      confirmedCmd = rows[0]?.command || null;
    } catch { continue; }

    if (!confirmedCmd) {
      // Nothing confirmed and nothing active — a lingering marker means the
      // command didn't land; drop it so it isn't stuck showing "pending".
      if (hasPending) {
        try { await query(`UPDATE devices SET config = config - $2::text WHERE id = $1`, [id, spec.pending]); } catch { /* ignore */ }
      }
      continue;
    }

    const m = String(confirmedCmd).match(/,\s*(\d+)/);
    const arg = m ? Number(m[1]) : null;
    if (arg == null || !Number.isFinite(arg)) continue;
    const want = spec.toStored(arg);
    if (Number(cfg[spec.live]) === want && !hasPending) continue; // already correct

    try {
      await query(
        `UPDATE devices
            SET config = (COALESCE(config, '{}'::jsonb) || jsonb_build_object($2::text, ($3)::int)) - $4::text
          WHERE id = $1`,
        [id, spec.live, want, spec.pending]
      );
    } catch { /* best-effort */ }
  }
}

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
  // Supersede only an active job of the SAME COMMAND on these devices — matched
  // by the command VERB (GS / update / UPT / UPGRADE …), not just the kind.
  //
  // This is what lets several DIFFERENT config commands coexist in one device's
  // queue: change motion + interval + wake in the device detail page and all
  // three (GS, update, UPT) stay queued and each is applied. Matching on kind
  // alone (the old behaviour) cancelled the earlier ones because they all share
  // kind='command', so only the last survived. Re-queuing the SAME command (a
  // second GS) still supersedes its own pending copy, and two firmware UPGRADE
  // jobs still can't stack.
  const verb = String(command).split(",")[0].trim();
  await query(
    `UPDATE device_command_queue
        SET status = 'canceled', note = COALESCE(note,'') || ' superseded by re-queue', last_attempt_at = now()
      WHERE device_id = ANY($1::bigint[]) AND kind = $2 AND status = ANY($3)
        AND split_part(command, ',', 1) = $4`,
    [devIds, kind, ACTIVE, verb]
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
        AND kind <> 'poweroff'
        AND attempts >= max_attempts
        AND sent_at < now() - ($1 * interval '1 minute')`,
    [sentDeadlineMin]
  );
  return (a || 0) + (b || 0);
}

/**
 * Reconcile power-off (deactivate) commands that were SENT but never acked. A
 * device that received pwroff usually powers straight down, so it CAN'T reply —
 * the real proof it powered off is that it goes SILENT. So, for each 'sent'
 * poweroff older than a short grace:
 *   - device has gone silent (no report since we sent it) -> it powered off:
 *     confirm the job, set the device Inactive, and stamp the powered_off flag.
 *   - device is STILL reporting after the grace -> it ignored/refused the command:
 *     mark the job failed so it's visible (the device is left as-is).
 * Devices that DO ack are handled immediately in onReply; this only catches the
 * no-ack case. Runs on the 15-min offline sweep.
 */
export async function reconcilePowerOffs({ graceMin = 15 } = {}) {
  let poweredOff = 0, notTaken = 0;
  // Silent → powered off. One statement: confirm the queue row, then flip the
  // device to Inactive + powered_off (data-modifying CTE).
  try {
    const { rowCount } = await query(
      `WITH po AS (
         SELECT q.id, q.device_id
           FROM device_command_queue q
           JOIN devices d ON d.id = q.device_id
          WHERE q.kind = 'poweroff' AND q.status = 'sent'
            AND q.sent_at IS NOT NULL
            AND q.sent_at < now() - ($1 * interval '1 minute')
            AND (d.last_seen IS NULL OR d.last_seen <= q.sent_at + interval '2 minutes')
       ),
       done AS (
         UPDATE device_command_queue q
            SET status = 'confirmed', confirmed_at = now()
           FROM po WHERE q.id = po.id
         RETURNING q.device_id
       )
       UPDATE devices d
          SET status = 'Inactive',
              config = COALESCE(config,'{}'::jsonb)
                       || jsonb_build_object('powered_off', true, 'powered_off_at', now()::text)
         FROM done WHERE d.id = done.device_id`,
      [graceMin]
    );
    poweredOff = rowCount || 0;
  } catch (e) { console.error("[reconcilePowerOffs] silent→off:", e?.message || e); }
  // Still reporting after the grace → the command didn't take.
  try {
    const { rowCount } = await query(
      `UPDATE device_command_queue q
          SET status = 'failed', error = 'power-off not confirmed (device still reporting)', last_attempt_at = now()
         FROM devices d
        WHERE q.device_id = d.id AND q.kind = 'poweroff' AND q.status = 'sent'
          AND q.sent_at IS NOT NULL
          AND q.sent_at < now() - ($1 * interval '1 minute')
          AND d.last_seen > q.sent_at + interval '2 minutes'`,
      [graceMin]
    );
    notTaken = rowCount || 0;
  } catch (e) { console.error("[reconcilePowerOffs] still-on→failed:", e?.message || e); }
  if (poweredOff || notTaken) console.log(`[reconcilePowerOffs] ${poweredOff} powered off (silent), ${notTaken} not taken (still reporting)`);
  return { poweredOff, notTaken };
}
