// app/api/apiUtils/ingest/listener.js
// -----------------------------------------------------------------------------
// In-process TCP listener the admin can OPEN / CLOSE from a route.
//
// RAW PASSTHROUGH: for now we do NOT parse or resolve device/site. Every chunk
// received is captured verbatim and shown in the live feed. Bidirectional —
// you can send data back to any connected tracker, and optionally auto-ACK
// every inbound packet.
//
// On a VPS (a long-lived `next start` process) this module singleton owns the
// socket server for the app's life. For clustered deploys, run the standalone
// `ingest/server.js` instead.
// -----------------------------------------------------------------------------
import net from "net";
import { insertRawLog } from "../dataControl/rawLogs.js";

const MAX_BUFFER = 800; // recent raw entries kept in memory for the live UI

function S() {
  if (!globalThis.__agIngest) {
    globalThis.__agIngest = {
      server: null, port: null, status: "stopped", startedAt: null, lastError: null,
      packets: 0, bytesIn: 0, bytesOut: 0, errors: 0,
      conns: new Map(), connSeq: 0, buffer: [], seq: 0,
      autoAck: { enabled: false, text: "" },
    };
  }
  return globalThis.__agIngest;
}

function push(entry) {
  const s = S();
  s.seq += 1;
  const row = { id: s.seq, at: new Date().toISOString(), ...entry };
  s.buffer.push(row);
  if (s.buffer.length > MAX_BUFFER) s.buffer.splice(0, s.buffer.length - MAX_BUFFER);
  // best-effort persistence (works only once db/raw_logs.sql has been run)
  if (entry.dir === "in" || entry.dir === "out") {
    insertRawLog({ dir: entry.dir, ip: entry.ip, port: entry.port, data: entry.data, bytes: entry.bytes })
      .catch(() => {});
  }
  return row;
}

export function getStatus() {
  const s = S();
  return {
    status: s.status, port: s.port, startedAt: s.startedAt, lastError: s.lastError,
    packets: s.packets, bytesIn: s.bytesIn, bytesOut: s.bytesOut, errors: s.errors,
    connectionCount: s.conns.size,
    connections: [...s.conns.values()].map((c) => ({
      id: c.id, ip: c.ip, port: c.port, connectedAt: c.connectedAt,
      bytesIn: c.bytesIn, bytesOut: c.bytesOut, lastSeen: c.lastSeen,
    })),
    autoAck: s.autoAck,
  };
}

export function getRecent(sinceId = 0, limit = 300) {
  const s = S();
  return s.buffer.filter((x) => x.id > sinceId).slice(-limit);
}

export function startListener(port = 9000) {
  const s = S();
  return new Promise((resolve) => {
    if (s.server && s.status === "listening") {
      return resolve({ ok: true, already: true, ...getStatus() });
    }
    const server = net.createServer((socket) => {
      s.connSeq += 1;
      const id = s.connSeq;
      const ip = socket.remoteAddress, port2 = socket.remotePort;
      const conn = {
        id, socket, ip, port: port2, connectedAt: new Date().toISOString(),
        bytesIn: 0, bytesOut: 0, lastSeen: null,
      };
      s.conns.set(id, conn);
      push({ dir: "sys", connId: id, ip, port: port2, data: "connected", bytes: 0 });

      socket.on("data", (chunk) => {
        const text = chunk.toString("latin1");
        conn.bytesIn += chunk.length; conn.lastSeen = new Date().toISOString();
        s.bytesIn += chunk.length; s.packets += 1;
        push({ dir: "in", connId: id, ip, port: port2, data: text, bytes: chunk.length });
        // optional auto-ACK: reply to every inbound packet
        if (s.autoAck.enabled && s.autoAck.text) {
          try {
            socket.write(Buffer.from(s.autoAck.text, "latin1"));
            const b = Buffer.byteLength(s.autoAck.text, "latin1");
            conn.bytesOut += b; s.bytesOut += b;
            push({ dir: "out", connId: id, ip, port: port2, data: s.autoAck.text, bytes: b });
          } catch {}
        }
      });
      socket.on("close", () => {
        s.conns.delete(id);
        push({ dir: "sys", connId: id, ip, port: port2, data: "disconnected", bytes: 0 });
      });
      socket.on("error", () => { s.errors += 1; s.conns.delete(id); });
    });
    server.on("error", (err) => {
      s.status = "error"; s.lastError = String(err && err.message ? err.message : err);
      s.server = null;
      resolve({ ok: false, error: s.lastError, ...getStatus() });
    });
    server.listen(port, "0.0.0.0", () => {
      s.server = server; s.port = port; s.status = "listening";
      s.startedAt = new Date().toISOString(); s.lastError = null;
      resolve({ ok: true, ...getStatus() });
    });
  });
}

export function stopListener() {
  const s = S();
  return new Promise((resolve) => {
    if (!s.server) { s.status = "stopped"; s.port = null; return resolve({ ok: true, ...getStatus() }); }
    for (const c of s.conns.values()) { try { c.socket.destroy(); } catch {} }
    s.conns.clear();
    s.server.close(() => {
      s.server = null; s.status = "stopped"; s.port = null;
      resolve({ ok: true, ...getStatus() });
    });
  });
}

// Send bytes to one connection (or broadcast to all if connId is null/0).
// isHex=true interprets `data` as a hex string (for binary protocols).
export function sendData(connId, data, isHex = false) {
  const s = S();
  let payload;
  try {
    payload = isHex
      ? Buffer.from(String(data).replace(/[^0-9a-fA-F]/g, ""), "hex")
      : Buffer.from(String(data), "latin1");
  } catch { return { ok: false, error: "Bad payload" }; }
  if (!payload || !payload.length) return { ok: false, error: "Nothing to send" };

  const targets = connId ? [s.conns.get(Number(connId))].filter(Boolean) : [...s.conns.values()];
  if (!targets.length) return { ok: false, error: "No matching connection" };

  let sent = 0;
  for (const c of targets) {
    try {
      c.socket.write(payload);
      c.bytesOut += payload.length; s.bytesOut += payload.length;
      push({ dir: "out", connId: c.id, ip: c.ip, port: c.port,
             data: isHex ? payload.toString("hex") : String(data), bytes: payload.length });
      sent += 1;
    } catch {}
  }
  return { ok: sent > 0, sent, ...getStatus() };
}

export function setAutoAck({ enabled, text }) {
  const s = S();
  s.autoAck = { enabled: !!enabled, text: text != null ? String(text) : s.autoAck.text };
  return s.autoAck;
}

// Simulate an inbound raw packet (no socket) — for the UI tester.
export function injectTest(raw) {
  const s = S();
  const text = String(raw || "");
  s.packets += 1; s.bytesIn += Buffer.byteLength(text, "latin1");
  const row = push({ dir: "in", connId: 0, ip: "test", port: 0, data: text, bytes: Buffer.byteLength(text, "latin1") });
  return [row];
}
