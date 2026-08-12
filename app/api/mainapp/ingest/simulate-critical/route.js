// app/api/mainapp/ingest/simulate-critical/route.js
// POST /api/mainapp/ingest/simulate-critical  (admin)
// One-click "critical-alarms procedure" simulation. Injects a moving telemetry
// route (through parse -> store, so alarms fire like live traffic) that walks the
// full critical procedure in order — Disturbance → Geofence → Critical Motion,
// paced ~2 min apart — then logs a Response. Afterwards Playback can replay the
// route + incidents and export them.
// Body: { imei, deviceId?, lat?, lng?, paceSec?, stepSec? }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { query } from "../../../apiUtils/s_env/db.js";
import { buildCriticalRoute } from "../../../apiUtils/ingest/simRoute.js";
import { extractFrames, parseFrame } from "../../../apiUtils/ingest/parse.js";
import { resolveAndStore } from "../../../apiUtils/ingest/store.js";
import { recordResponse } from "../../../apiUtils/dataControl/response.js";

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const imei = String(body.imei || "").trim();
  if (!imei) return NextResponse.json({ error: "Pick a device / IMEI first" }, { status: 400 });

  const paceSec = Math.min(600, Math.max(30, Number(body.paceSec) || 120));   // 2 min default
  const stepSec = Math.min(60, Math.max(5, Number(body.stepSec) || 20));

  try {
    // Resolve the device's id + SITE coordinates (route/alarm origin).
    let deviceId = body.deviceId || null;
    let base = { lat: body.lat != null ? Number(body.lat) : null, lng: body.lng != null ? Number(body.lng) : null };
    try {
      const { rows } = await query(
        `SELECT d.device_id, s.lat, s.lng FROM devices d LEFT JOIN sites s ON s.id = d.site_id
          WHERE d.imei = $1 OR d.device_id = $1 LIMIT 1`, [imei]
      );
      if (rows[0]) {
        deviceId = rows[0].device_id || deviceId;
        if (rows[0].lat != null) base = { lat: Number(rows[0].lat), lng: Number(rows[0].lng) };
      }
    } catch { /* fall back to client coords */ }
    if (base.lat == null || base.lng == null) {
      return NextResponse.json({ error: "This device has no site coordinates — set the site location first." }, { status: 400 });
    }

    // Keep the whole route inside the current UTC day so Playback groups it under
    // one date. End the route near "now"; start it one window earlier.
    const now = Date.now();
    const midnight = new Date(now); midnight.setUTCHours(0, 0, 0, 0);
    const built0 = buildCriticalRoute({ imei, lat: base.lat, lng: base.lng, start: new Date(now), paceSec, stepSec });
    const windowMs = built0.count * stepSec * 1000;
    const startMs = Math.max(now - windowMs, midnight.getTime() + 60 * 1000);
    const routeDate = new Date(startMs).toISOString().slice(0, 10);

    const { packets, count, eventOffsets, order } = buildCriticalRoute({
      imei, lat: base.lat, lng: base.lng, start: new Date(startMs), paceSec, stepSec,
    });

    const alarmsRaised = new Set();
    let stored = 0;
    for (const raw of packets) {
      const { frames } = extractFrames(raw);
      for (const f of frames) {
        let rec; try { rec = parseFrame(f); } catch { continue; }
        try {
          const { view } = await resolveAndStore(rec, "sim-critical", 0);
          stored += 1;
          (view?.alarms || []).forEach((a) => alarmsRaised.add(a.type));
        } catch { /* skip a bad packet, keep going */ }
      }
    }

    // Pace the alarms' timestamps to the procedure (Disturbance → Geofence →
    // Critical), so the lifecycle log + playback incidents read in the right order.
    if (deviceId) {
      for (const type of order) {
        const at = new Date(startMs + (eventOffsets[type] || 0) * 1000).toISOString();
        try {
          await query(
            `UPDATE alarms SET created_at = $3
              WHERE device_id = $1 AND alarm_type = $2 AND status <> 'Closed'`,
            [deviceId, type, at]
          );
        } catch (e) { console.error("[simulate-critical] repace:", type, e?.message || e); }
      }
    }

    // Response procedure: log a field response on the most severe critical alarm.
    let responseOn = null;
    if (deviceId) {
      for (const type of ["CRITICAL_MOTION", "GEOFENCE_EXIT", "DISTURBANCE"]) {
        try {
          const { rows } = await query(
            `SELECT id FROM alarms WHERE device_id = $1 AND alarm_type = $2 AND status <> 'Closed'
              ORDER BY created_at DESC LIMIT 1`, [deviceId, type]
          );
          if (rows[0]) {
            await recordResponse(rows[0].id, { by: "Rapid Response Team", teamCode: "RRT", teamName: "Rapid Response Team" });
            responseOn = rows[0].id; break;
          }
        } catch (e) { console.error("[simulate-critical] response:", e?.message || e); }
      }
    }

    return NextResponse.json({
      ok: true,
      device_id: deviceId,
      imei,
      date: routeDate,
      points: count,
      stored,
      pace_seconds: paceSec,
      procedure: order,
      alarms: Array.from(alarmsRaised),
      response_on: responseOn,
    });
  } catch (err) {
    console.error("[simulate-critical] error", err);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
