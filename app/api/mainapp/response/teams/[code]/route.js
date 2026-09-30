// app/api/mainapp/response/teams/[code]/route.js
// PUT    -> update a response team (may rename via body.code)   (admin)
// DELETE -> remove a response team                              (admin)
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../apiUtils/authUtils/session.js";
import { saveResponseTeam, deleteResponseTeam } from "../../../../apiUtils/dataControl/response.js";
import { logAudit } from "../../../../apiUtils/dataControl/audit.js";

export async function PUT(request, ctx) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const params = await ctx?.params;
  const original = decodeURIComponent(params?.code || "");
  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  try {
    const code = await saveResponseTeam({ ...body, code: (body.code || original), originalCode: original });
    logAudit(request, { action: "Response team updated", category: "Response", detail: code });
    return NextResponse.json({ ok: true, code });
  } catch (err) {
    console.error("[response team PUT]", err);
    return NextResponse.json({ error: "Could not save team" }, { status: 500 });
  }
}

export async function DELETE(request, ctx) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const params = await ctx?.params;
  const code = decodeURIComponent(params?.code || "");
  try {
    await deleteResponseTeam(code);
    logAudit(request, { action: "Response team deleted", category: "Response", detail: code });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[response team DELETE]", err);
    return NextResponse.json({ error: "Could not delete team" }, { status: 500 });
  }
}
