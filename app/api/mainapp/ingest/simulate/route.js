// app/api/mainapp/ingest/simulate/route.js
// POST /api/mainapp/ingest/simulate
// Drives the Device Simulator UI. A browser can't open a raw TCP socket, so the
// server does it: it builds GL-28 packet(s) and either
//   mode "tcp"    -> connects to the running listener (host:port) and writes them,
//                    exactly like a physical device (default), or
//   mode "inject" -> feeds them straight through parse -> store (no listener needed).
//
// Body: {
//   imei, mode?, host?, port?,
//   kind: "scenario" | "custom" | "raw",
//   scenario?, custom?: {lat,lng,speed,battery,motionByte,fix,mems{...}},
//   raw?: string, lat?, lng?            // lat/lng = the device's site base
// }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import net from "net";
import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { buildUD, scenarioPackets } from "../../../apiUtils/ingest/simPackets.js";
import { extractFrames, parseFrame } from "../../../apiUtils/ingest/parse.js";
import { resolveAndStore } from "../../../apiUtils/ingest/store.js";

function buildPackets(body) {
  const { imei, kind, scenario, custom, raw, lat, lng } = body;
  if (kind === "raw") {
    const text = String(raw || "").trim();
    return text ? [text] : [];
  }
  if (kind === "custom") {
    const c = custom || {};
    return [buildUD({
      imei,
      lat: c.lat === "" || c.lat == null ? null : Number(c.lat),
      lng: c.lng === "" || c.lng == null ? null : Number(c.lng),
      speed: c.speed != null ? Number(c.speed) : 0,
      battery: c.battery != null ? Number(c.battery) : 90,
      motionByte: c.motionByte || "00000000",
      fix: c.fix || "A",
      mems: c.mems && c.mems.enabled === false ? null : {
        valid: c.mems?.valid !== false,
        x: Number(c.mems?.x ?? 20), y: Number(c.mems?.y ?? -12), z: Number(c.mems?.z ?? 1010),
        roll: Number(c.mems?.roll ?? 0.4), pitch: Number(c.mems?.pitch ?? 0.9),
        temp: Number(c.mems?.temp ?? 30.0),
      },
    })];
  }
  return scenarioPackets(scenario || "normal", { imei, lat, lng });
}

// Send packets over one TCP connection to the listener; collect any reply bytes.
function sendOverTcp(packets, host, port) {
  return new Promise((resolve) => {
    const received = [];
    let done = false;
    const finish = (result) => { if (!done) { done = true; try { sock.destroy(); } catch {} resolve(result); } };
    const sock = net.createConnection({ host, port }, () => {
      for (const p of packets) { try { sock.write(p); } catch {} }
      // give the listener a moment to ACK, then close
      setTimeout(() => finish({ ok: true, sent: packets, received }), 600);
    });
    sock.setTimeout(4000);
    sock.on("data", (d) => received.push(d.toString("latin1")));
    sock.on("timeout", () => finish({ ok: true, sent: packets, received }));
    sock.on("error", (e) => finish({ ok: false, error: `Could not reach listener at ${host}:${port} — is ingest/server.js running? (${e.code || e.message})`, sent: [] }));
  });
}

// Inject directly through the parser + store (bypasses TCP entirely).
async function inject(packets, ip) {
  const results = [];
  for (const raw of packets) {
    const { frames } = extractFrames(raw);
    for (const f of frames) {
      let rec; try { rec = parseFrame(f); } catch { continue; }
      try {
        const { view } = await resolveAndStore(rec, ip || "sim", 0);
        results.push({ imei: rec.imei, cmd: rec.cmd, alarms: (view?.alarms || []).map((a) => a.type), unknown: !!view?.unknown });
      } catch (e) { results.push({ error: String(e?.message || e) }); }
    }
  }
  return results;
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  if (!body.imei && body.kind !== "raw") return NextResponse.json({ error: "Pick a device / IMEI first" }, { status: 400 });

  const packets = buildPackets(body);
  if (!packets.length) return NextResponse.json({ error: "Nothing to send" }, { status: 400 });

  const mode = body.mode === "inject" ? "inject" : "tcp";
  try {
    if (mode === "inject") {
      const results = await inject(packets, request.headers.get("x-forwarded-for") || "sim");
      return NextResponse.json({ ok: true, mode, sent: packets, results });
    }
    const host = String(body.host || "127.0.0.1");
    const port = Number(body.port) || 9000;
    const r = await sendOverTcp(packets, host, port);
    return NextResponse.json({ mode, ...r });
  } catch (err) {
    console.error("[simulate] error", err);
    return NextResponse.json({ error: "Simulation failed" }, { status: 500 });
  }
}
