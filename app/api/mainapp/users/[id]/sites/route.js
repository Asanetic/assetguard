// app/api/mainapp/users/[id]/sites/route.js
// GET  -> a user's assigned sites (admin)
// PUT  -> replace a user's assigned sites (admin). Body: { siteIds: number[] }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../apiUtils/authUtils/session.js";
import { listUserSites, setUserSites } from "../../../../apiUtils/dataControl/userSites.js";
import { logAudit } from "../../../../apiUtils/dataControl/audit.js";

export async function GET(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad user id" }, { status: 400 });
  try {
    return NextResponse.json({ sites: await listUserSites(id) });
  } catch (err) {
    console.error("[user sites GET]", err);
    return NextResponse.json({ error: "Failed to load assigned sites" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad user id" }, { status: 400 });
  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const siteIds = Array.isArray(body.siteIds) ? body.siteIds.map(Number).filter(Number.isFinite) : [];
  try {
    await setUserSites(id, siteIds);
    logAudit(request, { action: "Assigned sites changed", category: "Users", detail: `Set ${siteIds.length} assigned site(s) for user #${id}` });
    return NextResponse.json({ sites: await listUserSites(id) });
  } catch (err) {
    console.error("[user sites PUT]", err);
    return NextResponse.json({ error: "Failed to save assigned sites" }, { status: 500 });
  }
}
