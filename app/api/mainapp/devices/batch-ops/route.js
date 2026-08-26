// app/api/mainapp/devices/batch-ops/route.js
// POST /api/mainapp/devices/batch-ops   { ids, op, value } -> apply one operation
//                                                             to many devices
//
// A SIBLING of `devices/batch`, not a replacement. That route owns the four
// operations that change a device's own columns — status, firmware, site,
// delete. This one owns the operations that live in `config`, and the two that
// have to reach the hardware over TCP.
//
// Each op below says plainly what it does, because three of them do LESS than
// their name suggests and the response says so rather than reporting a flat
// "12 devices updated":
//
//   mute         real. Suppresses alert notifications until a timestamp.
//   motion       config + `GS,<v>` downlink. Only reaches connected devices.
//   interval     config + `update,<s>` / `UPT,<m>` downlink, where the value maps.
//   plan         a RECORD of the data bundle. Provisions nothing with the carrier.
//   sim_provider a RECORD of the provider. Same.
//   ping         reads only — which of these devices has an open socket.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "../../../apiUtils/s_env/db.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";
import { sendToDevice, listConnectedDevices } from "../../../apiUtils/ingest/portManager.js";

const MAX_MUTE_HOURS = 24;

/**
 * The GL-28 protocol has two interval commands and they do not meet:
 * `update,<sec>` covers 3–60 SECONDS, `UPT,<min>` covers 6–1440 MINUTES.
 * Everything between 60s and 6min — which includes the UI's "5 minutes" — maps
 * to neither. Returning null there is deliberate: the config is still recorded,
 * and the response says the device could not be told, rather than sending a
 * command that means something else.
 */
function intervalCommand(label) {
  const text = String(label || "").toLowerCase().trim();
  const seconds =
    /^(\d+)\s*second/.test(text) ? Number(RegExp.$1)
      : /^(\d+)\s*minute/.test(text) ? Number(RegExp.$1) * 60
        : /^(\d+)\s*hour/.test(text) ? Number(RegExp.$1) * 3600
          : null;
  if (seconds == null) return null;
  if (seconds >= 3 && seconds <= 60) return `update,${seconds}`;
  const minutes = Math.round(seconds / 60);
  if (minutes >= 6 && minutes <= 1440) return `UPT,${minutes}`;
  return null;
}

