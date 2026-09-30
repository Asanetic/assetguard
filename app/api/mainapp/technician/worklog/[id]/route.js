// app/api/mainapp/technician/worklog/[id]/route.js
// GET /api/mainapp/technician/worklog/{id}  (signed in) -> { entry }
//
// One work-log entry in full: checklist, photo ids by stage, every test attempt.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../../apiUtils/authUtils/session.js";
import { getWorklog } from "../../../../apiUtils/dataControl/technician.js";

const ADMIN = new Set(["admin", "superadmin"]);

export async function GET(request, { params }) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const entry = await getWorklog(params?.id);
    if (!entry) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Same rule as the list: your own jobs, unless you are an admin. Checked
    // here too rather than only on the list route — an id is guessable, and a
    // scoped list in front of an unscoped detail route protects nothing.
    const isAdmin = ADMIN.has(String(me.role || "").toLowerCase());
    if (!isAdmin && String(entry.technician_id) !== String(me.sub)) {
      // 404 rather than 403: telling a stranger that entry 41 exists but is not
      // theirs is itself a small leak.
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ entry });
  } catch (err) {
    console.error("[technician/worklog/:id] error", err);
    return NextResponse.json({ error: "Failed to load entry" }, { status: 500 });
  }
}
