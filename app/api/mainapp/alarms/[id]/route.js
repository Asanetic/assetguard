// app/api/mainapp/alarms/[id]/route.js
// GET /api/mainapp/alarms/:id -> full detail for the View Alarm page:
//   { alarm, snapshot, linked, lifecycle, me }  where `me` carries the viewer's
//   acknowledge side + action permissions.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { alarmPerms, ACK_FINDINGS } from "../../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../../apiUtils/dataControl/companies.js";
import {
  getAlarm, getLinkedAlarms, getAlarmDeviceSnapshot, buildLifecycle,
} from "../../../apiUtils/dataControl/alarms.js";
import { listResponses } from "../../../apiUtils/dataControl/response.js";
import { missionLifecycleEvents, missionsForAlarm } from "../../../apiUtils/dataControl/missions.js";

export async function GET(request, ctx) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = await ctx?.params; // works whether params is a plain object (Next 14) or a promise (Next 15)
  const id = params?.id;
  try {
    const alarm = await getAlarm(id);
    if (!alarm) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });
    // Everything below is best-effort — a missing column / empty table must never
    // blank the whole page, only omit that piece.
    let org = { role: me.role, purposes: [] };
    try { org = (await getUserOrg(me.sub)) || org; } catch (e) { console.error("[alarm detail] org:", e?.message); }
    const perms = alarmPerms({ role: me.role, purposes: org.purposes });
    // A security-side (Critical-only) user can't open a lower-tier alarm's detail.
    if (perms.criticalOnly && alarm.priority !== "Critical") {
      return NextResponse.json({ error: "Not permitted" }, { status: 403 });
    }
    let linked = [], snapshot = null, responses = [], missionEvents = [], missions = [];
    try { linked = await getLinkedAlarms(alarm); } catch (e) { console.error("[alarm detail] linked:", e?.message); }
    try { snapshot = await getAlarmDeviceSnapshot(alarm.device_id); } catch (e) { console.error("[alarm detail] snapshot:", e?.message); }
    try { responses = await listResponses(alarm.id); } catch (e) { console.error("[alarm detail] responses:", e?.message); }
    // Field missions — what came of the response. `alarm_responses` records who
    // said they were going; a mission records what they found and when they
    // finished. Merged HERE rather than inside buildLifecycle so the alarms data
    // manager is not touched: missions are a separate module that appends to the
    // activity log, and a missing table omits the events rather than the page.
    try { missionEvents = await missionLifecycleEvents(alarm.id); } catch (e) { console.error("[alarm detail] missions:", e?.message); }
    // The mission ROWS, for the report — who went, what they found, and the
    // media ids of their evidence. The timeline gets one line per mission from
    // missionEvents above; the photos belong here, beside the close photos.
    try { missions = await missionsForAlarm(alarm.id); } catch (e) { console.error("[alarm detail] mission rows:", e?.message); }
    const lifecycle = [...buildLifecycle(alarm, linked, responses), ...missionEvents]
      .sort((a, b) => new Date(a.at) - new Date(b.at));
    return NextResponse.json({
      alarm, snapshot: snapshot || {}, linked, lifecycle, missions,
      me: { ...perms, company: org.company || null, findings: ACK_FINDINGS,
            ackedMonitoring: !!alarm.ack_monitoring_at, ackedSecurity: !!alarm.ack_security_at },
    });
  } catch (err) {
    console.error("[alarm detail GET] error", err);
    return NextResponse.json({ error: `Failed to load alarm: ${err?.message || "unknown error"}` }, { status: 500 });
  }
}
