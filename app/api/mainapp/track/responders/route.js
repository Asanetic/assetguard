// app/api/mainapp/track/responders/route.js
// GET ?device=... -> { responders:[{userId,name,team,lat,lng,label}] } active in the
// last ~90s.
//
// WHO SEES WHOM (enforced here, server-side, so the deployed apps need no change):
//   - A WATCHER — anyone viewing the mission who is NOT themselves responding
//     (NOC, managers, admins, plain Track viewers) — sees EVERY responding team.
//   - A RESPONDER — a caller who is themselves broadcasting a position for this
//     device (i.e. actively on the mission) — sees ONLY their own entry, never
//     the other teams. The map client already draws its own blue "me" marker and
//     the red target separately and skips its own id in this list, so returning
//     just the caller's row leaves a responder with exactly "me + target", and
//     no other-team icons.
//
// "Only actual responders publish their position" (see responder_positions), so
// presence in the active-responder set is exactly what tells a responder apart
// from a watcher — no role check or app flag required.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { listActiveResponders } from "../../../apiUtils/dataControl/response.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const device = new URL(request.url).searchParams.get("device") || "";
  try {
    const rows = await listActiveResponders(device);
    const meId = String(me.sub ?? "");
    // Am I one of the teams currently responding on this device?
    const iAmResponding = rows.some((r) => String(r.user_id) === meId);
    // Responder → only my own row (the client hides self, so no other teams show).
    // Watcher   → the full set of responding teams.
    const visible = iAmResponding ? rows.filter((r) => String(r.user_id) === meId) : rows;
    const responders = visible.map((r) => ({
      userId: r.user_id, name: r.name, team: r.team,
      lat: r.lat, lng: r.lng, updatedAt: r.updated_at,
      label: r.team || r.name || "Responder",   // team name if on a team, else the name
    }));
    return NextResponse.json({ responders });
  } catch (err) {
    console.error("[track responders]", err);
    return NextResponse.json({ responders: [] }, { status: 500 });
  }
}
