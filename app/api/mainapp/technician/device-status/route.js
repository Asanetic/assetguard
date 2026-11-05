// app/api/mainapp/technician/device-status/route.js
// GET /api/mainapp/technician/device-status?device_id=<id>[&device_id=<id>…]  (signed in)
//   -> { statuses: { "<id>": { on, streaming, has_fix, satellites, … } } }
//
// The installer's live view of a tracker during fitting: is it ON, has it got a
// GPS FIX, HOW MANY SATELLITES is it seeing, and is it STREAMING data right now.
//
// Unlike /track/live (which needs a lat/lng to plot a point), this returns the
// latest telemetry even with NO fix yet — a device that is powered and seeing
// 3 satellites but hasn't locked is exactly what the installer must be able to
// watch while they wait for the fix.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { deviceInstallStatus } from "../../../apiUtils/dataControl/installation.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  // Accept repeated ?device_id= and a comma-separated ?device_ids=
  const ids = [
    ...searchParams.getAll("device_id"),
    ...String(searchParams.get("device_ids") || "").split(","),
  ].map((s) => s.trim()).filter(Boolean);

  if (!ids.length) {
    return NextResponse.json({ error: "device_id is required" }, { status: 400 });
  }

  try {
    const statuses = await deviceInstallStatus(ids);
    return NextResponse.json({ statuses });
  } catch (err) {
    console.error("[technician/device-status] error", err);
    return NextResponse.json({ statuses: {} });
  }
}
