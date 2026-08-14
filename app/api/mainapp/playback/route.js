// app/api/mainapp/playback/route.js
// GET /api/mainapp/playback?device_id=&date=YYYY-MM-DD  (signed in)
//   -> { route: { points, waypoints, summary, start_sec } | null }
import { NextResponse } from "next/server";
import { getRoute, getIncidents, routeDatesForDevice, routeFromTelemetryRange, getIncidentsRange } from "../../apiUtils/dataControl/playback.js";
import { getAuth } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("device_id");
  const date = searchParams.get("date");
  const from = searchParams.get("from"), to = searchParams.get("to");
  // ?dates=1 — just the dates that HAVE recorded data for this device (for the picker).
  if (searchParams.get("dates")) {
    if (!deviceId) return NextResponse.json({ error: "device_id is required" }, { status: 400 });
    try { return NextResponse.json({ dates: await routeDatesForDevice(deviceId) }); }
    catch (e) { console.error("[playback dates] error", e?.message || e); return NextResponse.json({ dates: [] }); }
  }
  // datetime RANGE mode: ?from=&to= (ISO with offset) — replay exactly that window.
  if (deviceId && from && to) {
    try {
      const route = await routeFromTelemetryRange(deviceId, from, to);
      let incidents = [];
      try { incidents = await getIncidentsRange(deviceId, from, to, route?.t0Ms ?? Date.parse(from)); }
      catch (e) { console.error("[playback range] incidents:", e?.message || e); }
      return NextResponse.json({ route, incidents });
    } catch (err) {
      console.error("[playback range] error", err);
      return NextResponse.json({ error: "Failed to load route" }, { status: 500 });
    }
  }
  if (!deviceId || !date) return NextResponse.json({ error: "device_id, and either date or from+to, are required" }, { status: 400 });
  try {
    const route = await getRoute(deviceId, date);
    let incidents = [];
    try { incidents = await getIncidents(deviceId, date, route?.start_sec || 0); }
    catch (e) { console.error("[playback GET] incidents:", e?.message || e); }
    return NextResponse.json({ route, incidents });
  } catch (err) {
    console.error("[playback GET] error", err);
    return NextResponse.json({ error: "Failed to load route" }, { status: 500 });
  }
}
