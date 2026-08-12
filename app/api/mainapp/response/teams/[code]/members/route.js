// app/api/mainapp/response/teams/[code]/members/route.js
// GET  -> { members:[{id,name,email,role}] } for a team
// PUT  -> { name, userIds:[...] } assign field-response users to the team (replace)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth, requireAdmin } from "../../../../../apiUtils/authUtils/session.js";
import { listTeamMembers, setTeamMembers } from "../../../../../apiUtils/dataControl/response.js";
import { logAudit } from "../../../../../apiUtils/dataControl/audit.js";

export async function GET(request, ctx) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = await ctx?.params;
  const code = decodeURIComponent(params?.code || "");
  try {
    return NextResponse.json({ members: await listTeamMembers(code) });
  } catch (err) {
    console.error("[team members GET]", err);
    return NextResponse.json({ members: [] }, { status: 500 });
  }
}

export async function PUT(request, ctx) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const params = await ctx?.params;
  const code = decodeURIComponent(params?.code || "");
  let body = {};
  try { body = await request.json(); } catch {}
  const userIds = Array.isArray(body.userIds) ? body.userIds : [];
  try {
    const n = await setTeamMembers(code, body.name || code, userIds);
    logAudit(request, { action: "Team members assigned", category: "Response", detail: `${code}: ${n} responder(s)` });
    return NextResponse.json({ ok: true, count: n });
  } catch (err) {
    console.error("[team members PUT]", err);
    return NextResponse.json({ error: "Could not save members" }, { status: 500 });
  }
}
