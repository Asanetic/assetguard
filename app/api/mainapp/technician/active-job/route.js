// app/api/mainapp/technician/active-job/route.js
// POST /api/mainapp/technician/active-job   (signed in)
//
// What this technician is working on right now, for the admin Installation
// page's "in progress" list. The app upserts it as it moves through the wizard
// and clears it on submit/abandon. Independent of the on-site alarm session —
// it gates nothing and downgrades no alarms.
//
// Body:
//   { job_type, site_id, device_ids, step, started_at }   -> upsert
//   { action: "clear" }                                   -> remove
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { upsertActiveJob, clearActiveJob } from "../../../apiUtils/dataControl/technician.js";

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Expected JSON" }, { status: 400 }); }

  if (String(body.action || "").toLowerCase() === "clear") {
    try {
      const cleared = await clearActiveJob(me.sub);
      return NextResponse.json({ ok: true, cleared });
    } catch (err) {
      console.error("[technician/active-job clear] error", err);
      return NextResponse.json({ error: "Failed to clear" }, { status: 500 });
    }
  }

  try {
    await upsertActiveJob({
      technicianId: me.sub,
      technicianName: me.name || me.email || null,
      jobType: body.job_type,
      siteId: body.site_id,
      deviceIds: body.device_ids,
      step: body.step,
      startedAt: body.started_at,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[technician/active-job] error", err);
    return NextResponse.json({ error: "Failed to record active job" }, { status: 500 });
  }
}
