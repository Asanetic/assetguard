// ingest/server.js — standalone tracker ingest listener (production option).
// Runs as its own process, sharing the same Postgres DB as the web app.
//   Requires DATABASE_URL (and PGSSL) in the environment.
//   Start:  node ingest/server.js                 (port defaults to 9000)
//           INGEST_PORT=9000 node ingest/server.js
// Uses the SAME parser + resolver as the in-app listener, so behaviour matches.
//
// Use this instead of the in-app Open/Close control when you run the web app
// clustered / multi-instance (only one process may bind the port).
import net from "net";
import { extractFrames, parseFrame } from "../app/api/apiUtils/ingest/parse.js";
import { resolveAndStore } from "../app/api/apiUtils/ingest/store.js";

const PORT = Number(process.env.INGEST_PORT) || 9000;
let packets = 0, unknown = 0, errors = 0;

const server = net.createServer((socket) => {
  socket.setEncoding("latin1");
  socket.__buf = "";
  const ip = socket.remoteAddress, sp = socket.remotePort;
  socket.on("data", async (chunk) => {
    socket.__buf += chunk;
    const { frames, rest } = extractFrames(socket.__buf);
    socket.__buf = rest.length > 4096 ? "" : rest;
    for (const f of frames) {
      let rec;
      try { rec = parseFrame(f); } catch { errors++; continue; }
      packets++;
      if (rec.cmd === "LK") { try { socket.write(`[${rec.prefix}*${rec.imei}*0002*LK]`); } catch {} }
      try { const { unknown: u } = await resolveAndStore(rec, ip, sp); if (u) unknown++; }
      catch { errors++; }
    }
  });
  socket.on("error", () => { errors++; });
});

server.listen(PORT, "0.0.0.0", () => console.log(`[ingest] listening on 0.0.0.0:${PORT}`));
setInterval(() => console.log(`[ingest] packets=${packets} unknown=${unknown} errors=${errors}`), 30000);
