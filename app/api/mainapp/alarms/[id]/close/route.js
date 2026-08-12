// app/api/mainapp/alarms/[id]/close/route.js
// POST /api/mainapp/alarms/:id/close  { outcome:'genuine'|'false', note, photos:[] }
// Only monitoring NOC / admins / managers may close. Requires a note; photos of
// what was found are optional (stored as data URLs).
import { NextResponse } from "next/server";
import { closeAlarmFull } from "../../../../apiUtils/dataControl/alarms.js";
import { getAuth } from "../../../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../../../apiUtils/dataControl/companies.js";
import { logAudit } from "../../../../apiUtils/dataControl/audit.js";

const MAX_PHOTOS = 6;
const MAX_PHOTO_BYTES = 3_000_000; // per data URL (client compresses to ~1.4 MB; headroom)

export async function POST(request, ctx) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const params = await ctx?.params;
  const id = params?.id;
  let body = {};
  try { body = await request.json(); } catch {}
  const outcome = body.outcome === "false" ? "false" : "genuine";
  const note = String(body.note || "").trim();
  if (!note) return NextResponse.json({ error: "A closing note is required" }, { status: 400 });

  let photos = Array.isArray(body.photos) ? body.photos.filter((p) => typeof p === "string") : [];
  photos = photos.slice(0, MAX_PHOTOS).filter((p) => p.length <= MAX_PHOTO_BYTES);

  try {
    const org = (await getUserOrg(me.sub).catch(() => null)) || { role: me.role, purposes: [] };
    const perms = alarmPerms({ role: me.role, purposes: org.purposes });
    if (!perms.canClose) return NextResponse.json({ error: "Your role can't close alarms" }, { status: 403 });

    const alarm = await closeAlarmFull(id, { by: me.name || me.email, outcome, note, photos });
    if (!alarm) return NextResponse.json({ error: "Alarm not found or already closed" }, { status: 404 });
    logAudit(request, { action: `Alarm closed (${outcome})`, category: "Alarms",
      detail: `${alarm.name} (${alarm.id}) — ${note}${photos.length ? ` [${photos.length} photo(s)]` : ""}` });
    return NextResponse.json({ alarm });
  } catch (err) {
    console.error("[alarm close] error", err);
    return NextResponse.json({ error: "Could not close alarm" }, { status: 500 });
  }
}
