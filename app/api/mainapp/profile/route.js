// app/api/mainapp/profile/route.js
// GET /api/mainapp/profile  -> the signed-in user's own details (safe columns) + company purposes
// Read-only: the only self-service change is the password (see ./password).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import { findUserById } from "../../apiUtils/dataControl/users.js";
import { getUserOrg, companyType } from "../../apiUtils/dataControl/companies.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const user = await findUserById(me.sub);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    let org = null;
    try { org = await getUserOrg(me.sub); } catch {}
    const purposes = org?.purposes || [];
    return NextResponse.json({
      user,
      org: org ? { company: org.company, purposes, type: (typeof companyType === "function" ? companyType(purposes) : null) } : null,
    });
  } catch (err) {
    console.error("[profile GET] error", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}
