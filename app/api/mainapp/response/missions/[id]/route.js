// app/api/mainapp/response/missions/[id]/route.js
// GET   /api/mainapp/response/missions/:id            -> { mission }
// PATCH /api/mainapp/response/missions/:id  { remarks?, photos?[] }
//         mid-mission saves — the draft remark, and photo ids as they upload.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../../apiUtils/authUtils/session.js";
import { getMission, updateMission } from "../../../../apiUtils/dataControl/missions.js";

const isAdmin = (me) => me?.role === "admin" || me?.role === "superadmin";

export async function GET(request, ctx) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = await ctx?.params; // plain object on Next 14, a promise on 15
  try {
    const mission = await getMission(params?.id);
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    return NextResponse.json({ mission });
  } catch (err) {
    console.error("[mission GET] error", err);
    return NextResponse.json({ error: "Failed to load the mission" }, { status: 500 });
  }
}

export async function PATCH(request, ctx) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = await ctx?.params;

  let body = {};
  try { body = await request.json(); } catch { /* nothing to change */ }

  try {
    const mission = await updateMission(params?.id, {
      responderUserId: me.sub,
      isAdmin: isAdmin(me),
      remarks: body.remarks,
      photos: body.photos,
    });
    // 404 rather than 403 for somebody else's mission. A 403 confirms the id
    // exists and tells the asker who is out chasing what; a 404 says nothing.
    if (!mission) return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    return NextResponse.json({ mission });
  } catch (err) {
    console.error("[mission PATCH] error", err);
    return NextResponse.json({ error: "Could not save the mission" }, { status: 500 });
  }
}
