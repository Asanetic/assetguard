// app/api/mainapp/ingest/sim-frame/route.js
// POST /api/mainapp/ingest/sim-frame  (admin)
// Send ONE GL-28 frame over the real TCP listener port — for the simulator's
// manual step-through (fire one data packet per click). The FRAME CONTENT (speed,
// motion byte, position) decides what alarm the engine raises, exactly like a real
// device. `reset:true` starts a clean scenario: it restarts the device's engine
// state (so the 4th-packet disturbance debounce restarts) and closes prior open
// sim alarms so you get one of each.
// Body: { imei, lat, lng, speed, motionByte?, battery?, reset?, host?, port? }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import net from "net";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { query } from "../../../apiUtils/s_env/db.js";
import { buildUD } from "../../../apiUtils/ingest/simPackets.js";
import { resetAllMotion, setIncidentCutoff } from "../../../apiUtils/ingest/store.js";
import { listPorts } from "../../../apiUtils/dataControl/listenerPorts.js";
import { syncFromDb, portRuntime } from "../../../apiUtils/ingest/portManager.js";

function sendOne(frame, host, port) {
  return new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done) { done = true; try { sock.destroy(); } catch {} resolve(r); } };
    const sock = net.createConnection({ host, port }, () => {
      try { sock.write(Buffer.from(frame, "latin1")); } catch {}
      setTimeout(() => finish({ ok: true }), 500);   // let the listener parse + store it
    });
    sock.setTimeout(8000);
    sock.on("timeout", () => finish({ ok: true }));
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

  // Reset-only: clear the engine counters for this device NOW (no frame sent), so a
  // fresh run's disturbance debounce starts at zero and only raises on the 4th packet.
  // Called by the simulator's "Restart" so "from reset" always means from zero.
  if (body.resetOnly) {
    try {
      let deviceRowId = null;
      try {
        const { rows } = await query(`SELECT id FROM devices WHERE imei = $1 OR device_id = $1 LIMIT 1`, [imei]);
        if (rows[0]) deviceRowId = rows[0].id;
      } catch {}
      resetAllMotion();
      const cut = Date.now() - 2000;
      if (deviceRowId != null) setIncidentCutoff(deviceRowId, cut);
      setIncidentCutoff(`imei:${imei}`, cut);
      return NextResponse.json({ ok: true, reset: true });
    } catch (err) {
      console.error("[sim-frame reset] error", err);
      return NextResponse.json({ error: "Reset failed" }, { status: 500 });
    }
  }
  // Either send an edited raw frame verbatim, or build one from lat/lng/speed/etc.
  const raw = typeof body.raw === "string" && body.raw.trim() ? body.raw.trim() : null;
  if (!raw && (body.lat == null || body.lng == null)) return NextResponse.json({ error: "lat/lng (or a raw frame) required" }, { status: 400 });

  const host = String(body.host || "127.0.0.1");

  try {
    // resolve device (for reset + clearing prior alarms)
    let deviceId = null, deviceRowId = null;
    try {
      const { rows } = await query(
        `SELECT id, device_id FROM devices WHERE imei = $1 OR device_id = $1 LIMIT 1`, [imei]
      );
      if (rows[0]) { deviceRowId = rows[0].id; deviceId = rows[0].device_id; }
    } catch {}

    // pick an enabled managed listener port
    try { await syncFromDb(); } catch {}
    let port = Number(body.port) || 0;
    if (!port) {
      let ports = [];
      try { ports = await listPorts(); } catch {}
      const enabled = ports.filter((p) => p.enabled);
      port = (enabled[0] && enabled[0].port) || (ports[0] && ports[0].port) || 0;
    }
    if (!port) return NextResponse.json({ error: "No listener port configured. Add + enable a port under Devices → Listener ports." }, { status: 400 });
    const rt = portRuntime(port);
    if (rt && rt.bound === false) return NextResponse.json({ error: `Listener port ${port} isn't open (state: ${rt.state}). Enable it under Devices → Listener ports.` }, { status: 400 });

    // fresh scenario? clear engine counters ONLY (so the disturbance debounce starts
    // at zero) and set an incident cutoff so the next Disturbance opens a NEW episode.
    // We never change alarm state — humans acknowledge/close alarms.
    if (body.reset) {
      resetAllMotion();
      const cut = Date.now() - 2000;   // just before this run's frames
      if (deviceRowId != null) setIncidentCutoff(deviceRowId, cut);
      setIncidentCutoff(`imei:${imei}`, cut);
    }

    // Use the edited raw frame as-is, or build one from the fields. (The parser
    // ignores the hex length field, so editing values by hand is safe even if the
    // LEN no longer matches.)
    const frame = raw || buildUD({
      imei,
      lat: Number(body.lat), lng: Number(body.lng),
      speed: body.speed != null ? Number(body.speed) : 0,
      battery: body.battery != null ? Number(body.battery) : 88,
      motionByte: body.motionByte || "00100008",
      fix: "A",
      mems: { valid: true, x: 20, y: -12, z: 1010, roll: 0.4, pitch: 0.9, temp: 30 },
    });

    const tx = await sendOne(frame, host, port);
    if (!tx.ok) return NextResponse.json({ error: tx.error }, { status: 502 });

    return NextResponse.json({ ok: true, port, device_id: deviceId, frame });
  } catch (err) {
    console.error("[sim-frame] error", err);
    return NextResponse.json({ error: "Send failed" }, { status: 500 });
  }
}
