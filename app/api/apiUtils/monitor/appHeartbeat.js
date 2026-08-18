// app/api/apiUtils/monitor/appHeartbeat.js
// Proof-of-life: while the web app process is running, write one row per minute
// to app_heartbeat. "Platform uptime" is computed from the presence of these
// pings, so it measures the APP being online (not device traffic). Guarded on
// globalThis so only ONE interval runs per process (survives hot-reload).
import { query } from "../s_env/db.js";

const EVERY_MS = 60_000;

async function ping() {
  try { await query(`INSERT INTO app_heartbeat (ts) VALUES (now())`); } catch { /* table may not exist yet */ }
}
async function prune() {
  // keep ~13 months so yearly uptime has history; drop older.
  try { await query(`DELETE FROM app_heartbeat WHERE ts < now() - interval '400 days'`); } catch {}
}

export function ensureAppHeartbeat() {
  const g = globalThis;
  if (g.__agHeartbeat) return;             // already running in this process
  g.__agHeartbeat = true;
  ping();                                  // write immediately on first load
  g.__agHeartbeatTimer = setInterval(ping, EVERY_MS);
  if (g.__agHeartbeatTimer.unref) g.__agHeartbeatTimer.unref(); // don't hold the process open
  // prune once an hour
  g.__agHeartbeatPrune = setInterval(prune, 3600_000);
  if (g.__agHeartbeatPrune.unref) g.__agHeartbeatPrune.unref();
}
