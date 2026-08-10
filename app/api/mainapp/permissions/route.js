// app/api/mainapp/permissions/route.js
// GET /api/mainapp/permissions?role=KEY  -> { grants: [{module_key, perm_key}] }
// PUT /api/mainapp/permissions           -> body { role, grants:[{module_key,perm_key}] }
import { NextResponse } from "next/server";
import { getRolePermissions, setRolePermissions, PERMS } from "../../apiUtils/dataControl/permissions.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const role = new URL(request.url).searchParams.get("role");
  if (!role) return NextResponse.json({ error: "role is required" }, { status: 400 });
  try {
    return NextResponse.json({ grants: await getRolePermissions(role), perms: PERMS });
  } catch (err) {
    console.error("[permissions GET]", err);
    return NextResponse.json({ grants: [], perms: PERMS }, { status: 500 });
  }
}

export async function PUT(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const { role, grants } = body || {};
  if (!role) return NextResponse.json({ error: "role is required" }, { status: 400 });
  try {
    await setRolePermissions(role, Array.isArray(grants) ? grants : []);
    return NextResponse.json({ ok: true, count: (grants || []).length });
  } catch (err) {
    console.error("[permissions PUT]", err);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
