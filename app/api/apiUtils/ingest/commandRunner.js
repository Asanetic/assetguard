// app/api/apiUtils/ingest/commandRunner.js
// -----------------------------------------------------------------------------
// Drains the device_command_queue from inside the TCP listener. A tracker is
// usually asleep, so queued commands (firmware UPGRADE, sensitivity GS, …) are
// sent only when the device WAKES. Called by portManager.ingest for every frame.
//
// Firmware lifecycle (the careful one):
//   wake (heartbeat/data) + no open critical alarm  -> send *HQ,IMEI,UPGRADE#  (status: sent)
//   device replies *HQ,IMEI,V4,UPGRADE#             -> acked
//   device resumes sending DATA after that ack      -> confirmed  (success)
//   no reply by the next heartbeat                  -> resend (until max_attempts)
// Other commands (kind='command', e.g. GS,15) skip the critical-alarm gate and
// are CONFIRMED as soon as the device replies — they apply almost immediately.
//
// A 20 s in-memory cache of "which IMEIs have an active job" keeps the per-frame
// hot path off the DB except for devices that actually have work queued. The
// cache is refreshed from the DB so jobs enqueued by the (possibly separate) web
// process are picked up within the refresh window.
// -----------------------------------------------------------------------------
import {
  activeJobImeis, getActiveJob, markSent, markAcked, markConfirmed, markFailed,
  hasOpenCriticalAlarm, sweepStalled,
} from "../dataControl/deviceCommands.js";
import { setDeviceStatus } from "../dataControl/devices.js";
import { getFirmwareConfig } from "../dataControl/appConfig.js";
import { query } from "../s_env/db.js";

const REFRESH_MS = 20_000;          // how often to re-read the active-IMEI set
const RESEND_COOLDOWN_MS = 120_000; // don't resend on every data frame; heartbeats always may

function C() {
  if (!globalThis.__agCmdRunner) globalThis.__agCmdRunner = { imeis: new Set(), at: 0, refreshing: false };
  return globalThis.__agCmdRunner;
}

async function activeSet() {
  const c = C();
  if (Date.now() - c.at > REFRESH_MS && !c.refreshing) {
    c.refreshing = true;
    try {
      const list = await activeJobImeis();
      c.imeis = new Set(list.map(String));
      c.at = Date.now();
      sweepStalled().catch(() => {});
    } catch { /* keep the old set on error */ }
    finally { c.refreshing = false; }
  }
  return c.imeis;
}

/** Let the web/API side hint that an IMEI just got work, so the listener acts
 *  on the next frame without waiting for the refresh (same-process only). */
export function noteEnqueued(imei) { try { C().imeis.add(String(imei)); } catch {} }

function isData(cmd) { return cmd === "UD" || cmd === "UD2" || cmd === "AL"; }

/**
 * Handle a parsed heartbeat/data frame from a device (called AFTER the platform
 * ACK). `send(frame)` writes bytes to the device's socket and returns bool.
 */
