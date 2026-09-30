// app/api/mainapp/technician/test-alarm/route.js
// GET /api/mainapp/technician/test-alarm?device_id=&since=&scope=  (signed in)
//   -> { alarm }   the first alarm this device raised after `since`, or null
//
// The step the whole wizard turns on. After the settling countdown the
// technician disturbs the tracker and the app polls this every few seconds until
// the device's own uplink arrives — or the listening window runs out and the
// attempt is a fail.
//
// There was no way to ask this before: GET mainapp/alarms filters on priority,
// status and free text, never on device plus time.
//
// scope:
//   "disturbance" (default) — only the alarm kinds a shake produces
//   "any"                   — any alarm from that device, which is the honest
//                             setting for an installation where what matters is
//                             that the device reported AT ALL
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { findTestAlarm } from "../../../apiUtils/dataControl/technician.js";

/**
 * What counts as "the device answered the shake".
 *
 * Matched against both `alarm_type` and the human `name`, because the engine
 * writes DISTURBANCE / DISTURBANCE_TECH into the former and a readable string
 * into the latter, and a disturbance raised while an on-site session is open
 * arrives as the TECH variant — which is precisely the case the wizard creates
 * for itself. Missing that would make every correctly-configured test look like
 * a failure.
 */
const DISTURBANCE_TYPES = ["disturb"];

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("device_id");
  const sinceRaw = searchParams.get("since");
  const scope = (searchParams.get("scope") || "disturbance").toLowerCase();

  if (!deviceId) {
    return NextResponse.json({ error: "device_id is required" }, { status: 400 });
  }
  if (!sinceRaw) {
    return NextResponse.json({ error: "since is required" }, { status: 400 });
  }

  const since = new Date(sinceRaw);
  if (Number.isNaN(since.getTime())) {
    return NextResponse.json(
      { error: "since must be an ISO timestamp" },
      { status: 400 }
    );
  }

  try {
    const alarm = await findTestAlarm({
      deviceId,
      since,
      types: scope === "any" ? null : DISTURBANCE_TYPES,
    });
    // A null alarm is a NORMAL answer, not an error: it means "not yet, keep
    // polling". The client decides when the window has run out, because only it
    // knows when the countdown started.
    return NextResponse.json({ alarm: alarm || null });
  } catch (err) {
    console.error("[technician/test-alarm] error", err);
    return NextResponse.json({ error: "Failed to check for alarm" }, { status: 500 });
  }
}
