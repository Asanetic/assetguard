// app/api/mainapp/access-requests/[id]/route.js
// PATCH (admin) -> { action: "decline" | "handle" }
import { NextResponse } from "next/server";
import { setAccessRequestStatus } from "../../../apiUtils/dataControl/accessRequests.js";
import { notifyAccessDeclined } from "../../../apiUtils/notify/notifications.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function PATCH(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const map = { decline: "Declined", handle: "Handled" };
  const status = map[body?.action];
  if (!status) return NextResponse.json({ error: "Unknown action" }, { status: 400 });

  try {
    const req = await setAccessRequestStatus(id, status);
    if (!req) return NextResponse.json({ error: "Not found" }, { status: 404 });
    // Notify the requester (email + SMS) in the background — don't block the response.
    if (body.action === "decline") {
      notifyAccessDeclined({ name: req.name, email: req.email, phone: req.phone }).catch(() => {});
    }
    logAudit(request, {
      action: body.action === "decline" ? "Access request declined" : "Access request handled",
      category: "Users",
      detail: `${body.action === "decline" ? "Declined" : "Handled"} access request from ${req.name || req.email || "unknown"}`,
    });
    return NextResponse.json({ request: req });
  } catch (err) {
    console.error("[access-requests PATCH] error", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}
