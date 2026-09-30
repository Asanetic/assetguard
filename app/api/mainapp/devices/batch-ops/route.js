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
import { listConnectedDevices } from "../../../apiUtils/ingest/portManager.js";
import { queueParamChange } from "../../../apiUtils/dataControl/deviceCommands.js";
import { buildUD } from "../../../apiUtils/ingest/simPackets.js";
import { extractFrames, parseFrame } from "../../../apiUtils/ingest/parse.js";
import { resolveAndStore } from "../../../apiUtils/ingest/store.js";

const MAX_MUTE_HOURS = 24;

// Motion sensitivity and upload interval used to be sent from here by an
// IMMEDIATE TCP push and written straight to the live config. They now go
// through queueParamChange (the same path the device-detail edit uses): queued
// for the next wake, held as PENDING, and promoted to the live value only when
// the device confirms. That is what keeps the batch op and the device details
// in sync, and what makes a failed command leave the last accepted value in
// place. See dataControl/deviceCommands.js.

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
    // The site's coordinates come along for `test_alarm`, so a simulated packet
    // reports from where the device actually is rather than from nowhere. Every
    // other op ignores them.
    `SELECT d.id, d.device_id, d.imei, s.lat, s.lng
       FROM devices d
       LEFT JOIN sites s ON s.id = d.site_id
      WHERE d.id = ANY($1::bigint[])`,
    [ids]
  );
  if (!devices.length) return NextResponse.json({ error: "No matching devices" }, { status: 404 });

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

      /* ---------------- test_alarm: SIMULATED, real pipeline ---------------- */
      //
      // Raises a genuine disturbance alarm on each selected device by feeding a
      // disturbance packet through the SAME parse → resolve → store path a real
      // tracker uses. Nothing is faked at the alarm layer: the engine decides,
      // the row is ordinary, and the technician app receives it exactly as it
      // would a real shake.
      //
      // For drills and for training a technician who is not standing at a mast.
      //
      // WHY IT SENDS SEVERAL PACKETS: the disturbance rule is graduated —
      // #1 is ignored, #2 and #3 are early warnings, only #4 raises. That is
      // right for a live site, where one bump means very little. A drill wants
      // an alarm, so it sends the whole streak, which is precisely what a device
      // being genuinely interfered with would report.
      case "test_alarm": {
        const withImei = devices.filter((d) => d.imei);
        if (!withImei.length) {
          return NextResponse.json(
            { error: "None of the selected devices has an IMEI to simulate from." },
            { status: 422 }
          );
        }

        // ONE packet is now enough: the disturbance threshold defaults to 1, so
        // the first shake raises. It used to send four to cross the graduated
        // streak, which — now that the streak is gone — would write four
        // telemetry rows and four alarms per device for a single drill.
        //
        // Still overridable via `value`, and still capped, so restoring
        // DISTURB_STREAK=4 later needs no change here.
        const bursts = Math.min(Math.max(Number(value) || 1, 1), 6);

        let raised = 0;
        const failed = [];
        for (const d of withImei) {
          try {
            for (let i = 0; i < bursts; i++) {
              // motionByte "00100008" is the disturbance bit — the same packet
              // the Device Simulator's "disturbance" scenario sends.
              const raw = buildUD({
                imei: d.imei,
                lat: d.lat ?? null,
                lng: d.lng ?? null,
                motionByte: "00100008",
              });
              const { frames } = extractFrames(raw);
              for (const f of frames) {
                let rec;
                try { rec = parseFrame(f); } catch { continue; }
                await resolveAndStore(rec, "batch-test", 0, { source: "test", pushTo: gate.user?.sub });
              }
            }
            raised += 1;
          } catch (err) {
            console.error("[batch-ops test_alarm]", d.device_id, err?.message || err);
            failed.push(d.device_id);
          }
        }

        return NextResponse.json({
          affected: raised,
          skipped: devices.length - withImei.length,
          failed,
          // Said plainly: the engine still decides. A muted or inactive device
          // may swallow it, and reporting "12 alarms raised" when the engine
          // raised nine would be the kind of success message that teaches
          // people not to trust the others.
          note:
            `Fed ${bursts} disturbance packet${bursts === 1 ? "" : "s"} to ${raised} ` +
            `device(s) through the live ingest pipeline. The alarm engine decides ` +
            `the outcome, so a muted, inactive or unregistered device may not ` +
            `raise one.`,
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

      /* -------- motion: queue GS + pending, promoted on confirm -------- */
      case "motion": {
        const r = await queueParamChange({ ids, op: "sensitivity", value: Number(value) });
        if (r.invalid) return NextResponse.json({ error: `Motion sensitivity must be 1–50 (${r.reason})` }, { status: 422 });
        logAudit(request, {
          action: "Motion sensitivity set", category: "Devices",
          detail: `${r.command} queued on ${r.queued} device(s); applies on next wake, details update on confirm`,
        });
        return NextResponse.json({
          affected: r.queued, queued: r.queued, command: r.command,
          note: `Queued to ${r.queued} device(s). The device details show the new motion sensitivity once each device confirms it.`,
        });
      }

      /* -------- interval: queue update,<s> + pending, promoted on confirm -------- */
      case "interval": {
        // Accept plain seconds (3–60) or a legacy "10s"/"10 seconds" label.
        const secs = Number(String(value ?? "").replace(/[^\d.]/g, ""));
        const r = await queueParamChange({ ids, op: "interval", value: secs });
        if (r.invalid) return NextResponse.json({ error: `Upload interval must be 3–60s (${r.reason})` }, { status: 422 });
        logAudit(request, {
          action: "Upload interval set", category: "Devices",
          detail: `${r.command} queued on ${r.queued} device(s); applies on next wake, details update on confirm`,
        });
        return NextResponse.json({
          affected: r.queued, queued: r.queued, command: r.command,
          note: `Queued to ${r.queued} device(s). The device details show the new upload interval once each device confirms it.`,
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
