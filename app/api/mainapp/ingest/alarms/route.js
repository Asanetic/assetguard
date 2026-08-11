// app/api/mainapp/ingest/alarms/route.js
// GET /api/mainapp/ingest/alarms?device=<device_id text>
//   -> device-raised alarms (alarm_type IS NOT NULL) from the shared alarms table.
// This is a convenience view over the same `alarms` table the All Alarms page
// uses; acknowledging/closing is done through the normal /alarms endpoints.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { query } from "../../../apiUtils/s_env/db.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const device = searchParams.get("device");
  const params = [];
  let clause = `WHERE alarm_type IS NOT NULL`;
  if (device) { params.push(device); clause += ` AND device_id = $${params.length}`; }
  try {
    const { rows } = await query(
      `SELECT * FROM alarms ${clause} ORDER BY created_at DESC LIMIT 200`, params);
    const open = rows.filter((r) => r.status === "Open").length;
    return NextResponse.json({ alarms: rows, open });
  } catch (err) {
    console.error("[ingest alarms] error", err);
    return NextResponse.json({ alarms: [], open: 0 });
  }
}
