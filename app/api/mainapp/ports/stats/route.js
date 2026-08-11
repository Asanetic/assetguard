// app/api/mainapp/ports/stats/route.js
// GET /api/mainapp/ports/stats -> live totals for the "Device logs & ports" header:
//   active connections, messages today, bytes in today, parse errors, unknown devices.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { getTotals } from "../../../apiUtils/ingest/portManager.js";
import { rawTotalsToday, unknownDevicesCount } from "../../../apiUtils/dataControl/rawLogs.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const totals = getTotals(); // live, in-process
  let messagesToday = 0, bytesInToday = 0, unknownDevices = 0;
  try { const t = await rawTotalsToday(); messagesToday = t.messages; bytesInToday = t.bytes; } catch {}
  try { unknownDevices = await unknownDevicesCount(); } catch {}
  return NextResponse.json({
    activeConnections: totals.activeConnections,
    parseErrors: totals.parseErrors,
    messagesToday, bytesInToday, unknownDevices,
  });
}
