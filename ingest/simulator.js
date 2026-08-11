// ingest/simulator.js — a fake GL-28 tracker that connects to the ingest
// listener over TCP and streams crafted packets, so you can test the whole
// pipeline (parse -> telemetry -> alarm engine -> alarms) without a real device.
// (There's also an in-app Device Simulator UI at /mainapp/simulator.)
//
// Usage:
//   node ingest/simulator.js --imei 863957075080470 --scenario disturbance
//   node ingest/simulator.js --imei 863957075080470 --scenario all --interval 1000
//
//   --imei       device IMEI (must exist in `devices`, else it's an "unknown" log)
//   --scenario   normal | disturbance | overspeed | lowbattery | geofence | all
//   --host       listener host (default 127.0.0.1)
//   --port       listener port (default 9000, or INGEST_PORT)
//   --interval   ms between packets in a loop (default 1000)
//   --count      how many packets to send then exit (default: scenario length)
//   --lat --lng  base site coordinates (default Athi River ≈ -1.5420, 37.2620)
import net from "net";
import { scenarioPackets } from "../app/api/apiUtils/ingest/simPackets.js";

function arg(name, def) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}
const IMEI = arg("imei", "863957075080470");
const SCENARIO = String(arg("scenario", "all")).toLowerCase();
const HOST = arg("host", "127.0.0.1");
const PORT = Number(arg("port", process.env.INGEST_PORT || 9000));
const INTERVAL = Number(arg("interval", 1000));
const BASE_LAT = Number(arg("lat", -1.542));
const BASE_LNG = Number(arg("lng", 37.262));
const COUNT = arg("count", null);

const packets = scenarioPackets(SCENARIO, { imei: IMEI, lat: BASE_LAT, lng: BASE_LNG });
const total = COUNT ? Number(COUNT) : packets.length;

const sock = net.createConnection({ host: HOST, port: PORT }, () => {
  console.log(`[sim] connected to ${HOST}:${PORT} as IMEI ${IMEI} — scenario "${SCENARIO}"`);
  let i = 0;
  const tick = () => {
    if (i >= total) {
      console.log(`[sim] sent ${total} packet(s). Closing in 1s…`);
      setTimeout(() => sock.end(), 1000);
      return;
    }
    const p = packets[i % packets.length];
    sock.write(p);
    console.log(`[sim] -> ${p}`);
    i++;
    setTimeout(tick, INTERVAL);
  };
  tick();
});
sock.on("data", (d) => console.log(`[sim] <- ${d.toString("latin1").trim()}`));
sock.on("error", (e) => console.error(`[sim] error: ${e.message}`));
sock.on("close", () => { console.log("[sim] closed."); process.exit(0); });
