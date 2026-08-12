// app/api/mainapp/alarms/[id]/respond/route.js
// POST /api/mainapp/alarms/:id/respond — logs that THIS user has started responding
// (name + their team, if any). Gated to responders (field response + admins).
// Several people may respond to one alarm; each is logged (de-duped per person).
import { NextResponse } from "next/server";
import { getAuth } from "../../../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../../../apiUtils/dataControl/companies.js";
import { recordResponse, teamForUser } from "../../../../apiUtils/dataControl/response.js";
import { getAlarm } from "../../../../apiUtils/dataControl/alarms.js";
import { logAudit } from "../../../../apiUtils/dataControl/audit.js";

export async function POST(request, ctx) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = await ctx?.params;
  const id = params?.id;
  try {
    const org = (await getUserOrg(me.sub).catch(() => null)) || { role: me.role, purposes: [] };
    const perms = alarmPerms({ role: me.role, purposes: org.purposes });
    if (!perms.canRespond) return NextResponse.json({ error: "Your role can't start a response" }, { status: 403 });

    const alarm = await getAlarm(id);
    if (!alarm) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });

    const team = await teamForUser(me.sub); // {team_code, team_name} | null
    const row = await recordResponse(id, {
      by: me.name || me.email, userId: me.sub,
      teamCode: team?.team_code || null, teamName: team?.team_name || null,
    });
    logAudit(request, { action: "Response started", category: "Alarms",
      detail: `${alarm.name} (${alarm.id}) — ${me.name || me.email}${team?.team_name ? ` · ${team.team_name}` : ""}` });
    // marker label = team name if on a team, else the responder's own name
    return NextResponse.json({ ok: true, already: !row, marker: team?.team_name || me.name || me.email });
  } catch (err) {
    console.error("[alarm respond] error", err);
    return NextResponse.json({ error: "Could not start response" }, { status: 500 });
  }
}
