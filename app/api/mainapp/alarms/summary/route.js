// app/api/mainapp/alarms/summary/route.js
// GET /api/mainapp/alarms/summary -> { open, critical }  (drives the nav badge)
import { NextResponse } from "next/server";
import { alarmCounts } from "../../../apiUtils/dataControl/alarms.js";
import { getAuth } from "../../../apiUtils/authUtils/session.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ open: 0, critical: 0 });
  try {
    const c = await alarmCounts();
    return NextResponse.json({ open: c.open, critical: c.criticalOpen });
  } catch {
    return NextResponse.json({ open: 0, critical: 0 });
  }
}
