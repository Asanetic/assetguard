// app/api/mainapp/track/responders/route.js
// GET ?device=... -> { responders:[{userId,name,team,lat,lng,label}] } active in the
// last ~90s. Any signed-in user (this is what a plain Track viewer draws on the map).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { listActiveResponders } from "../../../apiUtils/dataControl/response.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const device = new URL(request.url).searchParams.get("device") || "";
  try {
    const rows = await listActiveResponders(device);
    const responders = rows.map((r) => ({
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
