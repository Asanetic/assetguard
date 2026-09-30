// app/api/mainapp/response/missions/route.js
// GET  /api/mainapp/response/missions   -> { missions }
//        ?scope=mine|all &alarm_id= &device_id= &site_id= &status= &from= &to= &limit=
// POST /api/mainapp/response/missions   { alarm_id?, device_id, site_id?, site_name? }
//        -> { mission, already }   opens the mission, or returns the running one
//
// A mission is what a responder DID about an alarm. `alarm_responses` (written
// by POST alarms/:id/respond) records who said they were going; this records
// what came of it. POST here also writes that response row, so the app makes
// ONE call when Track and respond is pressed and the alarm lifecycle still gets
// its "Response started" event from the module that has always owned it.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../../apiUtils/dataControl/companies.js";
import { getAlarm } from "../../../apiUtils/dataControl/alarms.js";
import { recordResponse, teamForUser } from "../../../apiUtils/dataControl/response.js";
import { listMissions, startMission, maybeAutoEndStaleMissions } from "../../../apiUtils/dataControl/missions.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

const isAdmin = (me) => me?.role === "admin" || me?.role === "superadmin";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  // Close any mission left open 3 h+ after its alarm was closed. Throttled and
  // fire-and-forget, so listing missions is what keeps the auto-end running even
  // if the background ingest sweep isn't.
  maybeAutoEndStaleMissions(3);

  const { searchParams } = new URL(request.url);
  const alarmId = searchParams.get("alarm_id") || undefined;
  const deviceId = searchParams.get("device_id") || undefined;
  const siteId = searchParams.get("site_id") || undefined;
  const scope = searchParams.get("scope") || "";

  // VISIBILITY — the rule that hid every technician photo from every manager
  // once already (see claude/web-technician-data.md). Read it before changing
  // it, and TEST AS A NON-ADMIN: an admin account cannot see the difference.
  //
  //   asking about a SUBJECT (?alarm_id / ?device_id / ?site_id) -> any signed-in
  //     user sees that subject's missions. "What happened about this alarm" is a
  //     reasonable question for a manager to ask, and refusing it is the bug.
  //   asking for EVERYTHING -> your own rows, unless you are an admin. The risk
  //     being guarded is someone paging the whole estate's missions with their
  //     GPS fixes and the name of whoever was standing there.
  const subjectScoped = Boolean(alarmId || deviceId || siteId);
  const wantsAll = scope === "all";
  const ownerId = (subjectScoped || (wantsAll && isAdmin(me))) ? undefined : me.sub;

  try {
    const missions = await listMissions({
      ownerId,
      alarmId,
      deviceId,
      siteId,
      status: searchParams.get("status") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      limit: searchParams.get("limit") || undefined,
    });
    return NextResponse.json({ missions });
  } catch (err) {
    console.error("[missions GET] error", err);
    return NextResponse.json({ error: "Failed to load missions" }, { status: 500 });
  }
}

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* an empty body is a 422 below */ }

  const deviceId = String(body.device_id || "").trim();
  if (!deviceId) return NextResponse.json({ error: "A device is required" }, { status: 422 });
  const alarmId = body.alarm_id ? String(body.alarm_id) : null;

  try {
    const org = (await getUserOrg(me.sub).catch(() => null)) || { role: me.role, purposes: [] };
    const perms = alarmPerms({ role: me.role, purposes: org.purposes });
    if (!perms.canRespond) {
      return NextResponse.json({ error: "Your role can't start a response" }, { status: 403 });
    }

    // Named on the record so it survives the person leaving, exactly as
    // alarm_responses does it.
    const team = await teamForUser(me.sub).catch(() => null);
    const by = me.name || me.email;

    let alarm = null;
    if (alarmId) {
      alarm = await getAlarm(alarmId);
      if (!alarm) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });

      // The existing response log, unchanged and still owned by response.js.
      // It is what puts "Response started" in the alarm lifecycle, and it
      // de-dupes per (alarm, user) on its own.
      await recordResponse(alarmId, {
        by, userId: me.sub,
        teamCode: team?.team_code || null, teamName: team?.team_name || null,
      }).catch((e) => console.error("[missions POST] recordResponse:", e?.message));
    }

    const mission = await startMission({
      alarmId,
      deviceId,
      siteId: body.site_id ?? null,
      siteName: body.site_name ?? alarm?.site ?? null,
      responderBy: by,
      responderUserId: me.sub,
      teamCode: team?.team_code || null,
      teamName: team?.team_name || null,
    });
    if (!mission) return NextResponse.json({ error: "Could not start the mission" }, { status: 500 });

    // `already` lets the client tell "I opened this" from "I rejoined the one
    // that was running" without a second round trip.
    const already = Boolean(mission.started_at && Date.now() - new Date(mission.started_at).getTime() > 5000);
    if (!already) {
      logAudit(request, {
        action: "Mission started",
        category: "Alarms",
        detail: `${alarm?.name || deviceId} — ${by}${team?.team_name ? ` · ${team.team_name}` : ""}`,
      });
    }
    return NextResponse.json({ mission, already }, { status: already ? 200 : 201 });
  } catch (err) {
    console.error("[missions POST] error", err);
    return NextResponse.json({ error: "Could not start the mission" }, { status: 500 });
  }
}
