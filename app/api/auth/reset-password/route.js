// app/api/auth/reset-password/route.js
// POST (public) { channel, target, code, password } -> verify OTP, set new password.
import { NextResponse } from "next/server";
import { verifyCode } from "../../apiUtils/dataControl/verification.js";
import { setPasswordByIdentity } from "../../apiUtils/dataControl/users.js";
import { hashPassword } from "../../apiUtils/authUtils/password.js";

export async function POST(request) {
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const { channel, target, code, password } = body || {};
  if (channel !== "email" && channel !== "phone")
    return NextResponse.json({ error: "Bad channel" }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Enter the code" }, { status: 400 });
  if (!password || password.length < 8 || !/[0-9]/.test(password))
    return NextResponse.json({ error: "Password must be at least 8 characters and include a number" }, { status: 400 });

  try {
    const check = await verifyCode(channel, target, code);
    if (!check.ok) return NextResponse.json({ error: check.error }, { status: 400 });
    const hash = await hashPassword(password);
    const ok = await setPasswordByIdentity(channel, target, hash);
    if (!ok) return NextResponse.json({ error: "No account with that email/phone" }, { status: 404 });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reset-password] error", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
