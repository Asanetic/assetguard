// app/api/mainapp/response/teams/route.js
// GET  -> { teams:[...], grants:{cluster:[code]} }   (signed in)
// POST -> create/update one team, or bulk { teams:[...] }   (admin)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth, requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { listResponseTeams, saveResponseTeam } from "../../../apiUtils/dataControl/response.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json(await listResponseTeams());
  } catch (err) {
    console.error("[response teams GET]", err);
    return NextResponse.json({ teams: [], grants: {} }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  try {
    if (Array.isArray(body.teams)) {
      let n = 0;
      for (const t of body.teams) { await saveResponseTeam(t); n += 1; }
      logAudit(request, { action: "Response teams imported", category: "Response", detail: `Imported ${n} team(s)` });
      return NextResponse.json({ imported: n }, { status: 201 });
    }
    const code = await saveResponseTeam(body);
    logAudit(request, { action: "Response team saved", category: "Response", detail: code });
    return NextResponse.json({ ok: true, code }, { status: 201 });
  } catch (err) {
    console.error("[response teams POST]", err);
    return NextResponse.json({ error: "Could not save team" }, { status: 500 });
  }
}
