// app/api/apiUtils/ingest/disturbanceEscalation.js
// TIMER-DRIVEN disturbance ladder.
//
// Once Warning 1 fires on the first disturbance of an episode, the climb is on a
// clock and does NOT need more disturbance to continue:
//   • Warning 1 — the first disturbance packet (started from store.js).
//   • Warning 2 — at least GAP1 seconds after Warning 1 FIRED.
//   • Alarm     — at least GAP2 seconds after Warning 2 FIRED (measured from the
//                 previous step, not from t0).
// Each gap is measured from when the previous level actually fired (`level_at`), so
// a slightly-late Warning 2 pushes the alarm out too. The state lives in one row per
// device (`disturbance_episode`); a periodic sweep advances it with no packets.
//
// Stops only on: the alarm being closed (operator), or the 30-minute quiet reset.
import { query } from "../s_env/db.js";
import { insertLiveAlarm } from "../dataControl/alarms.js";
import { notifyAlarmRaised, notifyDisturbanceEarly } from "../notify/alarmNotify.js";

const DTYPES = ["DISTURBANCE", "DISTURBANCE_TECH"];
// Step gaps, each measured from when the PREVIOUS step fired. Derived from the same
// env knobs as the rest of the ladder: warn2 = gap W1→W2, raise−warn2 = gap W2→raise.
const GAP1 = Math.max(1, Number(process.env.DISTURB_WARN2_SEC) || 30);         // W1 -> W2
const TOTAL = Math.max(GAP1 + 1, Number(process.env.DISTURB_RAISE_SEC) || 60);
const GAP2 = Math.max(1, TOTAL - GAP1);                                        // W2 -> raise
const GAP_MIN = Number(process.env.DISTURB_STREAK_GAP_MIN) || 30;              // quiet reset (minutes)
const SWEEP_MS = 5 * 1000;                                                     // check the clocks every 5s

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  try {
    await query(`CREATE TABLE IF NOT EXISTS disturbance_episode (
      device_id TEXT PRIMARY KEY, t0 TIMESTAMPTZ NOT NULL, level SMALLINT NOT NULL,
      level_at TIMESTAMPTZ NOT NULL, last_at TIMESTAMPTZ NOT NULL, site_id BIGINT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now())`);
    await query(`CREATE INDEX IF NOT EXISTS idx_disturbance_episode_level ON disturbance_episode (level, level_at)`);
    tableReady = true;
  } catch (e) { console.error("[disturb-escalation] ensureTable:", e?.message || e); }
}

const nowIso = () => new Date().toISOString();

// The ladder is DORMANT while a disturbance alarm for this device is still Open or
// Acknowledged (anything not Closed) — no Warning 1, no Warning 2, no raise, until
// an operator closes it. (Test alarms don't count.)
async function ladderBlocked(deviceId) {
  try {
    const { rows } = await query(
      `SELECT 1 FROM alarms
        WHERE device_id = $1 AND alarm_type = ANY($2)
          AND status <> 'Closed' AND source <> 'test' LIMIT 1`,
      [deviceId, DTYPES]
    );
    return !!rows[0];
  } catch (e) { console.error("[disturb-escalation] blocked check:", e?.message || e); return false; }
}

// Drop episodes that are DONE: quiet for 30+ min and never raised, OR raised and the
// alarm has since been closed (so the next disturbance starts a clean episode).
async function cleanupResets(deviceId = null) {
  const params = [String(GAP_MIN), DTYPES];
  let where = `(e.level < 3 AND now() - e.last_at > ($1 || ' minutes')::interval)
               OR (e.level = 3 AND NOT EXISTS (
                     SELECT 1 FROM alarms a WHERE a.device_id = e.device_id
                       AND a.alarm_type = ANY($2) AND a.status <> 'Closed' AND a.source <> 'test'))`;
  if (deviceId) { params.push(deviceId); where = `e.device_id = $3 AND (${where})`; }
  try { await query(`DELETE FROM disturbance_episode e WHERE ${where}`, params); }
  catch (e) { console.error("[disturb-escalation] cleanup:", e?.message || e); }
}

function emitW(level, ctx) {
  // Warning 1 => count 2 (step 1/3); Warning 2 => count 3 (step 2/3).
  return notifyDisturbanceEarly({
    deviceIdText: ctx.deviceIdText, serial: ctx.serial || null, site: ctx.site || null,
    siteId: ctx.siteId ?? null, at: nowIso(), count: level + 1, threshold: 4, level,
    deviceStatus: ctx.deviceStatus, deviceArmed: ctx.deviceArmed, deviceMuteUntil: ctx.deviceMuteUntil,
  }).catch((e) => console.error("[disturb-escalation] warn notify:", e?.message || e));
}

async function raise(ctx) {
  try {
    const row = await insertLiveAlarm({
      alarmType: "DISTURBANCE", value: ctx.value ?? null, deviceIdText: ctx.deviceIdText,
      site: ctx.site || null, serial: ctx.serial || null, lat: ctx.lat ?? null, lng: ctx.lng ?? null,
      at: nowIso(), incidentSince: nowIso(), source: "device",
    });
    if (row) {
      console.log(`[disturbance] ${ctx.deviceIdText} → RAISED ${row.id} (timer, ${GAP1}+${GAP2}s)`);
      try { await notifyAlarmRaised(row, { siteId: ctx.siteId, deviceStatus: ctx.deviceStatus, deviceArmed: ctx.deviceArmed, deviceMuteUntil: ctx.deviceMuteUntil }); }
      catch (e) { console.error("[disturbance] raise notify:", e?.message || e); }
    } else {
      console.log(`[disturbance] ${ctx.deviceIdText} → raise de-duped (open alarm?)`);
    }
  } catch (e) { console.error("[disturb-escalation] raise:", e?.message || e); }
}

