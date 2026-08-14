// app/api/mainapp/logs/route.js
// GET /api/mainapp/logs  (signed in) — Device logs = a device's heartbeats
// (routine reporting) from device_telemetry.
//   ?device=<device_id|imei>&from=<YYYY-MM-DD>&to=<YYYY-MM-DD>
//       -> { device, days:[ per-EAT-day rollups ] }   (state of the device per day)
//   ?device=<device_id|imei>&date=<YYYY-MM-DD>
//       -> { device, beats:[ every heartbeat that day ] }   (one day in detail)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import { heartbeatDevice, dailyHeartbeats, dayHeartbeats } from "../../apiUtils/dataControl/deviceHeartbeats.js";

// EAT day boundaries: a YYYY-MM-DD in EAT starts at 00:00 +03:00.
const eatStart = (d) => `${d}T00:00:00+03:00`;
const eatEndExclusive = (d) => `${d}T23:59:59.999+03:00`;

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const device = searchParams.get("device");
  const date = searchParams.get("date");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (!device) return NextResponse.json({ error: "device is required" }, { status: 400 });

  try {
    const dev = await heartbeatDevice(device);

    // Single-day detail.
    if (date) {
      const beats = await dayHeartbeats(device, date).catch((e) => {
        console.error("[logs day]", e?.message || e); return [];
      });
      return NextResponse.json({ device: dev, date, beats });
    }

    // Daily rollups over a range (default: last 14 EAT days).
    let f = from, t = to;
    if (!f || !t) {
      const now = new Date();
      const eatNow = new Date(now.getTime() + 3 * 3600 * 1000); // shift to EAT wall clock
      const iso = (d) => d.toISOString().slice(0, 10);
      t = t || iso(eatNow);
      const past = new Date(eatNow.getTime() - 13 * 86400 * 1000);
      f = f || iso(past);
    }
    const days = await dailyHeartbeats(device, eatStart(f), eatEndExclusive(t)).catch((e) => {
      console.error("[logs range]", e?.message || e); return [];
    });
    return NextResponse.json({ device: dev, from: f, to: t, days });
  } catch (err) {
    console.error("[logs GET] error", err);
    return NextResponse.json({ error: "Failed to load device logs" }, { status: 500 });
  }
}
