// app/api/mainapp/profile/contact/route.js
// POST /api/mainapp/profile/contact   Body: { channel: 'email'|'phone', target }
// Self-service change of the signed-in user's OWN email or phone. Requires that the
// user just verified the new value by one-time code (the same OTP flow the mobile app
// uses): /api/auth/verify/send → /api/auth/verify/confirm consumes a code, and
// hasVerified() here confirms it within the last 30 min before committing the change.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { hasVerified, normTarget } from "../../../apiUtils/dataControl/verification.js";
import { findUserById } from "../../../apiUtils/dataControl/users.js";
import { query } from "../../../apiUtils/s_env/db.js";

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { channel, target } = body || {};
  if (channel !== "email" && channel !== "phone")
    return NextResponse.json({ error: "Bad channel" }, { status: 400 });

  const t = normTarget(channel, target);
  if (!t) return NextResponse.json({ error: "Enter a value" }, { status: 400 });
  if (channel === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t))
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  if (channel === "phone" && !/^\+?\d{9,15}$/.test(t))
    return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });

  // Gate: the new value must have been verified by OTP just now.
  let ok = false;
  try { ok = await hasVerified(channel, t); } catch { ok = false; }
  if (!ok) return NextResponse.json({ error: "Verify the code first" }, { status: 400 });

  try {
    // Self-contained update (no shared users.js helper, to avoid tree drift): set the
    // value AND flip its *_verified flag, since the OTP just confirmed it.
    if (channel === "email")
      await query(`UPDATE users SET email = $2, email_verified = true WHERE id = $1`, [me.sub, t]);
    else
      await query(`UPDATE users SET phone = $2, phone_verified = true WHERE id = $1`, [me.sub, t]);
  } catch (e) {
    if (String(e?.code) === "23505" || /unique|duplicate/i.test(String(e?.message || "")))
      return NextResponse.json({ error: `That ${channel} is already in use by another account` }, { status: 409 });
    console.error("[profile/contact] error", e);
    return NextResponse.json({ error: "Could not save the change" }, { status: 500 });
  }

  const user = await findUserById(me.sub).catch(() => null);
  return NextResponse.json({ ok: true, user });
}
