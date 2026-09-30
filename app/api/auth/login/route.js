// app/api/auth/login/route.js
// -----------------------------------------------------------------------------
// POST /api/auth/login   Body: { identity, password }
// Success: sets httpOnly JWT cookie (web) AND returns the token in the body
// (so the future native Android app can store it for `Authorization: Bearer`).
//
// Status rules: only Active accounts may sign in.
//   Pending   -> awaiting approval
//   Rejected  -> registration was declined
//   Suspended -> blocked by an admin
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { findUserByIdentity, touchUserSeen } from "../../apiUtils/dataControl/users.js";
import { verifyPassword } from "../../apiUtils/authUtils/password.js";
import { signToken, cookieOptions, AUTH_COOKIE } from "../../apiUtils/authUtils/jwt.js";
import { roleAllowedForApp, APP_LABEL } from "../../apiUtils/authUtils/appAccess.js";

function safeUser(u) {
  return {
    id: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    company: u.company,
    role: u.role,
    role_name: u.role_name,
    status: u.status,
  };
}

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { identity, password, app } = body || {};
  if (!identity)
    return NextResponse.json({ error: "Enter your email or phone number" }, { status: 400 });
  if (!password)
    return NextResponse.json({ error: "Enter your password" }, { status: 400 });

  let user;
  try {
    user = await findUserByIdentity(identity);
  } catch (err) {
    console.error("[login] db error", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }

  const INVALID = "That email/phone or password is not right";
  if (!user) return NextResponse.json({ error: INVALID }, { status: 401 });

  // Verify password before revealing anything about account status.
  const ok = await verifyPassword(password, user.password);
  if (!ok) return NextResponse.json({ error: INVALID }, { status: 401 });

  if (user.status === "Pending")
    return NextResponse.json(
      { error: "Your account is awaiting approval", status: "Pending" },
      { status: 403 }
    );
  if (user.status === "Rejected")
    return NextResponse.json(
      { error: "Your registration was not approved", status: "Rejected" },
      { status: 403 }
    );
  if (user.status === "Suspended")
    return NextResponse.json(
      { error: "That account is suspended — speak to an administrator", status: "Suspended" },
      { status: 403 }
    );

  // Per-app role gate. Only the two phone apps send an `app`; the web console
  // sends none and is never gated here. A role not on that app's list is turned
  // away at the door rather than dropped into an app built for another job.
  if (!roleAllowedForApp(app, user.role)) {
    const label = APP_LABEL[String(app || "").trim().toLowerCase()] || "this";
    return NextResponse.json(
      {
        error: `Your account isn’t authorised for the ${label} app. Ask an administrator if you need access.`,
        status: "Unauthorised",
      },
      { status: 403 }
    );
  }

  // Mark them online immediately on sign-in (getAuth keeps it fresh from here on).
  try { await touchUserSeen(user.id); } catch { /* presence is best-effort */ }

  const token = signToken(user);
  const res = NextResponse.json({ user: safeUser(user), token });
  res.cookies.set(AUTH_COOKIE, token, cookieOptions());
  return res;
}
