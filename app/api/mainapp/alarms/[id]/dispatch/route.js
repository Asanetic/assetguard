// app/api/mainapp/alarms/[id]/dispatch/route.js
// GET -> dispatch info for an alarm: region, regional manager, response cluster,
// the team(s) for that cluster and alternative teams (all from the DB). Shown to a
// security-side user right after they acknowledge, to guide who to send.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../../apiUtils/authUtils/session.js";
import { getDispatchInfo } from "../../../../apiUtils/dataControl/response.js";

export async function GET(request, ctx) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = await ctx?.params;
  try {
    const info = await getDispatchInfo(params?.id);
    if (!info) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });
    return NextResponse.json(info);
  } catch (err) {
    console.error("[alarm dispatch]", err);
    return NextResponse.json({ error: "Failed to load dispatch info" }, { status: 500 });
  }
}
