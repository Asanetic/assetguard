// app/api/mainapp/modules/[id]/route.js
import { NextResponse } from "next/server";
import { updateModule, deleteModule } from "../../../apiUtils/dataControl/modules.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";

export async function PATCH(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  try {
    const module = await updateModule(id, body || {});
    if (!module) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ module });
  } catch (err) {
    console.error("[modules PATCH]", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  try {
    await deleteModule(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[modules DELETE]", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
