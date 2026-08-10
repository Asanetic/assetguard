// app/api/mainapp/users/route.js
// GET /api/mainapp/users?status=&q=   (admin) -> users + status counts
import { NextResponse } from "next/server";
import {
  listUsers,
  countByStatus,
  createActiveUser,
  findUserByIdentity,
} from "../../apiUtils/dataControl/users.js";
import { hashPassword, generatePassword } from "../../apiUtils/authUtils/password.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";
import { notifyCredentials } from "../../apiUtils/notify/notifications.js";

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
