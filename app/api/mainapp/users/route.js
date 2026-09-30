// app/api/mainapp/users/route.js
// GET /api/mainapp/users?status=&q=   (admin) -> users + status counts
import { NextResponse } from "next/server";
import {
  listUsers,
  countByStatus,
  createActiveUser,
  findUserByIdentity,
  deleteUser,
  setRole,
  setRegions,
  setStatus,
} from "../../apiUtils/dataControl/users.js";
import { hashPassword, generatePassword } from "../../apiUtils/authUtils/password.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";
import { notifyCredentials } from "../../apiUtils/notify/notifications.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") || undefined;
  const q = searchParams.get("q") || undefined;

  try {
    const [users, counts] = await Promise.all([
      listUsers({ status, q }),
      countByStatus(),
    ]);
    return NextResponse.json({ users, counts });
  } catch (err) {
    console.error("[users] error", err);
    return NextResponse.json({ error: "Failed to load users" }, { status: 500 });
  }
}

// POST /api/mainapp/users  (admin) -> create an Active user with a role
export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const {
    name, email, phone, company_id = null, role = null,
    regions = [], region = null, password,
  } = body || {};
  if (!name || !name.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  if (!email || !email.trim()) return NextResponse.json({ error: "Email is required" }, { status: 400 });

  // Password is optional: blank -> auto-generate. If set, enforce the rule.
  const generated = !password || !String(password).trim();
  const plainPassword = generated ? generatePassword() : String(password);
  if (!generated && (plainPassword.length < 8 || !/[0-9]/.test(plainPassword)))
    return NextResponse.json(
      { error: "Password must be at least 8 characters and include a number" },
      { status: 400 }
    );

  // Region scope: accept an array; fall back to the single `region` field.
  const regionList = Array.isArray(regions) && regions.length
    ? regions
    : region ? [region] : [];

  try {
    if (await findUserByIdentity(email))
      return NextResponse.json({ error: "An account with that email already exists" }, { status: 409 });

    const passwordHash = await hashPassword(plainPassword);
    const user = await createActiveUser({
      name: name.trim(),
      email: email.trim(),
      phone: (phone || "").trim(),
      companyId: company_id || null,
      role: role || null,
      regions: regionList,
      passwordHash,
    });

    const notified = await notifyCredentials({
      name: name.trim(), email: email.trim(), phone: (phone || "").trim(), password: plainPassword,
    });

    return NextResponse.json(
      {
        user,
        notified,
        // Return the temp password so the admin can also hand it over.
        password: plainPassword,
        generated,
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[users POST] error", err);
    return NextResponse.json({ error: "Could not create user" }, { status: 500 });
  }
}

// PATCH /api/mainapp/users  (admin) -> bulk-apply a role, a region scope and/or
// a status to many users at once. Body: { ids:[num], role?, regions?, status? }.
//   • role present (non-empty)  -> setRole on each selected user.
//   • regions present (array)   -> setRegions on each ([] = country-wide).
//   • status present            -> setStatus on each ("Suspended" | "Active").
// At least one of the three must be supplied. This is the same shape the
// per-user PATCH uses ("setRole" / "setRegions" / suspend|activate), applied
// across a selection — the mirror of the bulk DELETE below.
//
// SELF GUARD: neither a role change NOR a status change is applied to your own
// account here, so a bulk op can't strip your admin role or suspend you and lock
// you out. A region change is applied to everyone, including you (harmless, and
// sometimes intended).
export async function PATCH(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number).filter(Number.isFinite))] : [];
  if (!ids.length) return NextResponse.json({ error: "No users selected" }, { status: 400 });

  const hasRole = typeof body.role === "string" && body.role.trim() !== "";
  const hasRegions = Array.isArray(body.regions);
  // Only Suspend / Active may be set in bulk — Pending/Rejected belong to the
  // approval flow, not a mass toggle.
  const status = body.status === "Suspended" || body.status === "Active" ? body.status : null;
  const hasStatus = !!status;
  if (!hasRole && !hasRegions && !hasStatus)
    return NextResponse.json({ error: "Choose a role, region scope or status to apply" }, { status: 400 });

  const role = hasRole ? String(body.role).trim() : null;
  const regions = hasRegions ? body.regions.filter((r) => typeof r === "string") : null;
  const self = Number(gate.user.sub);

  let roleUpdated = 0, regionUpdated = 0, statusUpdated = 0, skippedSelfRole = 0, skippedSelfStatus = 0;
  for (const id of ids) {
    try {
      if (hasRole) {
        if (id === self) skippedSelfRole++;           // never demote yourself in a bulk op
        else { await setRole(id, role); roleUpdated++; }
      }
      if (hasRegions) { await setRegions(id, regions); regionUpdated++; }
      if (hasStatus) {
        if (id === self) skippedSelfStatus++;         // never suspend/deactivate yourself in bulk
        else { await setStatus(id, status); statusUpdated++; }
      }
    } catch (e) { console.error("[users bulk patch]", id, e?.message || e); }
  }

  const parts = [];
  if (hasRole) parts.push(`role → ${role} on ${roleUpdated}`);
  if (hasRegions) parts.push(`region scope on ${regionUpdated}`);
  if (hasStatus) parts.push(`status → ${status} on ${statusUpdated}`);
  logAudit(request, { action: "Users bulk updated", category: "Users", detail: `Applied ${parts.join(", ")} user(s)` });

  return NextResponse.json({ roleUpdated, regionUpdated, statusUpdated, skippedSelfRole, skippedSelfStatus });
}

// DELETE /api/mainapp/users  (admin) -> mass-delete users. Body: { ids: [num] }.
// Your own account is always skipped (you can't delete yourself).
export async function DELETE(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const ids = Array.isArray(body.ids) ? [...new Set(body.ids.map(Number).filter(Number.isFinite))] : [];
  if (!ids.length) return NextResponse.json({ error: "No users selected" }, { status: 400 });

  const self = Number(gate.user.sub);
  const targets = ids.filter((id) => id !== self);
  let deleted = 0;
  for (const id of targets) {
    try { await deleteUser(id); deleted++; } catch (e) { console.error("[users bulk delete]", id, e?.message || e); }
  }
  logAudit(request, { action: "Users deleted", category: "Users", detail: `Mass-deleted ${deleted} user(s)` });
  return NextResponse.json({ deleted, skippedSelf: ids.length - targets.length });
}