/** Sends one command to each IMEI, and reports who was not reachable. */
function pushDownlink(imeis, command) {
  const delivered = [];
  const offline = [];
  for (const imei of imeis) {
    if (!imei) continue;
    let result;
    try { result = sendToDevice(imei, command, { wrap: false }); }
    catch { result = { sent: 0 }; }
    if (result.sent > 0) delivered.push(imei); else offline.push(imei);
  }
  return { command, delivered: delivered.length, offline };
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  // Numeric primary keys, exactly as devices/batch expects — the two routes
  // must not disagree about what an id is.
  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
  if (!ids.length) return NextResponse.json({ error: "Select at least one device" }, { status: 400 });

  const op = String(body?.op || "").trim();
  const value = body?.value;

  const { rows: devices } = await query(
    `SELECT id, device_id, imei FROM devices WHERE id = ANY($1::bigint[])`,
    [ids]
  );
  if (!devices.length) return NextResponse.json({ error: "No matching devices" }, { status: 404 });
  const imeis = devices.map((d) => d.imei).filter(Boolean);

  /** Merges a patch into every selected device's config, in one statement. */
  async function mergeConfig(patch) {
    try {
      const { rowCount } = await query(
        `UPDATE devices
            SET config = COALESCE(config, '{}'::jsonb) || $1::jsonb
          WHERE id = ANY($2::bigint[])`,
        [JSON.stringify(patch), ids]
      );
      return rowCount;
    } catch (err) {
      console.error("[batch-ops] config write failed", err);
      throw Object.assign(new Error("CONFIG_COLUMN_MISSING"), { code: "CONFIG_COLUMN_MISSING" });
    }
  }

  try {
    switch (op) {
      /* ---------------- ping: reads only ---------------- */
      case "ping": {
        const connected = new Set(listConnectedDevices().map((c) => c.imei));
        const online = devices.filter((d) => connected.has(d.imei));
        return NextResponse.json({
          affected: 0,
          checked: devices.length,
          online: online.length,
          offline: devices.length - online.length,
          note: `${online.length} of ${devices.length} have an open connection.`,
        });
      }

      /* ---------------- mute: real ---------------- */
      case "mute": {
        const hours = Number(value);
        if (!Number.isFinite(hours) || hours < 0 || hours > MAX_MUTE_HOURS) {
          return NextResponse.json(
            { error: `hours must be between 0 and ${MAX_MUTE_HOURS}` }, { status: 422 }
          );
        }
        const mutedUntil = hours > 0 ? new Date(Date.now() + hours * 3600_000).toISOString() : null;
        const affected = await mergeConfig({ muted_until: mutedUntil });
        logAudit(request, {
          action: hours > 0 ? `Alerts muted for ${hours}h` : "Alerts unmuted",
          category: "Devices",
          detail: `${affected} device(s)`,
        });
        return NextResponse.json({
          affected,
          note: hours > 0
            ? "Alarms are still raised and logged — only email and SMS are held back."
            : "Alert notifications resumed.",
        });
      }

      /* ---------------- motion: config + downlink ---------------- */
      case "motion": {
        const level = Number(value);
        if (!Number.isFinite(level) || level < 1 || level > 100) {
          return NextResponse.json({ error: "motion must be 1–100" }, { status: 422 });
        }
        const affected = await mergeConfig({ motion_sensitivity: level });
        const push = pushDownlink(imeis, `GS,${level}`);
        logAudit(request, {
          action: "Motion sensitivity set",
          category: "Devices",
          detail: `${level}/100 on ${affected} device(s); ${push.delivered} reached over TCP`,
        });
        return NextResponse.json({
          affected,
          downlink: push,
          // Said out loud: the stored value is a record the alarm engine does
          // NOT read (it uses motion_mems_mg); the command is what changes the
          // hardware, and it only reaches devices that are connected.
          note: `Recorded on ${affected}; sent to ${push.delivered} connected device(s)` +
            (push.offline.length ? `, ${push.offline.length} offline.` : "."),
        });
      }

      /* ---------------- interval: config + downlink ---------------- */
      case "interval": {
        const label = String(value || "").trim();
        if (!label) return NextResponse.json({ error: "interval is required" }, { status: 422 });
        const affected = await mergeConfig({ upload_interval: label });
        const command = intervalCommand(label);
        if (!command) {
          return NextResponse.json({
            affected,
            downlink: null,
            note: `Recorded on ${affected}. The devices were NOT told: the protocol ` +
              `has no "${label}" interval (update is 3–60s, UPT is 6–1440min).`,
          });
        }
        const push = pushDownlink(imeis, command);
        logAudit(request, {
          action: "Upload interval set",
          category: "Devices",
          detail: `${label} on ${affected} device(s); ${push.delivered} reached over TCP`,
        });
        return NextResponse.json({
          affected,
          downlink: push,
          note: `Recorded on ${affected}; sent to ${push.delivered} connected device(s)` +
            (push.offline.length ? `, ${push.offline.length} offline.` : "."),
        });
      }

      /* ---------------- record-only ---------------- */
      case "plan":
      case "sim_provider": {
        const text = String(value || "").trim();
        if (!text) return NextResponse.json({ error: "value is required" }, { status: 422 });
        const key = op === "plan" ? "data_plan" : "sim_provider";
        const affected = await mergeConfig({ [key]: text });
        logAudit(request, {
          action: op === "plan" ? "Data bundle plan recorded" : "SIM provider recorded",
          category: "Devices",
          detail: `${text} on ${affected} device(s)`,
        });
        return NextResponse.json({
          affected,
          // The honest limit of this operation. It writes down which plan a
          // device is on; it does not talk to the carrier.
          note: `Recorded on ${affected} device(s). This is a record — nothing is provisioned with the carrier.`,
        });
      }

      default:
        return NextResponse.json({ error: `Unknown operation: ${op}` }, { status: 400 });
    }
  } catch (err) {
    if (err?.code === "CONFIG_COLUMN_MISSING") {
      return NextResponse.json(
        { error: "This needs the config column — run db/device_view.sql.", code: "CONFIG_COLUMN_MISSING" },
        { status: 503 }
      );
    }
    console.error("[batch-ops] error", err);
    return NextResponse.json({ error: err?.message || "Operation failed" }, { status: 400 });
  }
}
