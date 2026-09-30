// app/api/mainapp/response-playback/route.js
// GET /api/mainapp/response-playback?device_id=&from=&to=&sources=  (signed in)
//   -> { target, responders, incidents, duration, start_sec } | route:null
// ?dates=1&device_id=  -> { dates } for the picker (same as Route Playback).
//
// Combines the TARGET device route with every RESPONDER route over the window, on
// one shared timeline, so both replay together on the Response Playback page.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { responsePlayback } from "../../apiUtils/dataControl/responsePlayback.js";
import { routeDatesForDevice, getIncidentsRange } from "../../apiUtils/dataControl/playback.js";
import { getAuth } from "../../apiUtils/authUtils/session.js";

// Naive local datetimes ("2026-09-26T00:00") are read by Postgres in the server tz;
// stamp EAT so the window means the clock the user picked (see playback/route.js).
const eatIso = (s) => {
  if (!s) return s;
  if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) return s;
  const withSecs = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s;
  return `${withSecs}+03:00`;
};

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("device_id");
  const from = searchParams.get("from"), to = searchParams.get("to");
  const sources = (searchParams.get("sources") || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);

  if (searchParams.get("dates")) {
    if (!deviceId) return NextResponse.json({ error: "device_id is required" }, { status: 400 });
    try { return NextResponse.json({ dates: await routeDatesForDevice(deviceId) }); }
    catch (e) { console.error("[response-playback dates]", e?.message || e); return NextResponse.json({ dates: [] }); }
  }

  if (!deviceId || !from || !to)
    return NextResponse.json({ error: "device_id, from and to are required" }, { status: 400 });

  const fromE = eatIso(from), toE = eatIso(to);
  try {
    const data = await responsePlayback(deviceId, fromE, toE, sources);
    let incidents = [];
    try { incidents = await getIncidentsRange(deviceId, fromE, toE, data?.t0Ms ?? Date.parse(fromE)); }
    catch (e) { console.error("[response-playback] incidents:", e?.message || e); }
    return NextResponse.json({ ...(data || { target: null, responders: [] }), incidents });
  } catch (err) {
    console.error("[response-playback] error", err);
    return NextResponse.json({ error: "Failed to load response playback" }, { status: 500 });
  }
}
