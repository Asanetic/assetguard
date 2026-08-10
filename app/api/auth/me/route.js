// app/api/auth/me/route.js
// GET /api/auth/me — returns the signed-in user (from the JWT cookie).
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken, AUTH_COOKIE } from "../../apiUtils/authUtils/jwt.js";

export async function GET() {
  const store = await cookies();
  const token = store.get(AUTH_COOKIE)?.value;
  const payload = token ? verifyToken(token) : null;
  if (!payload) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  return NextResponse.json({
    user: {
      id: payload.sub,
      name: payload.name,
      email: payload.email,
      role: payload.role,
    },
  });
}
