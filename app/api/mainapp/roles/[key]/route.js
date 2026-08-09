// app/api/mainapp/roles/[key]/route.js
import { NextResponse } from "next/server";
import { updateRole, deleteRole } from "../../../apiUtils/dataControl/roles.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";

export async function PATCH(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { key } = await params;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  try {
    const role = await updateRole(key, body || {});
    if (!role) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ role });
  } catch (err) {
    console.error("[roles PATCH]", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { key } = await params;
  try {
    await deleteRole(key);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[roles DELETE]", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
