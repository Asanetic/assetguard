// app/api/mainapp/technician/worklog/route.js
// GET  /api/mainapp/technician/worklog?device_id=&site_id=&from=&to=&limit=
//        (signed in) -> { entries }
// POST /api/mainapp/technician/worklog  (signed in) -> { entry }
//
// The permanent record of an installation or a maintenance job: who, where,
// which device, the checklist, the photos, every test attempt, and the outcome.
//
// POST body (all optional except job_type):
//   { session_id, job_type, maintenance_type, site_id, site_name, device_id,
//     started_at, finished_at, outcome, lat, lng, accuracy_m,
//     checklist, photos, tests, notes }
//
// Photos are ids from mainapp/media, grouped by stage — the bytes already live
// there and copying them would give two records that can disagree.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import {
  listWorklog,
  insertWorklog,
  closeSessionsFor,
} from "../../../apiUtils/dataControl/technician.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

const ADMIN = new Set(["admin", "superadmin"]);

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const isAdmin = ADMIN.has(String(me.role || "").toLowerCase());

  const deviceId = searchParams.get("device_id") || undefined;
  const siteId = searchParams.get("site_id") || undefined;
  // Asking about ONE site or ONE device is a different question from "show me
  // everything every technician has done".
  const scoped = Boolean(deviceId || siteId);

  try {
    const entries = await listWorklog({
      // The own-jobs restriction applies to the UNSCOPED listing only.
      //
      // Applied to every non-admin request, it made a site's activity log empty
      // for anyone but a platform admin — a company manager opening the site
      // they run would see none of the work done on it, which is the opposite of
      // what an activity log is for. The concern is someone paging through every
      // technician's movements with timestamps and GPS fixes; asking what
      // happened at a named site is not that.
      technicianId:
        isAdmin || scoped ? searchParams.get("technician_id") || undefined : me.sub,
      deviceId,
      siteId,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      limit: searchParams.get("limit") || undefined,
    });
    return NextResponse.json({ entries });
  } catch (err) {
    console.error("[technician/worklog GET] error", err);
    return NextResponse.json({ error: "Failed to load work log" }, { status: 500 });
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

  const jobType = String(body.job_type || "").toLowerCase();
  if (jobType !== "install" && jobType !== "maintain") {
    return NextResponse.json(
      { error: 'job_type must be "install" or "maintain"' },
      { status: 400 }
    );
  }

  try {
    const entry = await insertWorklog({
      sessionId: body.session_id ?? null,
      // Always the signed-in user, never a value from the body. A work log whose
      // author can be set by the caller is not a record of anything.
      technicianId: me.sub,
      technicianName: me.name || me.email || null,
      jobType,
      maintenanceType: body.maintenance_type ?? null,
      siteId: body.site_id ?? null,
      siteName: body.site_name ?? null,
      deviceId: body.device_id ?? null,
      startedAt: body.started_at ?? null,
      finishedAt: body.finished_at ?? null,
      outcome: body.outcome ?? "passed",
      lat: body.lat ?? null,
      lng: body.lng ?? null,
      accuracyM: body.accuracy_m ?? null,
      checklist: body.checklist ?? {},
      photos: body.photos ?? {},
      tests: body.tests ?? [],
      notes: body.notes ?? null,
    });

    // Finishing a job ends the on-site window. Doing it here rather than relying
    // on the app to send a second call means a technician who submits and
    // immediately loses signal does not leave the site marked UNDER TEST until
    // the expiry catches up — which would mean a real alarm there, in that
    // window, being filed as a test and nobody paged.
    try {
      await closeSessionsFor(me.sub);
    } catch (err) {
      console.error("[technician/worklog] session close failed", err.message);
    }

    logAudit(request, {
      action: jobType === "install" ? "Device installed" : "Device maintained",
      category: "Technician",
      detail: `${entry.device_id || "device ?"} at ${entry.site_name || `site ${entry.site_id}`} · ${entry.outcome}`,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    console.error("[technician/worklog POST] error", err);
    return NextResponse.json({ error: "Failed to save work log" }, { status: 500 });
  }
}
