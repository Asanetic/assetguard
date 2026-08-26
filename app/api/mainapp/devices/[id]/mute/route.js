// app/api/mainapp/devices/[id]/mute/route.js
// POST /api/mainapp/devices/:id/mute   { hours }  -> mute alert NOTIFICATIONS
//                                      { hours: 0 } -> unmute
//
// Writes `config.muted_until` as an ISO timestamp. An absolute instant, not a
// countdown: a duration stored as "2 hours" has to be interpreted against
// something, and every restart, clock change and timezone makes that a fresh
// chance to be wrong. `muteGuard.isAlertMuted` compares it to now and expires
// on its own — nothing has to remember to unmute.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "../../../../apiUtils/s_env/db.js";
import { requireAdmin } from "../../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../../apiUtils/dataControl/audit.js";

/** Long enough to work through a cabinet; short enough to be forgotten safely. */
const MAX_HOURS = 24;

export async function POST(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { id: idParam } = await params;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const hours = Number(body?.hours);
  if (!Number.isFinite(hours) || hours < 0 || hours > MAX_HOURS) {
    return NextResponse.json(
      { error: `hours must be between 0 and ${MAX_HOURS}` },
      { status: 422 }
    );
  }

  // Same either/or the rest of the device routes use.
  const found = await query(
    `SELECT id, device_id FROM devices WHERE device_id = $1 OR id::text = $1 LIMIT 1`,
    [String(idParam)]
  );
  const device = found.rows[0];
  if (!device) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  const mutedUntil = hours > 0 ? new Date(Date.now() + hours * 3600_000).toISOString() : null;

  try {
    await query(
      // The same shallow JSONB merge the PATCH route uses, so the alarm
      // thresholds and the geofence sitting in this blob are untouched.
      `UPDATE devices
          SET config = COALESCE(config, '{}'::jsonb) || $1::jsonb
        WHERE id = $2`,
      [JSON.stringify({ muted_until: mutedUntil }), device.id]
    );
  } catch (err) {
    console.error("[device mute] error", err);
    // The column is optional on an un-migrated database. Saying so beats a 500
    // that reads as "the server is broken".
    return NextResponse.json(
      { error: "Muting needs the config column — run db/device_view.sql.", code: "CONFIG_COLUMN_MISSING" },
      { status: 503 }
    );
  }

  logAudit(request, {
    action: mutedUntil ? `Alerts muted for ${hours}h` : "Alerts unmuted",
    category: "Devices",
    detail: mutedUntil
      ? `${device.device_id} — notifications suppressed until ${mutedUntil}`
      : `${device.device_id} — notifications resumed`,
  });

  return NextResponse.json({ ok: true, muted_until: mutedUntil });
}
