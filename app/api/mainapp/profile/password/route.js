// app/api/mainapp/profile/password/route.js
// POST /api/mainapp/profile/password  { current, next }
// Change your OWN password. Verifies the current password first.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { getPasswordHash, setPasswordById } from "../../../apiUtils/dataControl/users.js";
import { hashPassword, verifyPassword } from "../../../apiUtils/authUtils/password.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  let body = {};
  try { body = await request.json(); } catch {}
  const current = String(body.current || "");
  const next = String(body.next || "");
  if (!current || !next) return NextResponse.json({ error: "Enter your current and new password" }, { status: 400 });
  if (next.length < 8) return NextResponse.json({ error: "New password must be at least 8 characters" }, { status: 400 });
  if (next === current) return NextResponse.json({ error: "New password must be different" }, { status: 400 });
  try {
    const hash = await getPasswordHash(me.sub);
    if (!hash) return NextResponse.json({ error: "Account has no password set" }, { status: 400 });
    const ok = await verifyPassword(current, hash);
    if (!ok) return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 });
    await setPasswordById(me.sub, await hashPassword(next));
    logAudit(request, { action: "Password changed", category: "Account", detail: `${me.name || me.email} changed their password` });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[profile password] error", err);
    return NextResponse.json({ error: "Could not change password" }, { status: 500 });
  }
}
