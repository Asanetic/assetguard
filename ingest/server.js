// ingest/server.js — standalone tracker ingest listener (production option).
// Runs as its own process, sharing the same Postgres DB as the web app.
//   Requires DATABASE_URL (and PGSSL) in the environment.
//   Start:  node ingest/server.js                 (port defaults to 9000)
//           INGEST_PORT=9000 node ingest/server.js
// Full pipeline: TCP frame -> GL-28 parse -> device_telemetry -> alarm engine
// -> alarms. Uses the SAME parser + resolver as the in-app listener.
//
// Downlink control: the device holds the TCP connection open and streams, so we
// keep a live registry of connected devices (by IMEI) and expose a small LOCAL
// HTTP control endpoint (127.0.0.1 only) so YOU decide exactly when to push a
// command to a device — it is NOT auto-sent. Examples (run on the VPS):
//   curl "http://127.0.0.1:9001/clients"                          # who's connected
//   curl "http://127.0.0.1:9001/send?imei=861045082572846&cmd=upgrade#"   # bare command
//   curl "http://127.0.0.1:9001/send?imei=861045082572846&cmd=upgrade%23&wrap=1"  # [3G*IMEI*LEN*upgrade#]
//   curl "http://127.0.0.1:9001/send?imei=ALL&cmd=upgrade#"       # every connected device
// (# is %23 when URL-encoding.)
//
// IMPORTANT: `./loadEnv.js` must be imported FIRST — it populates process.env
// from .env.local / .env before the DB pool (in db.js) is created.
import "./loadEnv.js";
import net from "net";
import http from "http";
import { extractFrames, parseFrame } from "../app/api/apiUtils/ingest/parse.js";
import { resolveAndStore } from "../app/api/apiUtils/ingest/store.js";

const PORT = Number(process.env.INGEST_PORT) || 9000;
const CONTROL_PORT = Number(process.env.INGEST_CONTROL_PORT) || 9001;
// Optional auto-send on first heartbeat. OFF by default — you control sending via
// the HTTP endpoint. Set INGEST_ONCONNECT_CMD="upgrade#" to re-enable auto-send.
const ON_CONNECT_COMMAND = process.env.INGEST_ONCONNECT_CMD || "";

let packets = 0, unknown = 0, errors = 0, alarms = 0;

// Compact one-line summary of a parsed frame for the terminal.
function summarize(rec) {
  const parts = [`imei=${rec.imei || "?"}`, `cmd=${rec.cmd || "?"}`];
  if (rec.cmd === "UD" || rec.cmd === "UD2" || rec.cmd === "AL") {
    parts.push(`fix=${rec.fix || "?"}`);
    if (rec.lat != null && rec.lng != null) parts.push(`pos=${rec.lat},${rec.lng}`);
    else if (rec.networkLocated) parts.push(`pos=LBS/WiFi`);
    else parts.push(`pos=none`);
    if (rec.speed != null) parts.push(`spd=${rec.speed}`);
    if (rec.battery != null) parts.push(`batt=${rec.battery}%`);
    if (rec.signal != null) parts.push(`gsm=${rec.signal}`);
    if (rec.satellites != null) parts.push(`sats=${rec.satellites}`);
    if (rec.steps != null) parts.push(`steps=${rec.steps}`);
    if (rec.motionByte) parts.push(`status=${rec.motionByte}`);
    if (rec.status?.disturbance) parts.push(`DISTURBANCE`);
    if (rec.status?.lowBattery) parts.push(`low-batt`);
    if (rec.mems?.valid && rec.mems?.dynamic != null) parts.push(`mems=${rec.mems.dynamic}mg`);
    if (rec.deviceTime) parts.push(`t=${rec.deviceTime}`);
  }
  return parts.join(" ");
}

// Live registry of connected devices: imei -> socket (last connection wins).
const clients = new Map();

// Send a BARE command (no wrapper) — e.g. "upgrade#" goes out exactly as typed.
function sendRaw(socket, text) {
  try { socket.write(Buffer.from(text, "latin1")); console.log(`[ingest] -> (raw) ${text}`); return true; }
  catch (e) { console.error(`[ingest] raw write failed: ${e.message}`); return false; }
}
// Send a WRAPPED GL-28 downlink: [3G*IMEI*LEN*payload], LEN = hex byte-length.
function sendWrapped(socket, prefix, imei, payload) {
  const len = Buffer.byteLength(payload, "latin1").toString(16).toUpperCase().padStart(4, "0");
  const frame = `[${prefix || "3G"}*${imei}*${len}*${payload}]`;
  try { socket.write(Buffer.from(frame, "latin1")); console.log(`[ingest] -> ${frame}`); return true; }
  catch (e) { console.error(`[ingest] downlink write failed: ${e.message}`); return false; }
}
// Push `cmd` to one IMEI (or ALL). wrap=true -> [3G*IMEI*LEN*cmd]; else bare cmd.
function pushCommand(imei, cmd, wrap) {
  const targets = String(imei).toUpperCase() === "ALL"
    ? [...clients.entries()]
    : (clients.has(imei) ? [[imei, clients.get(imei)]] : []);
  let sent = 0;
  for (const [im, sock] of targets) {
    const ok = wrap ? sendWrapped(sock, sock.__prefix || "3G", im, cmd) : sendRaw(sock, cmd);
    if (ok) sent++;
  }
  return { targets: targets.length, sent };
}

