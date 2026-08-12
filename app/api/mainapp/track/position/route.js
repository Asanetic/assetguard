// app/api/mainapp/track/position/route.js
// POST { device, lat, lng } — a responder broadcasts their live location for a
// device. Name + team are taken from the session (team via membership). Gated to
// responders (field response + admins).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../../apiUtils/dataControl/companies.js";
import { upsertResponderPosition, teamForUser } from "../../../apiUtils/dataControl/response.js";

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch {}
  const device = String(body.device || "").trim();
  const lat = Number(body.lat), lng = Number(body.lng);
  if (!device || !Number.isFinite(lat) || !Number.isFinite(lng))
    return NextResponse.json({ error: "device, lat, lng required" }, { status: 400 });
  try {
    const org = (await getUserOrg(me.sub).catch(() => null)) || { role: me.role, purposes: [] };
    if (!alarmPerms({ role: me.role, purposes: org.purposes }).canRespond)
      return NextResponse.json({ error: "Not a responder" }, { status: 403 });
    const team = await teamForUser(me.sub); // {team_code, team_name} | null
    await upsertResponderPosition({
      deviceId: device, userId: me.sub, name: me.name || me.email,
      team: team?.team_name || null, lat, lng,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[track position]", err);
    return NextResponse.json({ error: "Could not update position" }, { status: 500 });
  }
}
