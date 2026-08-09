// app/api/apiUtils/authUtils/session.js
// -----------------------------------------------------------------------------
// Reads the current session from a request — supports BOTH:
//   - web:    httpOnly cookie (atc_token)
//   - native: Authorization: Bearer <token>   (for the Android app later)
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE } from "./jwt.js";

function tokenFromRequest(request) {
  // 1) Authorization: Bearer <token>
  const auth = request.headers.get("authorization") || "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();

  // 2) Cookie header
  const cookie = request.headers.get("cookie") || "";
  for (const part of cookie.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === AUTH_COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Decoded session payload ({ sub, name, email, role }) or null. */
export function getAuth(request) {
  const token = tokenFromRequest(request);
  if (!token) return null;
  return verifyToken(token);
}

const ADMIN_ROLES = new Set(["superadmin", "admin"]);

/**
 * Guard helper for admin routes.
 * Usage:
 *   const gate = requireAdmin(request);
 *   if (gate.error) return gate.error;   // 401/403 response
 *   const me = gate.user;                // session payload
 */
export function requireAdmin(request) {
  const user = getAuth(request);
  if (!user)
    return { error: NextResponse.json({ error: "Not signed in" }, { status: 401 }) };
  if (!ADMIN_ROLES.has(user.role))
    return { error: NextResponse.json({ error: "Admins only" }, { status: 403 }) };
  return { user };
}
