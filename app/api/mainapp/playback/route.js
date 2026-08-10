// app/api/mainapp/playback/route.js
// GET /api/mainapp/playback?device_id=&date=YYYY-MM-DD  (signed in)
//   -> { route: { points, waypoints, summary, start_sec } | null }
import { NextResponse } from "next/server";
import { getRoute } from "../../apiUtils/dataControl/playback.js";
import { getAuth } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("device_id");
  const date = searchParams.get("date");
  if (!deviceId || !date) return NextResponse.json({ error: "device_id and date are required" }, { status: 400 });
  try {
    const route = await getRoute(deviceId, date);
    return NextResponse.json({ route });
  } catch (err) {
    console.error("[playback GET] error", err);
    return NextResponse.json({ error: "Failed to load route" }, { status: 500 });
  }
}
