// app/api/mainapp/technician/position/route.js
// POST /api/mainapp/technician/position   (signed in) -> { ok: true }
//
// The technician app posts its handset GPS here on a timer while signed in, so
// the admin "Installation" map can show where each technician is. We keep only
// the latest fix per technician (upsert) — the map draws the current spot, and
// the per-job history already lives in the work log.
//
// Body: { lat, lng, accuracy, speed, heading, battery }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { upsertTechnicianPosition } from "../../../apiUtils/dataControl/technician.js";

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Expected JSON" }, { status: 400 }); }

  const lat = Number(body.lat);
  const lng = Number(body.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    await upsertTechnicianPosition({
      technicianId: me.sub,
      technicianName: me.name || me.email || null,
      lat, lng,
      accuracyM: body.accuracy,
      speed: body.speed,
      heading: body.heading,
      battery: body.battery,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[technician/position] error", err);
    return NextResponse.json({ error: "Failed to record position" }, { status: 500 });
  }
}