export async function onWake({ imei, cmd, send }) {
  if (!imei) return;
  const set = await activeSet();
  if (!set.has(String(imei))) return;
  let job;
  try { job = await getActiveJob(imei); } catch { return; }
  if (!job) { set.delete(String(imei)); return; }

  // Firmware confirmation: the device came back with DATA after acking → success.
  // On confirm, LABEL the device to the latest firmware version (firmware lives on the
  // OEM servers today, so we record the version once the device is reporting again).
  if (job.status === "acked") {
    if (job.kind === "firmware" && isData(cmd)) {
      try { await markConfirmed(job.id); } catch {}
      try {
        const fw = await getFirmwareConfig();
        if (fw?.latest && job.device_id) {
          await query(`UPDATE devices SET firmware = $2 WHERE id = $1`, [job.device_id, fw.latest]);
          console.log(`[firmware] ${imei} confirmed → labelled ${fw.latest}`);
        }
      } catch (e) { console.error("[firmware] label error:", e?.message || e); }
    }
    return; // acked jobs are otherwise just waiting for data
  }

  // (Re)send while pending or sent-without-reply.
  if (job.status === "pending" || job.status === "sent") {
    // Firmware only fires when the device has NO open critical alarm.
    if (job.kind === "firmware") {
      try { if (await hasOpenCriticalAlarm(job.device_id_text, imei)) return; } catch { /* if the check fails, don't push firmware */ return; }
    }
    // No reply → retry on each wake up to max_attempts (default 3: initial send + 2
    // retries). Once all attempts are spent with no reply, mark the command failed.
    if ((job.attempts || 0) >= (job.max_attempts || 3)) {
      try { await markFailed(job.id, "no reply after max attempts"); } catch {}
      // A failed UPT never took effect on the device — drop the pending target so the
      // ACTIVE wake interval (the last one the device accepted) stands.
      if (/^UPT,/i.test(String(job.command || "")) && job.device_id) {
        try { await query(`UPDATE devices SET config = config - 'pending_wake_interval_sec' WHERE id = $1`, [job.device_id]); } catch {}
      }
      return;
    }
    // Throttle resends: a heartbeat (LK) always may fire; data frames respect a cooldown.
    if (job.status === "sent" && cmd !== "LK") {
      const last = job.last_attempt_at ? Date.parse(job.last_attempt_at) : 0;
      if (Date.now() - last < RESEND_COOLDOWN_MS) return;
    }
    const frame = `*HQ,${imei},${job.command}#`;
    let ok = false;
    try { ok = !!send(frame); } catch { ok = false; }
    if (ok) { try { await markSent(job.id); } catch {} }
  }
}

/**
 * Handle a device reply frame (raw HQ text, e.g. "*HQ,IMEI,V4,UPGRADE#").
 * Matches it to the device's active 'sent' job by the command word.
 */
export async function onReply({ imei, replyText }) {
  if (!imei) return;
  const set = await activeSet();
  if (!set.has(String(imei))) return;
  let job;
  try { job = await getActiveJob(imei); } catch { return; }
  if (!job || job.status !== "sent") return;
  const word = String(job.command || "").split(",")[0].trim().toUpperCase(); // UPGRADE, GS, RESET…
  const reply = String(replyText || "").toUpperCase();
  if (word && reply && !reply.includes(word)) return; // a reply for some other command
  try {
    if (job.kind === "firmware") await markAcked(job.id); // firmware still waits for data to confirm
    else await markConfirmed(job.id);                     // other commands are done on ack
    // A confirmed UPT means the device accepted the new wake interval — NOW promote
    // the pending value to the ACTIVE config.wake_interval_sec and clear pending.
    // Heartbeat prediction / offline detection start using the new interval only here.
    if (job.kind !== "firmware" && /^UPT,/i.test(String(job.command || "")) && job.device_id) {
      const m = String(job.command).match(/^UPT,\s*(\d+)/i);
      const mins = m ? Number(m[1]) : null;
      if (Number.isFinite(mins)) {
        try {
          await query(
            `UPDATE devices
                SET config = (COALESCE(config,'{}'::jsonb) || jsonb_build_object('wake_interval_sec', $2::int))
                             - 'pending_wake_interval_sec'
              WHERE id = $1`,
            [job.device_id, mins * 60]
          );
          console.log(`[command] ${imei} confirmed UPT,${mins} → active wake interval = ${mins} min`);
        } catch (e) { console.error("[command] UPT promote error:", e?.message || e); }
      }
    }
    // A power-off (deactivate) command: once the device acks pwroff, it has been put
    // off — mark it INACTIVE (sticky, manual-exit).
    if (job.kind === "poweroff" && job.device_id) {
      try { await setDeviceStatus(job.device_id, "Inactive"); } catch {}
      console.log(`[command] ${imei} acked pwroff → device set INACTIVE`);
    }
  } catch {}
}
