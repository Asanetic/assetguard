// app/api/mainapp/response/teams/grants/route.js
// POST   { teamCode, cluster } -> allow a team to respond in another cluster (admin)
// DELETE { teamCode, cluster } -> revoke it                                  (admin)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../apiUtils/authUtils/session.js";
import { addTeamGrant, removeTeamGrant } from "../../../../apiUtils/dataControl/response.js";

async function body(request) { try { return await request.json(); } catch { return {}; } }

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { teamCode, cluster } = await body(request);
  if (!teamCode || !cluster) return NextResponse.json({ error: "teamCode and cluster required" }, { status: 400 });
  try { await addTeamGrant(teamCode, cluster); return NextResponse.json({ ok: true }); }
  catch (err) { console.error("[grants POST]", err); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}

export async function DELETE(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { teamCode, cluster } = await body(request);
  if (!teamCode || !cluster) return NextResponse.json({ error: "teamCode and cluster required" }, { status: 400 });
  try { await removeTeamGrant(teamCode, cluster); return NextResponse.json({ ok: true }); }
  catch (err) { console.error("[grants DELETE]", err); return NextResponse.json({ error: "Failed" }, { status: 500 }); }
}