// Advance one device's episode as far as its CLOCKS allow (W1->W2, then W2->raise),
// firing each step once. Atomic UPDATE...WHERE guards against packet/sweep races.
async function advance(ctx) {
  // Dormant while an alarm for this device is Open/Acknowledged — no warnings, no
  // raise. The ladder's OWN raise is unaffected: at the 2->3 moment no alarm exists
  // yet, so this passes; once it raises, later advances are blocked here.
  if (await ladderBlocked(ctx.deviceIdText)) return;
  // W1 -> W2
  try {
    const w2 = await query(
      `UPDATE disturbance_episode SET level = 2, level_at = now(), updated_at = now()
        WHERE device_id = $1 AND level = 1 AND now() >= level_at + ($2 || ' seconds')::interval
       RETURNING device_id`,
      [ctx.deviceIdText, String(GAP1)]
    );
    if (w2.rows[0]) { console.log(`[disturbance] ${ctx.deviceIdText} → EARLY WARNING 2/2 (timer, +${GAP1}s)`); emitW(2, ctx); }
  } catch (e) { console.error("[disturb-escalation] advance W2:", e?.message || e); }
  // W2 -> raise
  try {
    const r = await query(
      `UPDATE disturbance_episode SET level = 3, level_at = now(), updated_at = now()
        WHERE device_id = $1 AND level = 2 AND now() >= level_at + ($2 || ' seconds')::interval
       RETURNING device_id`,
      [ctx.deviceIdText, String(GAP2)]
    );
    if (r.rows[0]) await raise(ctx);
  } catch (e) { console.error("[disturb-escalation] advance raise:", e?.message || e); }
}

/**
 * Called from store.js for each REAL (non-test) disturbance packet. Starts the
 * episode (Warning 1) if none is active, keeps it alive otherwise, and nudges the
 * clock so Warning 2 / the alarm fire promptly when their gap has elapsed.
 */
export async function onDisturbancePacket(ctx) {
  await ensureTable();
  await cleanupResets(ctx.deviceIdText);
  // While a disturbance alarm for this device is still Open/Acknowledged, the ladder
  // is dormant — no Warning 1, no new episode. It wakes only once the alarm is closed
  // (cleanupResets above drops the stale level-3 row the moment that happens).
  if (await ladderBlocked(ctx.deviceIdText)) return;
  let started = false;
  try {
    const { rows } = await query(
      `INSERT INTO disturbance_episode (device_id, t0, level, level_at, last_at, site_id)
         VALUES ($1, now(), 1, now(), now(), $2)
       ON CONFLICT (device_id) DO UPDATE SET last_at = now(), updated_at = now()
       RETURNING (xmax = 0) AS inserted`,
      [ctx.deviceIdText, ctx.siteId ?? null]
    );
    started = !!rows[0]?.inserted;
  } catch (e) { console.error("[disturb-escalation] start:", e?.message || e); return; }

  if (started) { console.log(`[disturbance] ${ctx.deviceIdText} → EARLY WARNING 1/2 (first disturbance)`); emitW(1, ctx); }
  await advance(ctx);
}

/** Periodic sweep: advance EVERY active episode on its clock, with no packets. */
export async function sweepDisturbanceEscalations() {
  await ensureTable();
  await cleanupResets(null);
  let rows = [];
  try {
    const res = await query(
      `SELECT e.device_id, e.level, e.site_id,
              d.imei, d.status AS dev_status, d.armed AS dev_armed, d.mute_until AS dev_mute,
              s.name AS site_name
         FROM disturbance_episode e
         LEFT JOIN devices d ON (d.device_id = e.device_id OR d.imei = e.device_id)
         LEFT JOIN sites s ON s.id = COALESCE(e.site_id, d.site_id)
        WHERE e.level < 3`
    );
    rows = res.rows;
  } catch (e) { console.error("[disturb-escalation] sweep read:", e?.message || e); return; }

  for (const r of rows) {
    await advance({
      deviceIdText: r.device_id, serial: r.imei || null, site: r.site_name || null,
      siteId: r.site_id ?? null, deviceStatus: r.dev_status, deviceArmed: r.dev_armed,
      deviceMuteUntil: r.dev_mute, lat: null, lng: null, value: null,
    });
  }
}

/** Idempotent: start the escalation sweep once per process (like ensureOfflineSweep). */
export function ensureDisturbanceSweep() {
  const g = globalThis;
  if (g.__agDisturbSweep) return;
  g.__agDisturbSweep = true;
  setTimeout(() => { sweepDisturbanceEscalations(); }, 8 * 1000);
  const timer = setInterval(() => { sweepDisturbanceEscalations(); }, SWEEP_MS);
  if (timer.unref) timer.unref();
  console.log(`[disturb-escalation] sweep every ${SWEEP_MS / 1000}s · W1->W2 ${GAP1}s · W2->raise ${GAP2}s · reset ${GAP_MIN}min`);
}
