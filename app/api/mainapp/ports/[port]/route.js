// app/api/mainapp/ports/[port]/route.js
// PATCH  /api/mainapp/ports/:port { action: "open" | "close" }
// DELETE /api/mainapp/ports/:port         -> close + remove from the list
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { open, close } from "../../../apiUtils/ingest/portManager.js";
import { removePort } from "../../../apiUtils/dataControl/listenerPorts.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function PATCH(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const port = Number(params?.port);
  let body; try { body = await request.json(); } catch { body = {}; }
  const action = body.action;
  if (!["open", "close"].includes(action)) return NextResponse.json({ error: "action must be open or close" }, { status: 400 });
  try {
    const res = action === "open" ? await open(port) : await close(port);
    logAudit(request, { action: `TCP port ${action === "open" ? "opened" : "closed"}`, category: "Devices", detail: `Port ${port}` });
    return NextResponse.json(res, { status: res.ok ? 200 : 409 });
  } catch (err) {
    console.error("[ports PATCH] error", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const port = Number(params?.port);
  try {
    await close(port);
    await removePort(port);
    logAudit(request, { action: "TCP port removed", category: "Devices", detail: `Port ${port}` });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[ports DELETE] error", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
