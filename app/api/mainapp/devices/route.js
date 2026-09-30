// app/api/mainapp/devices/route.js
// GET  /api/mainapp/devices?q=&site_id=&status=&orientation=  (signed in) -> devices (+ site & coords)
// POST /api/mainapp/devices  (admin)  Body: { site_code, imei, orientation, sim?, status? } -> register one device
import { NextResponse } from "next/server";
import { listDevices, createDevice } from "../../apiUtils/dataControl/devices.js";
import { getAuth, requireAdmin } from "../../apiUtils/authUtils/session.js";
import { scopeFilterFor } from "../../apiUtils/authUtils/regionScope.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  try {
    const { regions, siteIds } = await scopeFilterFor(me);   // region OR list scope
    const devices = await listDevices({
      q: searchParams.get("q") || undefined,
      site_id: searchParams.get("site_id") || undefined,
      status: searchParams.get("status") || undefined,
      orientation: searchParams.get("orientation") || undefined,
      regions, siteIds,
    });
    // Fleet data-bundle roll-up across the devices in this response (respects the
    // caller's scope + any q/site/status filter). Summed from each device's own
    // data_usage so the total always reconciles with the rows shown.
    const r2 = (n) => Math.round(n * 100) / 100;
    let assigned = 0, used = 0, remaining = 0, withBundle = 0, anyBundle = false;
    for (const d of devices) {
      const u = d.data_usage || {};
      used += Number(u.used_mb || 0);
      if (u.assigned_mb != null) { assigned += Number(u.assigned_mb); remaining += Number(u.remaining_mb || 0); withBundle += 1; anyBundle = true; }
    }
    const data_summary = {
      devices: devices.length,
      with_bundle: withBundle,
      assigned_mb: anyBundle ? r2(assigned) : null,
      used_mb: r2(used),
      remaining_mb: anyBundle ? r2(remaining) : null,
      pct: assigned > 0 ? Math.min(100, Math.round((used / assigned) * 1000) / 10) : null,
      estimate: true,
    };
    return NextResponse.json({ devices, data_summary });
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
