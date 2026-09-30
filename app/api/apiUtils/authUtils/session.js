// app/api/apiUtils/authUtils/session.js
// -----------------------------------------------------------------------------
// Reads the current session from a request — supports BOTH:
//   - web:    httpOnly cookie (atc_token)
//   - native: Authorization: Bearer <token>   (for the Android app later)
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { verifyToken, AUTH_COOKIE } from "./jwt.js";
import { query } from "../s_env/db.js";

// --- presence: "last seen" ---------------------------------------------------
// Every authenticated request (web OR native app) passes through getAuth, so we
// stamp users.last_seen here. That makes "online now" work for the ALREADY
// DEPLOYED apps without any client change — they just keep making their normal
// requests and the server records the activity.
//
// Writing on every request would be wasteful, so it is throttled in-memory: at
// most one UPDATE per user per SEEN_THROTTLE_MS. The write is fire-and-forget —
// presence must never slow down or fail the request it is riding on.
const SEEN_THROTTLE_MS = 60 * 1000;
const lastSeenWrite = new Map(); // sub -> epoch ms of last write
function touchLastSeen(sub) {
  if (sub == null) return;
  const key = String(sub);
  const now = Date.now();
  if (now - (lastSeenWrite.get(key) || 0) < SEEN_THROTTLE_MS) return;
  lastSeenWrite.set(key, now);
  query(`UPDATE users SET last_seen = now() WHERE id = $1`, [key])
    .catch((e) => console.error("[last_seen]", e?.message || e));
}

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
  const payload = verifyToken(token);
  if (payload && payload.sub != null) touchLastSeen(payload.sub); // presence
  return payload;
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
