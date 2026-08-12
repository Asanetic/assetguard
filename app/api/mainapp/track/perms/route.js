// app/api/mainapp/track/perms/route.js
// GET -> { canRespond, canDirections, name } for the signed-in user, so the
// tracking page can decide whether to show the viewer's own location + directions
// (responders) or the target only (plain Track viewers).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../../apiUtils/dataControl/companies.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ canRespond: false, canDirections: false });
  let org = { role: me.role, purposes: [] };
  try { org = (await getUserOrg(me.sub)) || org; } catch {}
  const p = alarmPerms({ role: me.role, purposes: org.purposes });
  return NextResponse.json({ userId: me.sub, canRespond: p.canRespond, canDirections: p.canDirections, name: me.name || null });
}
