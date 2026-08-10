// app/api/mainapp/missed-alarms/route.js
// GET  /api/mainapp/missed-alarms          (signed in) -> the missed-alarm log
// POST /api/mainapp/missed-alarms          (signed in) -> record a missed alarm
//   Body: { kind: 'recording'|'timestamp', device, note }
import { NextResponse } from "next/server";
import { listMissedAlarms, addMissedAlarm } from "../../apiUtils/dataControl/alarms.js";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json({ missed: await listMissedAlarms() });
  } catch (err) {
    console.error("[missed GET] error", err);
    return NextResponse.json({ error: "Failed to load missed alarms" }, { status: 500 });
  }
}

export async function POST(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  if (!String(body?.device || "").trim())
    return NextResponse.json({ error: "Enter the device or site" }, { status: 422 });
  try {
    const rec = await addMissedAlarm({ kind: body.kind, device: body.device, note: body.note });
    logAudit(request, { action: "Missed alarm recorded", category: "Alarms", detail: `${rec.kind} — ${rec.device || "—"} (${rec.id})` });
    return NextResponse.json({ missed: rec }, { status: 201 });
  } catch (err) {
    console.error("[missed POST] error", err);
    return NextResponse.json({ error: "Could not record missed alarm" }, { status: 500 });
  }
}
