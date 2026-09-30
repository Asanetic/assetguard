// app/api/mainapp/alarms/route.js
// GET /api/mainapp/alarms?priority=&status=&q=&scope=  (signed in)
//   scope=all includes Closed alarms (All Alarms page); default excludes them
//   (the alarms landing map + list show active alarms only).
import { NextResponse } from "next/server";
import { listAlarms, alarmCounts } from "../../apiUtils/dataControl/alarms.js";
import { maybeAutoEndStaleMissions } from "../../apiUtils/dataControl/missions.js";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../apiUtils/dataControl/companies.js";
import { scopeFilterFor } from "../../apiUtils/authUtils/regionScope.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  // Keep stale missions closing even when the background ingest sweep isn't
  // running — throttled + fire-and-forget, so it never delays the alarms list.
  maybeAutoEndStaleMissions(3);
  const { searchParams } = new URL(request.url);
  try {
    // The viewer's ack side(s) + visibility — so the list/map show only what this
    // user may see and the Acknowledge button matches the profile.
    const org = (await getUserOrg(me.sub).catch(() => null)) || { role: me.role, purposes: [] };
    const perms = alarmPerms({ role: me.role, purposes: org.purposes });
    const { regions, siteIds } = await scopeFilterFor(me);   // region OR list scope
    const alarms = await listAlarms({
      priority: searchParams.get("priority") || undefined,
      status: searchParams.get("status") || undefined,
      q: searchParams.get("q") || undefined,
      includeClosed: searchParams.get("scope") === "all",
      test: searchParams.get("test") || undefined,   // exclude (default) | only | all
      role: me.role,
      restrictCritical: perms.criticalOnly,
      regions, siteIds,
    });
    const counts = await alarmCounts(me.role, perms.criticalOnly, regions, siteIds);
    const viewer = { side: perms.side, canAckMonitoring: perms.canAckMonitoring, canAckSecurity: perms.canAckSecurity, canChooseSide: perms.canChooseSide, isSecuritySide: perms.isSecuritySide };
    return NextResponse.json({ alarms, counts, viewer });
  } catch (err) {
    console.error("[alarms GET] error", err);
    return NextResponse.json({ error: "Failed to load alarms" }, { status: 500 });
  }
}
