// app/api/mainapp/modules/route.js
import { NextResponse } from "next/server";
import { listModules, createModule } from "../../apiUtils/dataControl/modules.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  try {
    return NextResponse.json({ modules: await listModules() });
  } catch (err) {
    console.error("[modules GET]", err);
    return NextResponse.json({ modules: [] }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const { name, key, grp, type, active = true } = body || {};
  if (!name?.trim() || !key?.trim() || !grp?.trim() || !type?.trim())
    return NextResponse.json({ error: "Name, key, group and type are required" }, { status: 400 });
  try {
    const module = await createModule({ name: name.trim(), key: key.trim(), grp: grp.trim(), type: type.trim(), active });
    return NextResponse.json({ module }, { status: 201 });
  } catch (err) {
    if (err.code === "23505") return NextResponse.json({ error: "That module key already exists" }, { status: 409 });
    console.error("[modules POST]", err);
    return NextResponse.json({ error: "Could not create module" }, { status: 500 });
  }
}
