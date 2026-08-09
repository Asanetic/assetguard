// app/api/auth/verify/confirm/route.js
// POST /api/auth/verify/confirm   Body: { channel, target, code }
import { NextResponse } from "next/server";
import { verifyCode } from "../../../apiUtils/dataControl/verification.js";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { channel, target, code } = body || {};
  if (channel !== "email" && channel !== "phone")
    return NextResponse.json({ error: "Bad channel" }, { status: 400 });
  if (!code) return NextResponse.json({ error: "Enter the code" }, { status: 400 });

  try {
    const result = await verifyCode(channel, target, code);
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: 400 });
    return NextResponse.json({ verified: true });
  } catch (err) {
    console.error("[verify/confirm] error", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
