// app/api/mainapp/alarms/route.js
// GET /api/mainapp/alarms?priority=&status=&q=&scope=  (signed in)
//   scope=all includes Closed alarms (All Alarms page); default excludes them
//   (the alarms landing map + list show active alarms only).
import { NextResponse } from "next/server";
import { listAlarms, alarmCounts } from "../../apiUtils/dataControl/alarms.js";
import { getAuth } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  try {
    const alarms = await listAlarms({
      priority: searchParams.get("priority") || undefined,
      status: searchParams.get("status") || undefined,
      q: searchParams.get("q") || undefined,
      includeClosed: searchParams.get("scope") === "all",
    });
    const counts = await alarmCounts();
    return NextResponse.json({ alarms, counts });
  } catch (err) {
    console.error("[alarms GET] error", err);
    return NextResponse.json({ error: "Failed to load alarms" }, { status: 500 });
  }
}
