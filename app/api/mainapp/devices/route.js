// app/api/mainapp/devices/route.js
// GET  /api/mainapp/devices?q=&site_id=&status=&orientation=  (signed in) -> devices (+ site & coords)
// POST /api/mainapp/devices  (admin)  Body: { site_code, imei, orientation, sim?, status? } -> register one device
import { NextResponse } from "next/server";
import { listDevices, createDevice } from "../../apiUtils/dataControl/devices.js";
import { getAuth, requireAdmin } from "../../apiUtils/authUtils/session.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  try {
    const devices = await listDevices({
      q: searchParams.get("q") || undefined,
      site_id: searchParams.get("site_id") || undefined,
      status: searchParams.get("status") || undefined,
      orientation: searchParams.get("orientation") || undefined,
    });
    return NextResponse.json({ devices });
  } catch (err) {
    console.error("[devices GET] error", err);
    return NextResponse.json({ error: "Failed to load devices" }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (!String(body?.site_code || "").trim())
    return NextResponse.json({ error: "Site is required" }, { status: 422 });
  if (!String(body?.imei || "").trim())
    return NextResponse.json({ error: "IMEI is required" }, { status: 422 });

  try {
    const device = await createDevice({
      site_code: body.site_code, imei: body.imei,
      orientation: body.orientation, sim: body.sim, status: body.status,
      config: body.config || null,
    });
    logAudit(request, {
      action: "Device added", category: "Devices",
      detail: `Registered device ${device.device_id} (IMEI ${device.imei}) at ${device.site_code}`,
    });
    return NextResponse.json({ device }, { status: 201 });
  } catch (err) {
    console.error("[devices POST] error", err);
    return NextResponse.json({ error: err.message || "Could not add device" }, { status: 400 });
  }
}
