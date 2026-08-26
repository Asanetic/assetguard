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
import { insertParseError } from "../dataControl/parseErrors.js";
import { onWake as cmdOnWake, onReply as cmdOnReply } from "./commandRunner.js";

// Commands the platform must acknowledge back to the terminal. The ACK echoes
// only the command word: [PREFIX*IMEI*LEN*CMD], LEN = hex byte-length of CMD.
//   position UD → [3G*IMEI*0002*UD]   ICCID CCID → [3G*IMEI*0004*CCID]
//   heartbeat LK → [3G*IMEI*0002*LK]  alarm AL → [3G*IMEI*0002*AL]
const ACK_CMDS = new Set(["UD", "UD2", "AL", "LK", "CCID"]);
function ackFrame(prefix, imei, cmd) {
  const len = Buffer.byteLength(cmd, "latin1").toString(16).toUpperCase().padStart(4, "0");
  return `[${prefix || "3G"}*${imei}*${len}*${cmd}]`;
}

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

    // HQ text frames (e.g. command replies "*HQ,IMEI,V4,UPGRADE#") are NOT the
    // bracketed telemetry format. Raw-log them so they show in Raw port data as
    // the device's reply, and move on — don't run them through the GL parser.
    if (f[0] === "*") {
      const m = f.match(/^\*[^,]*,(\d{6,})/);        // *HQ,<imei>,...
      const dev = (m && m[1]) || conn.imei || null;
      insertRawLog({ dir: "in", ip: conn.ip, srcPort: conn.port, port, device: dev, data: f, bytes: f.length }).catch(() => {});
      // A command reply (e.g. "*HQ,IMEI,V4,UPGRADE#") ACKs a queued downlink job.
      if (dev) { try { await cmdOnReply({ imei: dev, replyText: f }); } catch {} }
      continue;
    }

    let rec;
    try { rec = parseFrame(f); }
    catch (e) {
      p.errors += 1;
      insertParseError({ port, ip: conn.ip, srcPort: conn.port, device: conn.imei || null, data: f, error: e?.message || String(e) }).catch(() => {});
      continue;
    }
    if (rec.imei) conn.imei = rec.imei;
    if (rec.prefix) conn.prefix = rec.prefix;
    // raw log — one row per frame, tagged with port + device
    insertRawLog({ dir: "in", ip: conn.ip, srcPort: conn.port, port, device: rec.imei || conn.imei || null, data: f, bytes: f.length }).catch(() => {});

    // Platform ACK — the terminal expects an acknowledgement for these frames
    // (position UD most of all). Echo the command word; also raw-log it (dir out)
    // so the reply is visible in Raw port data.
    if (rec.imei && ACK_CMDS.has(rec.cmd)) {
      try {
        const ack = ackFrame(rec.prefix, rec.imei, rec.cmd);
        conn.socket.write(Buffer.from(ack, "latin1"));
        p.bytesOut = (p.bytesOut || 0) + ack.length;
        insertRawLog({ dir: "out", ip: conn.ip, srcPort: conn.port, port, device: rec.imei, data: ack, bytes: ack.length }).catch(() => {});
      } catch {}
    }

    // Device just woke — drain any queued downlink (firmware/command) for it.
    // send() writes to this device's live socket and raw-logs the frame (dir out).
    if (rec.imei && rec.cmd !== "CCID") {
      const send = (frame) => {
        try {
          conn.socket.write(Buffer.from(frame, "latin1"));
          p.bytesOut = (p.bytesOut || 0) + frame.length;
          insertRawLog({ dir: "out", ip: conn.ip, srcPort: conn.port, port, device: rec.imei, data: frame, bytes: frame.length }).catch(() => {});
          console.log(`[cmd] -> ${rec.imei} @:${port}  ${frame}`);
          return true;
        } catch { return false; }
      };
      try { await cmdOnWake({ imei: rec.imei, cmd: rec.cmd, send }); } catch {}
    }

    // LK (heartbeat) and CCID (ICCID) carry nothing to store — the ACK is enough.
    if (rec.cmd === "LK" || rec.cmd === "CCID") continue;
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
      // Detect dead peers: TCP keepalive probes after 60s idle, and an
      // application idle timeout that reaps a socket with no data for IDLE_MS so
      // "live sockets" reflects reality instead of counting ghost connections.
      try { socket.setKeepAlive(true, 60_000); } catch {}
      const IDLE_MS = Number(process.env.INGEST_IDLE_MS) || 11 * 60_000; // trackers report far more often than this
      try {
        socket.setTimeout(IDLE_MS, () => {
          console.log(`[ports] idle timeout :${port} ${socket.remoteAddress} — closing stale socket`);
          try { socket.destroy(); } catch {}
        });
      } catch {}
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

// ---- downlink control -----------------------------------------------------
// Every device that is currently connected (across all managed ports), so the UI
// / API can pick one to command.
export function listConnectedDevices() {
  const s = S(); const out = [];
  for (const [port, p] of s.ports.entries())
    for (const conn of p.conns.values())
      if (conn.imei) out.push({ imei: conn.imei, port, ip: conn.ip, since: conn.connectedAt });
  return out;
}

// Push a downlink to a connected device by IMEI (or "ALL") over its OPEN socket —
// the device keeps streaming; this writes back whenever you call it.
//   wrap=false (default) -> the bare command bytes, e.g. "upgrade#"
//   wrap=true            -> the GL-28 frame [3G*IMEI*LEN*upgrade#]
export function sendToDevice(imei, cmd, { wrap = false } = {}) {
  const s = S();
  const all = String(imei).toUpperCase() === "ALL";
  const results = [];
  for (const [port, p] of s.ports.entries()) {
    for (const conn of p.conns.values()) {
      if (!conn.imei || (!all && conn.imei !== imei)) continue;
      const payload = wrap
        ? `[${conn.prefix || "3G"}*${conn.imei}*${Buffer.byteLength(cmd, "latin1").toString(16).toUpperCase().padStart(4, "0")}*${cmd}]`
        : cmd;
      try {
        conn.socket.write(Buffer.from(payload, "latin1"));
        p.bytesOut = (p.bytesOut || 0) + payload.length;
        console.log(`[ports] -> ${conn.imei} @:${port}  ${payload}`);
        results.push({ imei: conn.imei, port, ok: true, sent: payload });
      } catch (e) {
        results.push({ imei: conn.imei, port, ok: false, error: e.message });
      }
    }
  }
  return { targets: results.length, sent: results.filter((r) => r.ok).length, results };
}
