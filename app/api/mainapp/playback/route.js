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
  // ?sources=gps,wifi,lbs — restrict playback to those fix sources (omit / all three = no filter)
  const sources = (searchParams.get("sources") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  // ?dates=1 — just the dates that HAVE recorded data for this device (for the picker).
  if (searchParams.get("dates")) {
    if (!deviceId) return NextResponse.json({ error: "device_id is required" }, { status: 400 });
    try { return NextResponse.json({ dates: await routeDatesForDevice(deviceId) }); }
    catch (e) { console.error("[playback dates] error", e?.message || e); return NextResponse.json({ dates: [] }); }
  }
  // datetime RANGE mode: ?from=&to= — replay exactly that window.
  //
  // The web UI sends a NAIVE local datetime ("2026-09-25T00:00", no offset). A
  // bare timestamp is read by Postgres in the SERVER's timezone (UTC on the VPS),
  // which shifts the window three hours off what the user picked in EAT and drops
  // the early-morning rows. Stamp EAT (+03:00) onto any value that has no offset
  // so the window means exactly the local clock the user chose.
  const eatIso = (s) => {
    if (!s) return s;
    if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) return s;          // already has a timezone
    const withSecs = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;  // ensure seconds
    return `${withSecs}+03:00`;
  };
  if (deviceId && from && to) {
    const fromE = eatIso(from), toE = eatIso(to);
    try {
      const route = await routeFromTelemetryRange(deviceId, fromE, toE, sources);
      let incidents = [];
      try { incidents = await getIncidentsRange(deviceId, fromE, toE, route?.t0Ms ?? Date.parse(fromE)); }
      catch (e) { console.error("[playback range] incidents:", e?.message || e); }
      return NextResponse.json({ route, incidents });
    } catch (err) {
      console.error("[playback range] error", err);
      return NextResponse.json({ error: "Failed to load route" }, { status: 500 });
    }
  }
  if (!deviceId || !date) return NextResponse.json({ error: "device_id, and either date or from+to, are required" }, { status: 400 });
  try {
    const route = await getRoute(deviceId, date, sources);
    let incidents = [];
    try { incidents = await getIncidents(deviceId, date, route?.start_sec || 0); }
    catch (e) { console.error("[playback GET] incidents:", e?.message || e); }
    return NextResponse.json({ route, incidents });
  } catch (err) {
    console.error("[playback GET] error", err);
    return NextResponse.json({ error: "Failed to load route" }, { status: 500 });
  }
}
