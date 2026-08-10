// app/api/apiUtils/authUtils/jwt.js
// -----------------------------------------------------------------------------
// JWT sign/verify + the httpOnly cookie name used for the session.
// -----------------------------------------------------------------------------

import jwt from "jsonwebtoken";

export const AUTH_COOKIE = "atc_token";
const DEFAULT_EXPIRES = process.env.JWT_EXPIRES_IN || "7d";

function secret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET is not set");
  return s;
}

/** Sign a session token from a user record (only non-sensitive claims). */
export function signToken(user) {
  const payload = {
    sub: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
  return jwt.sign(payload, secret(), { expiresIn: DEFAULT_EXPIRES });
}

/** Verify a token; returns the decoded payload or null. */
export function verifyToken(token) {
  try {
    return jwt.verify(token, secret());
  } catch {
    return null;
  }
}

/** Cookie options for the session cookie. */
export function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}
