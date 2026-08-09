// app/api/mainapp/users/[id]/route.js
// PATCH /api/mainapp/users/:id   (admin)
// Body: { action: "approve", role, regions? }
//     | { action: "reject" }
//     | { action: "suspend" }
//     | { action: "activate" }
//     | { action: "setRole", role }
import { NextResponse } from "next/server";
import {
  approveUser,
  setStatus,
  setRole,
  setRegions,
  setPasswordById,
  deleteUser,
  findUserById,
} from "../../../apiUtils/dataControl/users.js";
import { hashPassword } from "../../../apiUtils/authUtils/password.js";
import { notifyApproved, notifyRejected } from "../../../apiUtils/notify/notifications.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";

export async function PATCH(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { id: idParam } = await params; // Next.js 15+: params is a Promise
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad user id" }, { status: 400 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { action, role, regions = [], password } = body || {};
  try {
    let result;
    switch (action) {
      case "setPassword": {
        if (!password || password.length < 8 || !/[0-9]/.test(password))
          return NextResponse.json({ error: "Password must be at least 8 characters and include a number" }, { status: 400 });
        const hash = await hashPassword(password);
        result = await setPasswordById(id, hash);
        break;
      }
      case "approve":
        if (!role)
          return NextResponse.json({ error: "Pick a role to approve" }, { status: 400 });
        result = await approveUser(id, { role, regions, approvedBy: gate.user.sub });
        // Notify the user (email + SMS) that they're approved.
        try { const u = await findUserById(id); if (u) await notifyApproved(u); } catch {}
        break;
      case "reject":
        result = await setStatus(id, "Rejected");
        try { const u = await findUserById(id); if (u) await notifyRejected(u); } catch {}
        break;
      case "suspend":
        result = await setStatus(id, "Suspended");
        break;
      case "activate":
        result = await setStatus(id, "Active");
        break;
      case "setRole":
        if (!role) return NextResponse.json({ error: "Missing role" }, { status: 400 });
        result = await setRole(id, role);
        break;
      case "setRegions":
        result = await setRegions(id, regions);
        break;
      default:
        return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }
    if (!result) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ user: result });
  } catch (err) {
    console.error("[users PATCH] error", err);
    return NextResponse.json({ error: "Action failed" }, { status: 500 });
  }
}

// DELETE /api/mainapp/users/:id  (admin) -> permanently remove a user
export async function DELETE(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad user id" }, { status: 400 });

  // Don't allow deleting your own account.
  if (String(gate.user.sub) === String(id))
    return NextResponse.json({ error: "You can't delete your own account" }, { status: 400 });

  try {
    await deleteUser(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[users DELETE] error", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
