// ingest/server.js — standalone tracker ingest listener (production option).
// Runs as its own process, sharing the same Postgres DB as the web app.
//   Requires DATABASE_URL (and PGSSL) in the environment.
//   Start:  node ingest/server.js                 (port defaults to 9000)
//           INGEST_PORT=9000 node ingest/server.js
// Full pipeline: TCP frame -> GL-28 parse -> device_telemetry -> alarm engine
// -> alarms. Uses the SAME parser + resolver as the in-app listener.
//
// Use this instead of the in-app Open/Close control when you run the web app
// clustered / multi-instance (only one process may bind the port).
//
// IMPORTANT: `./loadEnv.js` must be imported FIRST — it populates process.env
// from .env.local / .env before the DB pool (in db.js) is created.
import "./loadEnv.js";
import net from "net";
import { extractFrames, parseFrame } from "../app/api/apiUtils/ingest/parse.js";
import { resolveAndStore } from "../app/api/apiUtils/ingest/store.js";

const PORT = Number(process.env.INGEST_PORT) || 9000;
let packets = 0, unknown = 0, errors = 0, alarms = 0;

// Fail loudly if there's still no DB connection string, so the SASL "client
// password must be a string" error is explained instead of cryptic.
if (!process.env.DATABASE_URL) {
  console.error("[ingest] DATABASE_URL is not set. Add it to C:\\assetguardv2\\.env.local (e.g. DATABASE_URL=postgres://postgres:admin@localhost:5432/assetguard) or set it in this shell before running. Continuing, but DB writes will fail.");
} else {
  console.log(`[ingest] DATABASE_URL loaded (${String(process.env.DATABASE_URL).replace(/:\/\/([^:]+):[^@]*@/, "://$1:****@")})`);
}

const server = net.createServer((socket) => {
  socket.setEncoding("latin1");
  socket.__buf = "";
  const ip = socket.remoteAddress, sp = socket.remotePort;
  console.log(`[ingest] + connection ${ip}:${sp}`);
  socket.on("data", async (chunk) => {
    socket.__buf += chunk;
    const { frames, rest } = extractFrames(socket.__buf);
    socket.__buf = rest.length > 4096 ? "" : rest;
    for (const f of frames) {
      let rec;
      try { rec = parseFrame(f); } catch { errors++; continue; }
      packets++;
      // Heartbeat / login acknowledgements keep the device online.
      if (rec.cmd === "LK") { try { socket.write(`[${rec.prefix}*${rec.imei}*0002*LK]`); } catch {} }
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
  socket.on("close", () => console.log(`[ingest] - connection ${ip}:${sp}`));
  socket.on("error", () => { errors++; });
});

server.listen(PORT, "0.0.0.0", () => console.log(`[ingest] listening on 0.0.0.0:${PORT}`));
setInterval(() => console.log(`[ingest] packets=${packets} alarms=${alarms} unknown=${unknown} errors=${errors}`), 30000);