// Fail loudly if there's still no DB connection string, so the SASL "client
// password must be a string" error is explained instead of cryptic.
if (!process.env.DATABASE_URL) {
  console.error("[ingest] DATABASE_URL is not set. Add it to .env / .env.local in the app root (e.g. DATABASE_URL=postgresql://postgres:PASS@localhost:5432/assetguard) or pass it to pm2 with --update-env. Continuing, but DB writes will fail.");
} else {
  console.log(`[ingest] DATABASE_URL loaded (${String(process.env.DATABASE_URL).replace(/:\/\/([^:]+):[^@]*@/, "://$1:****@")})`);
}

const server = net.createServer((socket) => {
  socket.setEncoding("latin1");
  socket.__buf = "";
  const ip = socket.remoteAddress, sp = socket.remotePort;
  console.log(`[ingest] + connection ${ip}:${sp}`);
  socket.on("data", async (chunk) => {
    // Log the exact bytes as they arrive off the wire (before framing), so you
    // see partial/odd data too. `JSON.stringify` reveals CR/LF and control chars.
    console.log(`[ingest] <-raw ${ip}:${sp}  ${JSON.stringify(String(chunk))}`);
    socket.__buf += chunk;
    const { frames, rest } = extractFrames(socket.__buf);
    socket.__buf = rest.length > 4096 ? "" : rest;
    for (const f of frames) {
      // Log EVERY complete frame exactly as received, before parsing.
      console.log(`[ingest] <- ${ip}:${sp}  ${f}`);
      let rec;
      try { rec = parseFrame(f); }
      catch (e) { errors++; console.log(`[ingest] xx parse failed: ${e.message}  frame=${f}`); continue; }
      packets++;
      // Decoded summary of what the server understood from this frame.
      console.log(`[ingest]    parsed ${summarize(rec)}`);
      // Remember which live socket belongs to this IMEI, so the control endpoint
      // can target it while the device keeps streaming.
      if (rec.imei) { socket.__imei = rec.imei; socket.__prefix = rec.prefix; clients.set(rec.imei, socket); }
      // Heartbeat / login acknowledgements keep the device online.
      if (rec.cmd === "LK") {
        const ack = `[${rec.prefix}*${rec.imei}*0002*LK]`;
        try { socket.write(ack); console.log(`[ingest] -> (LK ack) ${ack}`); } catch {}
        // Optional auto-send (off unless INGEST_ONCONNECT_CMD is set).
        if (ON_CONNECT_COMMAND && !socket.__cmdSent) {
          socket.__cmdSent = true;
          sendRaw(socket, ON_CONNECT_COMMAND);
        }
      }
      try {
        const { unknown: u, view } = await resolveAndStore(rec, ip, sp);
        if (u) { unknown++; console.log(`[ingest] ? unknown IMEI ${rec.imei}`); }
        else if (view?.alarms?.length) {
          for (const a of view.alarms) {
            if (!a.suppressed) { alarms++; console.log(`[ingest] ! ALARM ${a.type} (${a.severity}) — ${a.message}`); }
          }
        }
      } catch (e) { errors++; }
    }
  });
  socket.on("close", () => {
    if (socket.__imei && clients.get(socket.__imei) === socket) clients.delete(socket.__imei);
    console.log(`[ingest] - connection ${ip}:${sp}`);
  });
  socket.on("error", () => { errors++; });
});

server.listen(PORT, "0.0.0.0", () => console.log(`[ingest] listening on 0.0.0.0:${PORT}`));

// ---- local control endpoint (127.0.0.1 only) ------------------------------
const control = http.createServer((req, res) => {
  const url = new URL(req.url, "http://127.0.0.1");
  const send = (code, obj) => { res.writeHead(code, { "Content-Type": "application/json" }); res.end(JSON.stringify(obj)); };
  if (url.pathname === "/clients") {
    return send(200, { connected: [...clients.keys()] });
  }
  if (url.pathname === "/send") {
    const imei = url.searchParams.get("imei") || "";
    const cmd = url.searchParams.get("cmd") || "";
    const wrap = url.searchParams.get("wrap") === "1";
    if (!imei || !cmd) return send(400, { error: "usage: /send?imei=<imei|ALL>&cmd=<text>&wrap=0|1" });
    const r = pushCommand(imei, cmd, wrap);
    if (r.targets === 0) return send(404, { error: `no connected device for imei ${imei}`, connected: [...clients.keys()] });
    return send(200, { ok: true, imei, cmd, wrap, ...r });
  }
  send(404, { error: "not found", endpoints: ["/clients", "/send?imei=&cmd=&wrap="] });
});
control.listen(CONTROL_PORT, "127.0.0.1", () => console.log(`[ingest] control endpoint on http://127.0.0.1:${CONTROL_PORT} (/clients, /send)`));

setInterval(() => console.log(`[ingest] packets=${packets} alarms=${alarms} unknown=${unknown} errors=${errors} clients=${clients.size}`), 30000);
