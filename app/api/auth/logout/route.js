// app/api/auth/logout/route.js
// POST /api/auth/logout -> clears the session cookie.
import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "../../apiUtils/authUtils/jwt.js";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(AUTH_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
