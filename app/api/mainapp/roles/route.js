// app/api/mainapp/roles/route.js
// GET /api/mainapp/roles   (admin) -> role list for the approval dropdown
import { NextResponse } from "next/server";
import { listRoles, createRole } from "../../apiUtils/dataControl/roles.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  try {
    return NextResponse.json({ roles: await listRoles() });
  } catch (err) {
    console.error("[roles] error", err);
    return NextResponse.json({ roles: [] }, { status: 500 });
  }
}

function slugify(s) {
  return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const { name, icon, bg, fg, description } = body || {};
  if (!name?.trim()) return NextResponse.json({ error: "Role name is required" }, { status: 400 });
  const key = (body.key && slugify(body.key)) || slugify(name);
  if (!key) return NextResponse.json({ error: "Could not derive a role key" }, { status: 400 });
  try {
    const role = await createRole({ key, name: name.trim(), icon, bg, fg, description });
    return NextResponse.json({ role }, { status: 201 });
  } catch (err) {
    if (err.code === "23505") return NextResponse.json({ error: "A role with that key already exists" }, { status: 409 });
    console.error("[roles POST]", err);
    return NextResponse.json({ error: "Could not create role" }, { status: 500 });
  }
}
