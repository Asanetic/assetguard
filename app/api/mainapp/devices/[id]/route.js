// app/api/mainapp/devices/[id]/route.js
// Single device — powers the View Device page.
//   GET    -> device (joined to its site) + its activity log (from audit)
//   PATCH  -> edit details / change status / update firmware  (admin)
//   DELETE -> decommission the device                         (admin)
// Uses direct SQL so it works regardless of the data-access module version.
import { NextResponse } from "next/server";
import { query } from "../../../apiUtils/s_env/db.js";
import { getAuth, requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

const LATEST_FIRMWARE = "v2.4.1";

async function findDevice(idParam) {
  const id = String(idParam || "");
  const { rows } = await query(
    `SELECT d.*, s.name AS site, s.code AS site_code, s.lat AS site_lat, s.lng AS site_lng
       FROM devices d LEFT JOIN sites s ON s.id = d.site_id
      WHERE d.device_id = $1 OR d.id::text = $1
      LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function GET(request, { params }) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const device = await findDevice(params?.id);
    if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });
    // Estimated data-bundle usage (no carrier API yet).
    try {
      const { deviceDataUsage, fmtMb } = await import("../../../apiUtils/dataControl/dataUsage.js");
      device.data_usage = await deviceDataUsage(device);
      if (device.data_usage?.remaining_mb != null) device.data_left = fmtMb(device.data_usage.remaining_mb);
    } catch (e) { console.error("[device usage]", e?.message || e); }
    let activity = [];
    try {
      const { rows } = await query(
        `SELECT to_char(ts, 'DD Mon YYYY') AS date, actor_name, action, detail
           FROM audit_logs WHERE detail ILIKE '%' || $1 || '%'
          ORDER BY ts DESC LIMIT 12`,
        [device.device_id]
      );
      activity = rows;
    } catch { /* audit optional */ }
    return NextResponse.json({ device, activity, latestFirmware: LATEST_FIRMWARE });
  } catch (err) {
    console.error("[device GET] error", err);
    return NextResponse.json({ error: "Failed to load device" }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const dev = await findDevice(params?.id);
  if (!dev) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  // IMEI edit — validated, must be unique. Handled first so a clash aborts before
  // any other change. Also re-points this device's active queued commands at the
  // new IMEI so they still reach it.
  let imeiChanged = false, newImei = null;
  if (body.imei !== undefined) {
    newImei = String(body.imei || "").trim();
    if (!/^\d{14,17}$/.test(newImei)) {
      return NextResponse.json({ error: "IMEI must be 14–17 digits" }, { status: 400 });
    }
    if (newImei !== String(dev.imei || "").trim()) {
      const { rows: clash } = await query(
        `SELECT id FROM devices WHERE btrim(imei) = btrim($1) AND id <> $2 LIMIT 1`,
        [newImei, dev.id]
      );
      if (clash.length) return NextResponse.json({ error: "That IMEI is already registered to another device" }, { status: 409 });
      try {
        await query(`UPDATE devices SET imei = $1 WHERE id = $2`, [newImei, dev.id]);
        imeiChanged = true;
        // keep any active downlink jobs pointed at the device
        try { await query(`UPDATE device_command_queue SET imei = $1 WHERE device_id = $2 AND status = ANY($3)`, [newImei, dev.id, ["pending", "sent", "acked", "paused"]]); } catch {}
      } catch (err) {
        console.error("[device PATCH] imei error", err);
        return NextResponse.json({ error: "Could not update IMEI" }, { status: 500 });
      }
    }
  }

  // Core columns (status/sim) always exist — update them together.
  const sets = [], vals = [];
  if (body.status !== undefined) { vals.push(body.status); sets.push(`status = $${vals.length}`); }
  if (body.sim !== undefined) { vals.push(body.sim || null); sets.push(`sim = $${vals.length}`); }
  try {
    if (sets.length) {
      vals.push(dev.id);
      await query(`UPDATE devices SET ${sets.join(", ")} WHERE id = $${vals.length}`, vals);
    }
  } catch (err) {
    console.error("[device PATCH] core error", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
  // firmware + config live in optional columns (added by db/device_view.sql) —
  // guard each so an un-migrated DB still allows status/SIM edits.
  if (body.firmware !== undefined) {
    try { await query(`UPDATE devices SET firmware = $1 WHERE id = $2`, [body.firmware, dev.id]); }
    catch { /* firmware column not present — run db/device_view.sql */ }
  }
  if (body.config && typeof body.config === "object") {
    try { await query(`UPDATE devices SET config = COALESCE(config, '{}'::jsonb) || $1::jsonb WHERE id = $2`, [JSON.stringify(body.config), dev.id]); }
    catch { /* config column not present — run db/device_view.sql */ }
  }

  const action = body.status !== undefined ? `Status changed to ${body.status}`
    : body.firmware !== undefined ? `Firmware updated to ${body.firmware}`
    : imeiChanged ? "IMEI updated"
    : "Device details updated";
  const detail = imeiChanged ? `IMEI ${dev.imei} → ${newImei} — ${dev.device_id}` : `${action} — ${dev.device_id}`;
  logAudit(request, { action, category: "Devices", detail });

  const device = await findDevice(params?.id);
  return NextResponse.json({ device });
}

export async function DELETE(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const dev = await findDevice(params?.id);
  if (!dev) return NextResponse.json({ error: "Device not found" }, { status: 404 });
  try {
    await query(`DELETE FROM devices WHERE id = $1`, [dev.id]);
    logAudit(request, { action: "Device decommissioned", category: "Devices", detail: `Decommissioned ${dev.device_id} (IMEI ${dev.imei})` });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[device DELETE] error", err);
    return NextResponse.json({ error: "Decommission failed" }, { status: 500 });
  }
}
