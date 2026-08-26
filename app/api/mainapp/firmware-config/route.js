// app/api/mainapp/firmware-config/route.js
// GET  /api/mainapp/firmware-config  (any signed-in user) -> { latest, notes, updated_at }
// PUT  /api/mainapp/firmware-config  (admin) -> set the latest available firmware version
//
// Firmware currently lives on the OEM servers; an admin records the current
// version here. A device is labelled to this version once it CONFIRMS an OTA
// update (see ingest/commandRunner.js). Later, firmware will be hosted by us.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getFirmwareConfig, saveFirmwareConfig } from "../../apiUtils/dataControl/appConfig.js";
import { getAuth, requireAdmin } from "../../apiUtils/authUtils/session.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json({ firmware: await getFirmwareConfig() });
  } catch (err) {
    console.error("[firmware-config GET] error", err);
    return NextResponse.json({ error: "Failed to load firmware config" }, { status: 500 });
  }
}

export async function PUT(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const latest = String(body?.latest || "").trim();
  if (!latest) return NextResponse.json({ error: "Enter the firmware version" }, { status: 400 });
  if (latest.length > 40) return NextResponse.json({ error: "Version string too long" }, { status: 400 });

  try {
    const who = gate.user?.name || gate.user?.email || gate.user?.sub || null;
    const saved = await saveFirmwareConfig({ latest, notes: body?.notes }, who);
    logAudit(request, { action: "Set latest firmware", category: "Devices", detail: `Latest firmware = ${saved.latest}` });
    return NextResponse.json({ firmware: saved });
  } catch (err) {
    console.error("[firmware-config PUT] error", err);
    return NextResponse.json({ error: "Could not save" }, { status: 500 });
  }
}
