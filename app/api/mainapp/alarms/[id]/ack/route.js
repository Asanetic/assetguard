// app/api/mainapp/alarms/[id]/ack/route.js
// POST /api/mainapp/alarms/:id/ack  { finding, note }
// Records the CALLER'S side (monitoring or security, from their company purpose)
// independently — the other side can still ack afterwards. A finding is required.
import { NextResponse } from "next/server";
import { acknowledgeSide, getAlarm } from "../../../../apiUtils/dataControl/alarms.js";
import { getAuth } from "../../../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../../../apiUtils/dataControl/companies.js";
import { logAudit } from "../../../../apiUtils/dataControl/audit.js";

export async function POST(request, ctx) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = await ctx?.params;
  const id = params?.id;
  let body = {};
  try { body = await request.json(); } catch {}
  const finding = String(body.finding || "").trim();
  const note = String(body.note || "").trim();
  if (!finding && !note) return NextResponse.json({ error: "Record what you found before acknowledging" }, { status: 400 });

  try {
    const org = (await getUserOrg(me.sub).catch(() => null)) || { role: me.role, purposes: [] };
    const perms = alarmPerms({ role: me.role, purposes: org.purposes });
    if (!perms.canAck) return NextResponse.json({ error: "Your role can't acknowledge alarms" }, { status: 403 });

    // Resolve the side, then verify the user is actually allowed to ack THAT side.
    const requested = body.side === "security" || body.side === "monitoring" ? body.side : null;
    const side = requested || perms.side;
    if (!side) return NextResponse.json({ error: "Pick a side to acknowledge for" }, { status: 400 });
    if (side === "monitoring" && !perms.canAckMonitoring)
      return NextResponse.json({ error: "You can't acknowledge for the monitoring company" }, { status: 403 });
    if (side === "security" && !perms.canAckSecurity)
      return NextResponse.json({ error: "You can't acknowledge for the security company" }, { status: 403 });

    // The security company only handles Critical alarms — non-Critical alarms are
    // acknowledged by the monitoring side alone.
    if (side === "security") {
      const target = await getAlarm(id);
      if (!target) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });
      if (target.priority !== "Critical")
        return NextResponse.json({ error: "The security company only acknowledges Critical alarms" }, { status: 400 });
    }

    const alarm = await acknowledgeSide(id, side, { by: me.name || me.email, finding, note });
    if (!alarm) return NextResponse.json({ error: "Alarm not found" }, { status: 404 });
    logAudit(request, { action: `Alarm acknowledged (${side})`, category: "Alarms",
      detail: `${alarm.name} (${alarm.id}) by ${me.name || me.email} — ${[finding, note].filter(Boolean).join(" · ")}` });
    return NextResponse.json({ alarm, side });
  } catch (err) {
    console.error("[alarm ack] error", err);
    return NextResponse.json({ error: "Could not acknowledge alarm" }, { status: 500 });
  }
}
