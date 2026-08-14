// app/api/mainapp/reports/route.js
// GET /api/mainapp/reports?period=weekly|monthly|quarterly|yearly  (signed in)
// Operational report for the period, computed from real data. Security-side
// (Critical-only) viewers get a Critical-scoped report.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../apiUtils/dataControl/companies.js";
import { buildReport } from "../../apiUtils/dataControl/reports.js";

const PERIODS = new Set(["weekly", "monthly", "quarterly", "yearly"]);

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  let period = (searchParams.get("period") || "monthly").toLowerCase();
  if (!PERIODS.has(period)) period = "monthly";
  try {
    let restrict = false;
    try {
      const org = (await getUserOrg(me.sub)) || { role: me.role, purposes: [] };
      restrict = alarmPerms({ role: me.role, purposes: org.purposes }).criticalOnly;
    } catch {}
    const report = await buildReport(period, { restrictCritical: restrict });
    return NextResponse.json({ report, viewer: { criticalOnly: restrict } });
  } catch (err) {
    console.error("[reports GET] error", err);
    return NextResponse.json({ error: "Failed to build report" }, { status: 500 });
  }
}
