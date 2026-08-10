// app/api/mainapp/audit/route.js
// GET  /api/mainapp/audit?q=&category=   (admin) -> audit trail, newest first
// POST /api/mainapp/audit                 (admin) -> append an entry
//   body: { action, detail?, category? }  (actor is taken from the session)
import { NextResponse } from "next/server";
import { listAudit, writeAudit } from "../../apiUtils/dataControl/audit.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";

function clientIp(request) {
  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return request.headers.get("x-real-ip") || null;
}

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { searchParams } = new URL(request.url);
  try {
    const logs = await listAudit({
      q: searchParams.get("q") || undefined,
      category: searchParams.get("category") || undefined,
    });
    return NextResponse.json({ logs });
  } catch (err) {
    console.error("[audit GET] error", err);
    return NextResponse.json({ error: "Failed to load audit logs" }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { action, detail = "", category = "System" } = body || {};
  if (!action || !String(action).trim())
    return NextResponse.json({ error: "action is required" }, { status: 400 });

  try {
    const entry = await writeAudit({
      actorName: gate.user.name || gate.user.email || "Unknown",
      actorRole: gate.user.role || null,
      action: String(action).trim(),
      category,
      detail,
      ip: clientIp(request),
    });
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    console.error("[audit POST] error", err);
    return NextResponse.json({ error: "Failed to write audit entry" }, { status: 500 });
  }
}
