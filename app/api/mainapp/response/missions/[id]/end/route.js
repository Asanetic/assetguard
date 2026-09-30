// app/api/mainapp/response/missions/[id]/end/route.js
// POST /api/mainapp/response/missions/:id/end
//   { remarks?, outcome?, photos?[], lat?, lng?, accuracy_m? }  -> { mission }
//
// Files the mission. It does NOT close the alarm — closing stays monitoring /
// NOC / manager / admin, exactly as it is today, and a responder filing must
// never look like a closure. What this does is put "Mission ended" in the
// alarm's activity log with the evidence and the account attached.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../../../apiUtils/authUtils/session.js";
import { endMission } from "../../../../../apiUtils/dataControl/missions.js";
import { logAudit } from "../../../../../apiUtils/dataControl/audit.js";

const isAdmin = (me) => me?.role === "admin" || me?.role === "superadmin";

export async function POST(request, ctx) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = await ctx?.params;

  let body = {};
  try { body = await request.json(); } catch { /* everything is optional */ }

  try {
    const result = await endMission(params?.id, {
      responderUserId: me.sub,
      isAdmin: isAdmin(me),
      remarks: body.remarks,
      outcome: body.outcome,
      photos: body.photos,
      lat: body.lat,
      lng: body.lng,
      accuracyM: body.accuracy_m,
    });

    // Somebody else's mission answers 404, not 403 — see the PATCH route.
    if (result.error === "not_found") {
      return NextResponse.json({ error: "Mission not found" }, { status: 404 });
    }
    // Ending twice is the phone retrying after a dropped response, not a
    // mistake. Hand back the mission it already filed rather than an error the
    // responder would have to interpret standing in the road.
    if (result.error === "already_ended") {
      return NextResponse.json({ mission: result.mission, already: true });
    }
    // THE EVIDENCE RULE, server-side. The app checks it too, but a client is a
    // courtesy to its user, never a validator: this is what makes the record
    // worth reading back.
    if (result.error === "no_photos") {
      return NextResponse.json(
        { error: "A mission needs at least one photo before it can be filed.", code: "NO_PHOTOS" },
        { status: 422 }
      );
    }

    const mission = result.mission;
    const count = Array.isArray(mission?.photos) ? mission.photos.length : 0;
    logAudit(request, {
      action: "Mission ended",
      category: "Alarms",
      detail: `${mission?.device_id || "device"} — ${mission?.responder_by || me.name || me.email}` +
        ` · ${count} photo${count === 1 ? "" : "s"}${mission?.outcome ? ` · ${mission.outcome}` : ""}`,
    });
    return NextResponse.json({ mission });
  } catch (err) {
    console.error("[mission end] error", err);
    return NextResponse.json({ error: "Could not end the mission" }, { status: 500 });
  }
}
