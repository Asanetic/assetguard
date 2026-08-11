// app/api/apiUtils/ingest/portManager.js
// -----------------------------------------------------------------------------
// Official multi-port TCP listener manager. Each managed port binds its own TCP
// server; every port runs the same GL-28 pipeline (parse -> device_telemetry ->
// alarms) and logs each raw frame (tagged with the port + device) to raw_logs.
//
// The DB table `listener_ports` holds the desired config (port, device model,
// enabled). This module owns the live sockets. `syncFromDb()` reopens enabled
// ports after a restart. TCP only.
// -----------------------------------------------------------------------------
import net from "net";
import { insertRawLog } from "../dataControl/rawLogs.js";
import { listPorts, setPortEnabled } from "../dataControl/listenerPorts.js";
import { extractFrames, parseFrame } from "./parse.js";
import { resolveAndStore } from "./store.js";

function S() {
  if (!globalThis.__agPortMgr) globalThis.__agPortMgr = { ports: new Map() };
  return globalThis.__agPortMgr;
}
function portState(port) {
  const s = S();
  let p = s.ports.get(port);
  if (!p) {
    p = { server: null, status: "closed", startedAt: null, lastError: null,
          conns: new Map(), connSeq: 0, packets: 0, bytesIn: 0, bytesOut: 0, errors: 0, lastFrameAt: null };
    s.ports.set(port, p);
  }
  return p;
}

function sniffImei(text) { const m = String(text).match(/\[[^*\]]+\*(\d{6,})\*/); return m ? m[1] : null; }

// Interpret complete frames for a connection: raw-log each, reply to LK, store telemetry.
async function ingest(conn, p, port) {
  const { frames, rest } = extractFrames(conn.buf || "");
  conn.buf = rest.length > 8192 ? "" : rest;
  for (const f of frames) {
    p.packets += 1; p.lastFrameAt = new Date().toISOString();
    let rec;
    try { rec = parseFrame(f); } catch { p.errors += 1; continue; }
    if (rec.imei) conn.imei = rec.imei;
    // raw log — one row per frame, tagged with port + device
    insertRawLog({ dir: "in", ip: conn.ip, srcPort: conn.port, port, device: rec.imei || conn.imei || null, data: f, bytes: f.length }).catch(() => {});
    if (rec.cmd === "LK") {
      try { const ack = `[${rec.prefix}*${rec.imei}*0002*LK]`; conn.socket.write(Buffer.from(ack, "latin1")); } catch {}
      continue;
    }
    try { await resolveAndStore(rec, conn.ip, conn.port); } catch { p.errors += 1; }
  }
}

export function openPort(port) {
  port = Number(port);
  const p = portState(port);
  return new Promise((resolve) => {
    if (p.server && p.status !== "closed" && p.status !== "error") return resolve({ ok: true, already: true, port });
    const server = net.createServer((socket) => {
      socket.setEncoding("latin1");
      p.connSeq += 1;
      const conn = { id: p.connSeq, socket, ip: socket.remoteAddress, port: socket.remotePort, imei: null, buf: "", connectedAt: new Date().toISOString(), bytesIn: 0 };
      p.conns.set(conn.id, conn);
      socket.on("data", (chunk) => {
        conn.buf += chunk; conn.bytesIn += chunk.length; p.bytesIn += chunk.length;
        ingest(conn, p, port).catch(() => {});
      });
      socket.on("close", () => p.conns.delete(conn.id));
      socket.on("error", () => { p.errors += 1; p.conns.delete(conn.id); });
    });
    server.on("error", (err) => {
      p.status = "error"; p.lastError = String(err?.message || err); p.server = null;
      resolve({ ok: false, error: p.lastError, port });
    });
    server.listen(port, "0.0.0.0", () => {
      p.server = server; p.status = "listening"; p.startedAt = new Date().toISOString(); p.lastError = null;
      console.log(`[ports] opened :${port}`);
      resolve({ ok: true, port });
    });
  });
}

export function closePort(port) {
  port = Number(port);
  const p = portState(port);
  return new Promise((resolve) => {
    for (const c of p.conns.values()) { try { c.socket.destroy(); } catch {} }
    p.conns.clear();
    if (!p.server) { p.status = "closed"; return resolve({ ok: true, port }); }
    p.server.close(() => { p.server = null; p.status = "closed"; console.log(`[ports] closed :${port}`); resolve({ ok: true, port }); });
  });
}

// Runtime state for a port (merged with DB config by the API).
export function portRuntime(port) {
  const p = portState(Number(port));
  const bound = !!p.server && p.status === "listening";
  const recent = p.lastFrameAt && (Date.now() - new Date(p.lastFrameAt).getTime() < 30_000);
  const state = !bound ? (p.status === "error" ? "error" : "closed") : (recent || p.conns.size > 0 ? "open" : "listening");
  return { state, bound, error: p.lastError, conns: p.conns.size, messages: p.packets, bytesIn: p.bytesIn, lastFrameAt: p.lastFrameAt, startedAt: p.startedAt };
}

// Live totals across all managed ports (for the stats bar).
export function getTotals() {
  const s = S();
  let activeConnections = 0, parseErrors = 0, messagesSession = 0, bytesInSession = 0;
  for (const p of s.ports.values()) {
    activeConnections += p.conns.size; parseErrors += p.errors;
    messagesSession += p.packets; bytesInSession += p.bytesIn;
  }
  return { activeConnections, parseErrors, messagesSession, bytesInSession };
}

// Reopen any DB-enabled ports that aren't currently bound (restart persistence).
export async function syncFromDb() {
  let rows = [];
  try { rows = await listPorts(); } catch { return; }
  for (const r of rows) {
    if (r.enabled) {
      const p = portState(Number(r.port));
      if (!(p.server && p.status === "listening")) { try { await openPort(r.port); } catch {} }
    }
  }
}

// Open + mark enabled / Close + mark disabled (persist desired state).
export async function open(port) { const r = await openPort(port); if (r.ok) { try { await setPortEnabled(port, true); } catch {} } return r; }
export async function close(port) { const r = await closePort(port); try { await setPortEnabled(port, false); } catch {} return r; }
