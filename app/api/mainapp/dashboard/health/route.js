// app/api/mainapp/dashboard/health/route.js
// GET /api/mainapp/dashboard/health?range=daily|weekly|monthly|yearly  (signed in)
// Two SLA time-series: platform uptime (server online) and device availability
// (share of installed devices online), for the System Health area charts.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { healthSeries } from "../../../apiUtils/dataControl/healthSeries.js";
import { ensureAppHeartbeat } from "../../../apiUtils/monitor/appHeartbeat.js";

ensureAppHeartbeat(); // keep proof-of-life pings running

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "monthly";
  try {
    const data = await healthSeries(range);
    return NextResponse.json(data);
  } catch (err) {
    console.error("[dashboard health] error", err);
    return NextResponse.json({ error: "Failed to load health series" }, { status: 500 });
  }
}
