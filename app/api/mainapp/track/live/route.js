// app/api/mainapp/track/live/route.js
// GET /api/mainapp/track/live?device=<device_id>  (signed in)
// The device's LATEST real position from device_telemetry (what the tracker — or the
// simulator over TCP — actually reported), so Track follows real data, not a demo drift.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { query } from "../../../apiUtils/s_env/db.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const device = searchParams.get("device");
  if (!device) return NextResponse.json({ error: "device is required" }, { status: 400 });
  try {
    const { rows } = await query(
      `SELECT COALESCE(t.device_time, t.received_at) AS at, t.received_at AS received,
              EXTRACT(EPOCH FROM (now() - t.received_at))::bigint AS age_sec,
              t.lat, t.lng, t.speed, t.loc_source, t.accuracy
         FROM device_telemetry t JOIN devices d ON d.id = t.device_id
        WHERE d.device_id = $1 AND t.lat IS NOT NULL AND t.lng IS NOT NULL
        ORDER BY t.received_at DESC
        LIMIT 1`,
      [String(device)]
    );
    const r = rows[0];
    const pos = r ? {
      lat: Number(r.lat), lng: Number(r.lng),
      speed: r.speed != null ? Math.round(Number(r.speed)) : null,
      source: r.loc_source || null,
      accuracy: r.accuracy != null ? Math.round(Number(r.accuracy)) : null,
      at: r.at,
      received: r.received || r.at,   // when the platform received it — for "updated N ago"
      // Age computed on the SERVER (now() - received_at), so it is correct even if the
      // VPS wall-clock is skewed. The client rebuilds the fix time on its own clock.
      age_sec: r.age_sec != null ? Number(r.age_sec) : null,
    } : null;
    return NextResponse.json({ pos });
  } catch (err) {
    console.error("[track live] error", err);
    return NextResponse.json({ pos: null });
  }
}
