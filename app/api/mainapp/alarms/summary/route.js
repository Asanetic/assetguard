// app/api/mainapp/alarms/summary/route.js
// GET /api/mainapp/alarms/summary -> { open, critical }  (drives the nav badge)
import { NextResponse } from "next/server";
import { alarmCounts } from "../../../apiUtils/dataControl/alarms.js";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../../apiUtils/dataControl/companies.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ open: 0, critical: 0 });
  try {
    const org = (await getUserOrg(me.sub).catch(() => null)) || { role: me.role, purposes: [] };
    const perms = alarmPerms({ role: me.role, purposes: org.purposes });
    const c = await alarmCounts(me.role, perms.criticalOnly);
    return NextResponse.json({ open: c.open, critical: c.criticalOpen });
  } catch {
    return NextResponse.json({ open: 0, critical: 0 });
  }
}
