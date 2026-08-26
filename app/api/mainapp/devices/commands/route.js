// app/api/mainapp/devices/commands/route.js
// Downlink command / firmware-update QUEUE for devices (Group devices → batch).
//   POST { ids:[], op, value? }
//     op = "firmware"   -> queue an OTA UPGRADE (kind firmware; waits for wake + no critical alarm)
//     op = "sensitivity"-> queue GS,<value>   (kind command; applies on next wake)
//     op = "command"    -> queue a raw HQ body (kind command), value = e.g. "UPT,60"
//     op = "cancel"     -> cancel active jobs on the given devices
//   GET ?ids=1,2,3  or  ?site_id=NN  -> latest job per device (for live status polling)
// Jobs are drained by the TCP listener as devices wake (ingest/commandRunner.js).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { enqueueJobs, listJobs, listQueue, listBatches, cancelJobs, cancelJobIds, pauseBatch, resumeBatch, nextRolloutCode } from "../../../apiUtils/dataControl/deviceCommands.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";
import { query } from "../../../apiUtils/s_env/db.js";

function newBatchId() {
  return `bt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

// Turn a UI op into a { kind, command, label } for the queue. Returns null if invalid.
function resolveOp(op, value) {
  if (op === "firmware") return { kind: "firmware", command: "UPGRADE", label: "Firmware update (OTA)" };
  if (op === "poweroff") return { kind: "poweroff", command: "pwroff", label: "Power off (deactivate)" };
  if (op === "reset")    return { kind: "command", command: "RESET", label: "Restart device" };
  if (op === "rfs")      return { kind: "command", command: "RFS", label: "Restore factory settings" };
  if (op === "upt") {
    // Sleep-mode reporting cadence (the WAKE INTERVAL) — UPT,<minutes>, 6..1440 (24 h).
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 6 || n > 1440) return null;
    return { kind: "command", command: `UPT,${n}`, label: `Set wake interval ${n} min` };
  }
  if (op === "ip") {
    // value = "ip,port" (or "ip port"). We send IP,<ip>,<port>.
    const m = String(value || "").trim().replace(/\s+/g, ",").match(/^(\d{1,3}(?:\.\d{1,3}){3}),(\d{1,5})$/);
    if (!m) return null;
    return { kind: "command", command: `IP,${m[1]},${m[2]}`, label: `Set server ${m[1]}:${m[2]}` };
  }
  if (op === "apn") {
    // value = "apn" or "apn,user,pass".
    let body = String(value || "").trim().replace(/\s+/g, "");
    if (!/^[A-Za-z0-9._-]+(,[^,]*,[^,]*)?$/.test(body)) return null;
    return { kind: "command", command: `APN,${body}`, label: `Set APN ${body.split(",")[0]}` };
  }
  if (op === "sensitivity") {
    // GS,<n> — valid 1..50 on this device. Lower = MORE sensitive.
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 1 || n > 50) return null;
    return { kind: "command", command: `GS,${n}`, label: `Set motion sensitivity ${n}` };
  }
  if (op === "interval") {
    // GL-28 reporting cadence: update,<seconds> — valid 3..60 s (3s to 1 min).
    const n = Math.round(Number(value));
    if (!Number.isFinite(n) || n < 3 || n > 60) return null;
    return { kind: "command", command: `update,${n}`, label: `Set upload interval ${n}s` };
  }
  if (op === "command") {
    // Free-form HQ body (admin). Strip any wrapper the user pasted: brackets, a
    // leading *HQ,IMEI, prefix, and a trailing #. We send *HQ,IMEI,<body># ourselves.
    let body = String(value || "").trim().replace(/^\[|\]$/g, "").replace(/#$/, "").trim();
    const hq = body.match(/^\*HQ,\d{6,},(.+)$/i);
    if (hq) body = hq[1].trim();
    if (!body) return null;
    return { kind: "command", command: body, label: `Command ${body}` };
  }
  return null;
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const op = String(body?.op || "");
  const who = gate.user?.name || gate.user?.email || gate.user?.sub || null;

  // Rollout-scoped controls act on a whole batch, not a device selection.
  if (op === "pause" || op === "resume") {
    const bid = String(body?.batch_id || "");
    if (!bid) return NextResponse.json({ error: "batch_id required" }, { status: 400 });
    try {
      const n = op === "pause" ? await pauseBatch(bid) : await resumeBatch(bid);
      logAudit(request, { action: op === "pause" ? "Paused firmware rollout" : "Resumed firmware rollout", category: "Devices", detail: `${bid}: ${n} device(s)` });
      return NextResponse.json({ [op === "pause" ? "paused" : "resumed"]: n, batchId: bid });
    } catch (err) {
      console.error("[devices commands pause/resume] error", err);
      return NextResponse.json({ error: err.message || "Operation failed" }, { status: 400 });
    }
  }

  // Cancel can target specific queue jobs (job_ids) or whole devices (ids).
  if (op === "cancel") {
    const jobIds = Array.isArray(body?.job_ids) ? body.job_ids : [];
    const devIds = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
    if (!jobIds.length && !devIds.length) return NextResponse.json({ error: "Nothing to cancel" }, { status: 400 });
    try {
      const canceled = jobIds.length ? await cancelJobIds(jobIds) : await cancelJobs({ ids: devIds });
      logAudit(request, { action: "Canceled device commands", category: "Devices", detail: `Canceled ${canceled} queued command(s)` });
      return NextResponse.json({ canceled });
    } catch (err) {
      console.error("[devices commands cancel] error", err);
      return NextResponse.json({ error: err.message || "Cancel failed" }, { status: 400 });
    }
  }

  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ error: "No devices selected" }, { status: 400 });

  // Connectivity ping ("Send test ping"): queue a HARMLESS command that the device
  // must apply + ACK — we re-assert each device's CURRENT wake interval (no change),
  // so the ACK / next report confirms the live link without altering config.
  if (op === "ping") {
    try {
      const { rows } = await query(`SELECT id, config FROM devices WHERE id = ANY($1)`, [ids]);
      const batchId = newBatchId();
      let queued = 0;
      for (const d of rows) {
        const wakeSec = Number(d.config?.wake_interval_sec);
        const mins = Number.isFinite(wakeSec) && wakeSec > 0
          ? Math.min(1440, Math.max(6, Math.round(wakeSec / 60))) : 1440;
        await enqueueJobs({ ids: [d.id], kind: "command", command: `UPT,${mins}`, batchId, createdBy: who });
        queued++;
      }
      logAudit(request, { action: "Send test ping", category: "Devices", detail: `Connectivity ping to ${queued} device(s) — confirms on next report` });
      return NextResponse.json({ queued, batchId, ping: true });
    } catch (err) {
      console.error("[devices commands ping] error", err);
      return NextResponse.json({ error: err.message || "Ping failed" }, { status: 400 });
    }
  }

  // Sync device configuration: push EACH device's stored config to it as real HQ
  // commands (motion sensitivity, moving interval, wake interval). Everything except
  // the IMEI — IMEI is never pushed by command.
  if (op === "sync") {
    try {
      const { rows } = await query(`SELECT id, config FROM devices WHERE id = ANY($1)`, [ids]);
      const batchId = newBatchId();
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
        for (const c of cmds) { await enqueueJobs({ ids: [d.id], kind: "command", command: c, batchId, createdBy: who }); queued++; }
      }
      logAudit(request, { action: "Sync device configuration", category: "Devices", detail: `Queued ${queued} config command(s) to ${rows.length} device(s) — IMEI excluded` });
      return NextResponse.json({ queued, batchId, synced: rows.length });
    } catch (err) {
      console.error("[devices commands sync] error", err);
      return NextResponse.json({ error: err.message || "Sync failed" }, { status: 400 });
    }
  }

  try {

    const spec = resolveOp(op, body?.value);
    if (!spec) return NextResponse.json({ error: `Invalid operation or value: ${op}` }, { status: 400 });

    // Firmware gets a human rollout code (FWC-001); other commands a plain batch id.
    const batchId = spec.kind === "firmware" ? await nextRolloutCode() : newBatchId();
    const { queued } = await enqueueJobs({ ids, kind: spec.kind, command: spec.command, batchId, createdBy: who });

    // UPT sets the device's SLEEP reporting cadence = the platform's wake interval.
    // We do NOT flip the ACTIVE interval now — the device may be asleep and hasn't
    // accepted it yet. Store it as PENDING; commandRunner promotes it to
    // config.wake_interval_sec only when the device confirms (acks) the UPT command.
    // So heartbeat / offline detection keep using the last interval the device
    // actually accepted until this one succeeds.
    if (op === "upt") {
      const mins = Math.round(Number(body?.value));
      if (Number.isFinite(mins)) {
        try {
          await query(
            `UPDATE devices SET config = COALESCE(config,'{}'::jsonb) || jsonb_build_object('pending_wake_interval_sec', $2::int)
              WHERE id = ANY($1)`,
            [ids, mins * 60]
          );
        } catch (e) { console.error("[commands upt] pending set:", e?.message || e); }
      }
    }

    logAudit(request, {
      action: spec.kind === "firmware" ? "Queued firmware update" : "Queued device command",
      category: "Devices",
      detail: `${spec.label}${spec.kind === "firmware" ? ` (${batchId})` : ""} queued on ${queued} device${queued === 1 ? "" : "s"} (sends on next wake${spec.kind === "firmware" ? ", no critical alarm" : ""})`,
    });
    return NextResponse.json({ queued, batchId, kind: spec.kind, command: spec.command });
  } catch (err) {
    console.error("[devices commands POST] error", err);
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 400 });
  }
}

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const url = new URL(request.url);
  const scope = url.searchParams.get("scope");
  // Batch history — one row per past batch/rollout with a status roll-up.
  if (scope === "batches") {
    try {
      const batches = await listBatches({});
      return NextResponse.json({ batches });
    } catch (err) {
      console.error("[devices commands batches] error", err);
      return NextResponse.json({ error: "Failed to load batch history" }, { status: 500 });
    }
  }
  // Full queue view (every job, not collapsed per device).
  if (scope === "queue") {
    const statusParam = url.searchParams.get("status") || "active";
    const statuses = statusParam === "all" ? null : ["pending", "sent", "acked", "paused"];
    try {
      const jobs = await listQueue({ statuses });
      return NextResponse.json({ jobs });
    } catch (err) {
      console.error("[devices commands queue] error", err);
      return NextResponse.json({ error: "Failed to load queue" }, { status: 500 });
    }
  }
  const idsParam = url.searchParams.get("ids");
  const siteId = url.searchParams.get("site_id");
  const batchId = url.searchParams.get("batch_id");
  const ids = idsParam ? idsParam.split(",").map(Number).filter(Boolean) : null;
  try {
    const jobs = await listJobs({ ids, siteId: siteId || null, batchId: batchId || null });
    return NextResponse.json({ jobs });
  } catch (err) {
    console.error("[devices commands GET] error", err);
    return NextResponse.json({ error: "Failed to load command status" }, { status: 500 });
  }
}
