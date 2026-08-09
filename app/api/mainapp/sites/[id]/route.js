// app/api/mainapp/sites/[id]/route.js
// GET    /api/mainapp/sites/:id   (admin) -> one site
// PATCH  /api/mainapp/sites/:id   (admin) -> update fields
// DELETE /api/mainapp/sites/:id   (admin) -> remove
import { NextResponse } from "next/server";
import {
  getSite, updateSite, deleteSite, getSiteByCode,
} from "../../../apiUtils/dataControl/sites.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";

export async function GET(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const site = await getSite(id);
  if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ site });
}

export async function PATCH(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  try {
    // If the code is changing, keep it unique.
    if (body.code) {
      const clash = await getSiteByCode(String(body.code).trim().toUpperCase());
      if (clash && clash.id !== id)
        return NextResponse.json({ error: "A site with that code already exists" }, { status: 409 });
      body.code = String(body.code).trim().toUpperCase();
    }
    const site = await updateSite(id, body);
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ site });
  } catch (err) {
    console.error("[sites PATCH] error", err);
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
    const site = await getSite(id);
    if (!site) return NextResponse.json({ error: "Not found" }, { status: 404 });
    await deleteSite(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[sites DELETE] error", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
