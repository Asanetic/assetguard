// app/api/mainapp/technician/session/route.js
// GET  /api/mainapp/technician/session   (signed in) -> { session }  this tech's open window
// POST /api/mainapp/technician/session   (signed in) -> { session }  open or close one
//
// The on-site window. Opening one marks the site as UNDER TEST: while it is
// open, every alarm from every device at that site is recorded as a test rather
// than a real incident, and nobody is paged. See apiUtils/ingest/siteUnderTest.js
// for what that does and does not do.
//
// POST body:
//   { action: "open", site_id, device_id, device_ids, job_type, minutes }
//   { action: "close" }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import {
  openSession,
  closeSessionsFor,
  activeSessionFor,
} from "../../../apiUtils/dataControl/technician.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const session = await activeSessionFor(me.sub);
    return NextResponse.json({ session });
  } catch (err) {
    console.error("[technician/session GET] error", err);
    return NextResponse.json({ error: "Failed to read session" }, { status: 500 });
  }
}

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected JSON" }, { status: 400 });
  }

  const action = String(body.action || "").toLowerCase();

  if (action === "close") {
    try {
      const closed = await closeSessionsFor(me.sub);
      return NextResponse.json({ ok: true, closed });
    } catch (err) {
      console.error("[technician/session close] error", err);
      return NextResponse.json({ error: "Failed to close session" }, { status: 500 });
    }
  }

  if (action !== "open") {
    return NextResponse.json(
      { error: 'action must be "open" or "close"' },
      { status: 400 }
    );
  }

  // site_id is required to open. A session with no site downgrades nothing —
  // isSiteUnderTest() is keyed by site — so accepting one would hand back a session
  // that silently does not work, and the technician would find out when a
  // response team arrived.
  if (body.site_id == null || body.site_id === "") {
    return NextResponse.json({ error: "site_id is required" }, { status: 400 });
  }

  try {
    const session = await openSession({
      technicianId: me.sub,
      technicianName: me.name || me.email || null,
      siteId: body.site_id,
      deviceId: body.device_id || null,
      // A visit covers every tracker at the site, not just the first — this is
      // what makes all of their test alarms visible to the technician.
      deviceIds: body.device_ids,
      jobType: body.job_type,
      minutes: body.minutes,
    });

    // Worth an audit line: for as long as this is open, disturbances at that
    // site are downgraded. Someone reviewing a missed alarm needs to be able to
    // see that a maintenance window was the reason.
    logAudit(request, {
      action: "Tech on-site session opened",
      category: "Technician",
      detail: `site ${session.site_id} · ${session.job_type} · until ${session.expires_at}`,
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (err) {
    console.error("[technician/session open] error", err);
    return NextResponse.json({ error: "Failed to open session" }, { status: 500 });
  }
}
