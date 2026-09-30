// app/api/mainapp/technician/test-alarms/route.js
// GET  /api/mainapp/technician/test-alarms?open=1&limit=  (signed in)
//        -> { alarms, openCount }
// POST /api/mainapp/technician/test-alarms  { id, action: "ack"|"close" }
//        -> { alarm }
//
// The technician's OWN test alarms: everything raised on a device while they had
// an on-site session open for it.
//
// WHY THIS EXISTS RATHER THAN REUSING mainapp/alarms/{id}/ack:
//
//   `alarmPerms` gives a field_tech neither `canAck` nor `canClose`, and that is
//   correct — a technician has no business acknowledging the fleet's alarms, and
//   nothing here should become a way around that. But they DO need to clear the
//   alarms they set off themselves, or every install leaves litter for the
//   control room to tidy up.
//
//   So this route grants exactly that and nothing more: the id must be a TEST
//   alarm (`ownsTestAlarm`), or it is a 404. A real alarm is never source='test',
//   so there is no id a technician can pass here that reaches the fleet's own
//   alarms. It is a narrow power over test data, not a role change.
//
//   Scoped to the technician's OWN devices: those they selected in a wizard.
//   A drill fired at somebody else's tracker is not theirs to see or clear, and
//   a real alarm is never source='test', so there is no id they can pass here
//   that reaches the fleet's own alarms.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import {
  listTechTestAlarms,
  countOpenTechTestAlarms,
  ownsTestAlarm,
  setTestAlarmStatus,
} from "../../../apiUtils/dataControl/technician.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const openOnly = searchParams.get("open") === "1";

  try {
    const [alarms, openCount] = await Promise.all([
      listTechTestAlarms({
        technicianId: me.sub,
        includeClosed: !openOnly,
        limit: searchParams.get("limit") || undefined,
      }),
      countOpenTechTestAlarms(me.sub),
    ]);
    // openCount is returned even when the list is filtered, because it drives
    // the tab badge and the badge must not change meaning with the filter.
    return NextResponse.json({ alarms, openCount });
  } catch (err) {
    console.error("[technician/test-alarms GET] error", err);
    return NextResponse.json({ error: "Failed to load test alarms" }, { status: 500 });
  }
}

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }

  const id = body.id;
  const action = String(body.action || "").toLowerCase();

  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });
  if (action !== "ack" && action !== "close") {
    return NextResponse.json({ error: 'action must be "ack" or "close"' }, { status: 400 });
  }

  try {
    // 404 rather than 403 for anything that is not a test alarm: confirming
    // that ALM-2026-0081 exists is itself a small leak, and a technician has no
    // legitimate way to have learned a real alarm's id.
    if (!(await ownsTestAlarm(me.sub, id))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const alarm = await setTestAlarmStatus(id, action);
    if (!alarm) return NextResponse.json({ error: "Not found" }, { status: 404 });

    logAudit(request, {
      action: action === "close" ? "Test alarm closed" : "Test alarm acknowledged",
      category: "Technician",
      detail: `${alarm.id} · ${alarm.device_id || "device ?"}`,
    });

    return NextResponse.json({ alarm });
  } catch (err) {
    console.error("[technician/test-alarms POST] error", err);
    return NextResponse.json({ error: "Failed to update alarm" }, { status: 500 });
  }
}
