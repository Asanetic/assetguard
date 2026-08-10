// app/api/mainapp/alarms/[id]/ack/route.js
// POST /api/mainapp/alarms/:id/ack  (signed in) -> acknowledge an open alarm
import { NextResponse } from "next/server";
import { acknowledgeAlarm } from "../../../../apiUtils/dataControl/alarms.js";
import { getAuth } from "../../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../../apiUtils/dataControl/audit.js";

export async function POST(request, { params }) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const id = params?.id;
  try {
    const alarm = await acknowledgeAlarm(id);
    if (!alarm) return NextResponse.json({ error: "Alarm not found or already acknowledged" }, { status: 404 });
    logAudit(request, { action: "Alarm acknowledged", category: "Alarms", detail: `${alarm.name} (${alarm.id}) on ${alarm.device_id}` });
    return NextResponse.json({ alarm });
  } catch (err) {
    console.error("[alarm ack] error", err);
    return NextResponse.json({ error: "Could not acknowledge alarm" }, { status: 500 });
  }
}
