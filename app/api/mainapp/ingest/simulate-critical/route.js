// app/api/mainapp/ingest/simulate-critical/route.js
// POST /api/mainapp/ingest/simulate-critical  (admin)
// One-click "critical-alarms procedure" simulation. Builds real GL-28 3G frames and
// sends them over a REAL TCP connection to a managed listener port — exactly like a
// physical tracker — so the frames flow through the same parse -> device_telemetry
// -> alarms pipeline (and raw_logs). NOT injected. Walks the procedure in order,
// Disturbance -> Geofence -> Critical Motion (~2 min apart), then logs a Response.
// Body: { imei, deviceId?, lat?, lng?, paceSec?, stepSec?, host?, port? }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import net from "net";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { query } from "../../../apiUtils/s_env/db.js";
import { buildCriticalRoute } from "../../../apiUtils/ingest/simRoute.js";
import { resetAllMotion, setIncidentCutoff } from "../../../apiUtils/ingest/store.js";
import { listPorts } from "../../../apiUtils/dataControl/listenerPorts.js";
import { syncFromDb, portRuntime } from "../../../apiUtils/ingest/portManager.js";

// Stream the frames over ONE TCP connection to the listener, like a real device
// dialing in. The listener buffers + extracts complete [...] frames itself, so a
// small gap between writes is enough to keep them clean.
function sendOverTcp(packets, host, port, gapMs = 25) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; try { sock.destroy(); } catch {} resolve(r); } };
    const sock = net.createConnection({ host, port }, async () => {
      for (const p of packets) {
        try { sock.write(Buffer.from(p, "latin1")); } catch {}
        await new Promise((r) => setTimeout(r, gapMs));
      }
      // give the listener a moment to finish parsing/storing the last frames
      setTimeout(() => finish({ ok: true, sent: packets.length }), 1200);
    });
    sock.setTimeout(120000);
    sock.on("timeout", () => finish({ ok: true, sent: packets.length }));
    sock.on("error", (e) => finish({ ok: false, error: `Could not reach the listener at ${host}:${port} — is the port enabled/open? (${e.code || e.message})` }));
  });
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const imei = String(body.imei || "").trim();
  if (!imei) return NextResponse.json({ error: "Pick a device / IMEI first" }, { status: 400 });

  const paceSec = Math.min(600, Math.max(30, Number(body.paceSec) || 120));       // 2 min default
  const coarseStepSec = Math.min(60, Math.max(5, Number(body.coarseStepSec) || 20));
  const fastStepSec = Math.min(30, Math.max(1, Number(body.fastStepSec) || 3));    // 3 s streaming
  const fastMinutes = Math.min(30, Math.max(1, Number(body.fastMinutes) || 5));    // for 5 minutes
  const host = String(body.host || "127.0.0.1");
  const buildOpts = { paceSec, coarseStepSec, fastStepSec, fastMinutes };

  try {
    // Resolve the device's id + SITE coordinates (route/alarm origin).
    let deviceId = body.deviceId || null;
    let deviceRowId = null;
    let base = { lat: body.lat != null ? Number(body.lat) : null, lng: body.lng != null ? Number(body.lng) : null };
    try {
      const { rows } = await query(
        `SELECT d.id, d.device_id, s.lat, s.lng FROM devices d LEFT JOIN sites s ON s.id = d.site_id
          WHERE d.imei = $1 OR d.device_id = $1 LIMIT 1`, [imei]
      );
      if (rows[0]) {
        deviceRowId = rows[0].id;
        deviceId = rows[0].device_id || deviceId;
        if (rows[0].lat != null) base = { lat: Number(rows[0].lat), lng: Number(rows[0].lng) };
      }
    } catch { /* fall back to client coords */ }
    if (base.lat == null || base.lng == null) {
      return NextResponse.json({ error: "This device has no site coordinates — set the site location first." }, { status: 400 });
    }

    // Make sure the managed listener ports are open in this process, then pick the
    // target port (an ENABLED listener_ports entry — a REAL port a device would use).
    try { await syncFromDb(); } catch {}
    let port = Number(body.port) || 0;
    let ports = [];
    try { ports = await listPorts(); } catch {}
    const enabled = ports.filter((p) => p.enabled);
    if (!port) port = (enabled[0] && enabled[0].port) || (ports[0] && ports[0].port) || 0;
    if (!port) {
      return NextResponse.json({ error: "No listener port configured. Add + enable a port under Devices → Listener ports first." }, { status: 400 });
    }
    // is that port actually bound/listening right now?
    const rt = portRuntime(port);
    if (rt && rt.bound === false) {
      return NextResponse.json({ error: `Listener port ${port} isn't open (state: ${rt.state}). Enable it under Devices → Listener ports.` }, { status: 400 });
    }

    // Keep the whole route inside the current UTC day so Playback groups it under
    // one date. End the route near "now"; start it one window earlier.
    const now = Date.now();
    const midnight = new Date(now); midnight.setUTCHours(0, 0, 0, 0);
    const built0 = buildCriticalRoute({ imei, lat: base.lat, lng: base.lng, start: new Date(now), ...buildOpts });
    const windowMs = built0.totalSec * 1000;
    const startMs = Math.max(now - windowMs, midnight.getTime() + 60 * 1000);
    const routeDate = new Date(startMs).toISOString().slice(0, 10);

    const { packets, count, totalSec, tDisturb, tGeofence, tCritical, order } = buildCriticalRoute({
      imei, lat: base.lat, lng: base.lng, start: new Date(startMs), ...buildOpts,
    });

    // Fresh run: restart the engine's per-device counters so the 4th-packet
    // disturbance debounce starts from zero, and set an incident cutoff just before
    // this run's (back-dated) data so it opens a NEW episode. We do NOT touch alarm
    // state — the system never acknowledges/closes alarms; humans do.
    resetAllMotion();
    const cut = startMs - 1000;
    if (deviceRowId != null) setIncidentCutoff(deviceRowId, cut);
    setIncidentCutoff(`imei:${imei}`, cut);

    // Send the frames over the real TCP port (like a device).
    const tx = await sendOverTcp(packets, host, port);
    if (!tx.ok) return NextResponse.json({ error: tx.error }, { status: 502 });

    // Let the listener finish storing everything before we touch the DB.
    await new Promise((r) => setTimeout(r, 800));

    // NB: alarm times come from each packet's own deviceTime (set in insertLiveAlarm),
    // so the Disturbance lands on its 4th packet, Geofence on exit, Critical on the
    // spike. The system does NOT acknowledge, respond to, or close alarms — every
    // such action is left to human users.

    // Which alarms actually landed (read back from the DB the listener wrote to).
    let landed = [];
    if (deviceId) {
      try {
        const { rows } = await query(
          `SELECT DISTINCT alarm_type FROM alarms WHERE device_id = $1 AND status <> 'Closed'
             AND alarm_type = ANY($2)`, [deviceId, order]
        );
        landed = rows.map((r) => r.alarm_type);
      } catch {}
    }

    return NextResponse.json({
      ok: true,
      transport: "tcp",
      host, port,
      device_id: deviceId,
      imei,
      date: routeDate,
      points: count,
      sent: tx.sent,
      pace_seconds: paceSec,
      fast_step_seconds: fastStepSec,
      fast_minutes: fastMinutes,
      event_offsets: { DISTURBANCE: tDisturb, GEOFENCE_EXIT: tGeofence, CRITICAL_MOTION: tCritical },
      procedure: order,
      alarms: landed,
    });
  } catch (err) {
    console.error("[simulate-critical] error", err);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
