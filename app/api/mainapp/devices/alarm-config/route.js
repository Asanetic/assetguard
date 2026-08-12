// app/api/mainapp/devices/alarm-config/route.js
// GET   -> { fields, devices } : every device with its resolved alarm thresholds
// PATCH -> { ids:[...], thresholds:{...} } : apply a threshold set to one (per-device
//          edit) or many (batch) devices. Admin only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth, requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { listDeviceAlarmConfigs, batchSetAlarmConfig } from "../../../apiUtils/dataControl/devices.js";
import { THRESHOLD_FIELDS } from "../../../apiUtils/ingest/alarmEngine.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const devices = await listDeviceAlarmConfigs();
    return NextResponse.json({ fields: THRESHOLD_FIELDS, devices });
  } catch (err) {
    console.error("[alarm-config GET] error", err);
    return NextResponse.json({ error: "Failed to load alarm config" }, { status: 500 });
  }
}

export async function PATCH(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const ids = Array.isArray(body.ids) ? body.ids : [];
  const thresholds = body.thresholds || {};
  if (!ids.length) return NextResponse.json({ error: "Select at least one device" }, { status: 400 });
  try {
    const updated = await batchSetAlarmConfig(ids, thresholds);
    logAudit(request, { action: "Alarm thresholds updated", category: "Devices",
      detail: `${updated} device(s): ${Object.entries(thresholds).map(([k, v]) => `${k}=${v}`).join(", ")}` });
    return NextResponse.json({ updated });
  } catch (err) {
    console.error("[alarm-config PATCH] error", err);
    return NextResponse.json({ error: "Failed to update thresholds" }, { status: 500 });
  }
}
