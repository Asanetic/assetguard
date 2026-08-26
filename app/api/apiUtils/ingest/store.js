// app/api/apiUtils/ingest/store.js
// Parse a packet, resolve position, store telemetry, and raise alarms — for BOTH
// registered and unregistered devices, so everything is visible in TCP logs.
//   parse -> lookup device by IMEI (found or not) -> geolocate (if no fix)
//         -> insert device_telemetry -> alarm engine -> (registered) update state + alarms
// Unregistered IMEIs are still stored (device_id NULL) and also quarantined in
// unknown_logs, so you can see exactly what's arriving before you register them.
import { findDeviceByImei, touchDeviceLastSeen, recordHeartbeat } from "../dataControl/devices.js";
import { hasOpenCriticalAlarm } from "../dataControl/deviceCommands.js";
import { isHeartbeatStatus } from "./heartbeat.js";
import { insertDeviceLog, insertUnknownLog } from "../dataControl/deviceLogs.js";
import { insertTelemetry, updateDeviceState, getSiteLatLng, recentVoltages } from "../dataControl/telemetry.js";
import { fuelGauge } from "./batteryModel.js";
import { insertLiveAlarm, clearOpenAlarm, disturbanceDecision } from "../dataControl/alarms.js";
import { toTelemetry } from "./parse.js";
import { evaluate, resolveConfig, ALARM_TYPES } from "./alarmEngine.js";
import { notifyAlarmRaised, notifyDisturbanceEarly } from "../notify/alarmNotify.js";
import { geolocate, reverseGeocodeRoad } from "./geolocate.js";
import { isTechOnSite } from "./techOnSite.js";
import { ensureOfflineSweep } from "./offlineSweep.js";

// Per-device motion/geofence state (keyed by device id, or imei when unregistered).
function motionState(key) {
  if (!globalThis.__agMotion) globalThis.__agMotion = new Map();
  let s = globalThis.__agMotion.get(key);
  if (!s) { s = { breached: false, dyn: [], lastSteps: null }; globalThis.__agMotion.set(key, s); }
  return s;
}

// Reset a device's per-packet engine state (breach flag, MEMS window, disturbance
// streak) — used by the simulator so each run starts clean and the 4th-packet
// disturbance debounce restarts.
export function resetMotion(key) {
  try {
    const m = globalThis.__agMotion; if (!m) return;
    m.delete(key); m.delete(String(key)); m.delete(Number(key));
  } catch {}
}

// Clear ALL in-memory engine counters — used by the simulator's "reset" so a fresh
// scenario ALWAYS starts the disturbance debounce from zero (raises on the Nth,
// never earlier). Counters simply rebuild from incoming packets.
export function resetAllMotion() { try { globalThis.__agMotion?.clear(); } catch {} }

// Incident cutoff: alarms before this instant (per device key) are NOT grouped into
// new episodes — so a simulator restart forces the next Disturbance to open a fresh
// incident, WITHOUT the system closing any alarms. ms = epoch millis.
export function setIncidentCutoff(key, ms) {
  if (!globalThis.__agIncidentCut) globalThis.__agIncidentCut = new Map();
  globalThis.__agIncidentCut.set(String(key), ms);
}
function getIncidentCutoff(key) {
  const m = globalThis.__agIncidentCut; if (!m) return null;
  return m.get(String(key)) ?? null;
}

export async function resolveAndStore(rec, ip, port) {
  ensureOfflineSweep(); // idempotent — starts the Device Offline sweep once per process
  const view = {
    receivedAt: new Date().toISOString(),
    imei: rec.imei, cmd: rec.cmd,
    fix: rec.fix ?? null, lat: rec.lat ?? null, lng: rec.lng ?? null,
    speed: rec.speed ?? null, course: rec.course ?? null,
    battery: rec.battery ?? null, signal: rec.signal ?? null,
    motionByte: rec.motionByte ?? null,
    deviceTime: rec.deviceTime ?? null, statusHex: rec.statusHex ?? null,
    src: `${ip || "?"}:${port || 0}`,
    deviceName: null, siteName: null, siteId: null, unknown: false,
    alarms: [], geo: null,
  };

  // Lookup by IMEI (SELECT ... WHERE btrim(imei) = btrim($1)).
  let device = null;
  try { device = await findDeviceByImei(rec.imei); } catch (e) { console.error("[ingest] device lookup error:", e.message); }
  const known = !!device;

  if (known) {
    view.deviceName = device.device_id || device.imei;
    view.siteName = device.site || null;
    view.siteId = device.site_id || null;
    console.log(`[ingest] device ${rec.imei} -> ${device.device_id || device.id}`);
  } else {
    view.unknown = true;
    console.log(`[ingest] device ${rec.imei} -> UNREGISTERED (stored anyway)`);
    try { await insertUnknownLog({ imei: rec.imei, raw: rec.raw, ip, port }); } catch {}
  }

  // Heartbeats carry no telemetry; just bump last_seen for known devices.
  if (!(rec.cmd === "UD" || rec.cmd === "UD2" || rec.cmd === "AL")) {
    if (known) { try { await touchDeviceLastSeen(device.id); } catch {} }
    return { unknown: !known, view };
  }

  const t = toTelemetry(rec);

  // --- battery: firmware reports raw VOLTAGE; convert to % here ---
  // Use the SETTLED voltage = max over the last ~2 min (rejects post-transmit
  // dips; for a device with only 1–2 recent reports it's just the max available,
  // a safe lower bound). Legacy firmware that still sends a % keeps t.battery.
  if (t.voltage != null) {
    let recent = [];
    // Average a window of recent readings (kills report-to-report jitter) and run the
    // software fuel gauge: it holds or eases DOWN and never bounces back up (a primary
    // LiMnO2 cell never recharges), so we never get "15% then 20% then 15%".
    // Tune the averaging window with INGEST_BATTERY_WINDOW_MIN.
    const winMin = Number(process.env.INGEST_BATTERY_WINDOW_MIN) || 15;
    if (device?.id) { try { recent = await recentVoltages(device.id, winMin); } catch {} }
    // device.battery = the last displayed % for this device (the gauge's memory).
    const prevPct = device && Number.isFinite(Number(device.battery)) ? Number(device.battery) : null;
    const { percent } = fuelGauge(t.voltage, recent, prevPct);
    if (percent != null) t.battery = percent;
  }
  view.battery = t.battery ?? null;
  view.voltage = t.voltage ?? null;

  // --- resolve position BEFORE writing the row ---
  if (t.fixValid) {
    t.accuracy = 10; t.locSource = "gps"; t.geoError = null;
    view.geo = { source: "gps", lat: t.lat, lng: t.lng, accuracy: 10 };
    console.log(`[ingest] ${rec.imei} GPS fix ${t.lat},${t.lng} ±10m`);
  } else if (t.cells.length || t.wifi.length) {
    t.locSource = "network";
    try {
      const g = await geolocate({ cells: t.cells, wifi: t.wifi, mcc: t.mcc, mnc: t.mnc });
      // Stamp which provider located it (Google/Unwired) and the Unwired trial
      // snapshot into geo_raw under _ag, so the packet card can show both without
      // a schema change. _ag = AssetGuard meta (not part of the provider payload).
      const agMeta = {};
      if (g.provider) agMeta.provider = g.provider;
      if (g.trials) agMeta.trials = g.trials;
      t.geoRaw = g.raw
        ? { ...g.raw, ...(Object.keys(agMeta).length ? { _ag: agMeta } : {}) }
        : (Object.keys(agMeta).length ? { _ag: agMeta } : null);
      if (g.location && g.location.lat != null) {
        t.lat = g.location.lat; t.lng = g.location.lng; t.accuracy = g.location.accuracy;
        t.networkLocated = true; t.geoError = null; t.locSource = g.source || "network";
        view.geo = { source: t.locSource, provider: g.provider || "google", lat: t.lat, lng: t.lng, accuracy: t.accuracy, raw: g.raw };
        console.log(`[ingest] ${rec.imei} geolocation OK (${t.locSource} via ${g.provider || "google"}) ${t.lat},${t.lng} ±${t.accuracy}m (from ${t.cells.length} cells, ${t.wifi.length} wifi)`);
      } else {
        t.geoError = g.error || "geolocation failed to compute a position";
        view.geo = { source: "network", error: t.geoError, raw: g.raw };
        console.error(`[ingest] ${rec.imei} geolocation FAILED: ${t.geoError} — raw:`, JSON.stringify(g.raw));
      }
    } catch (e) {
      t.geoError = `geolocation failed to compute a position (${e?.message || "error"})`;
      view.geo = { source: "network", error: t.geoError };
      console.error(`[ingest] ${rec.imei} geolocation ERROR:`, e?.message || e);
    }
  } else {
    t.geoError = "no GPS fix and no cell/Wi-Fi data in this packet to locate from";
    view.geo = { source: "none", error: t.geoError };
  }

  view.status = t.status;
  view.fixValid = t.fixValid;
  view.networkLocated = t.networkLocated;
  view.memsDynamic = t.mems?.dynamic ?? null;
  view.cells = t.cells; view.wifi = t.wifi;
  view.accuracy = t.accuracy; view.locSource = t.locSource; view.geoError = t.geoError ?? null;

  // 1) legacy raw-ish log (known devices only — it's the device_logs feed)
  if (known) {
    try {
      await insertDeviceLog({
        deviceId: device.id, siteId: device.site_id, imei: rec.imei,
        deviceTime: rec.deviceTime, fix: rec.fix, lat: t.lat, lng: t.lng,
        speed: rec.speed, course: rec.course, statusHex: rec.statusHex,
        event: rec.cmd === "AL" ? "Alarm" : null,
        mcc: rec.mcc, mnc: rec.mnc, lac: rec.lac, cellId: rec.cellId,
        raw: rec.raw, ip, port,
      });
    } catch {}
  }

  // 2) alarm engine (uses defaults + no site for unregistered devices)
  const devForEngine = device || { imei: rec.imei, device_id: null, config: {} };
  let site = null;
  if (known) { try { site = await getSiteLatLng(device.site_id); } catch {} }
  // Tech-on-site check (inert until the access-control integration lands) — only
  // matters for a disturbance, which it downgrades to the Low "tech on site" tier.
  let techOnSite = false;
  if (known) { try { techOnSite = await isTechOnSite(device.site_id); } catch {} }
  let alarms = [];
  try { alarms = evaluate(t, devForEngine, site, motionState(known ? device.id : `imei:${rec.imei}`), { techOnSite }) || []; } catch (e) { console.error("[ingest] engine error:", e.message); }
  const alarmTypes = alarms.map((a) => a.type);
  view.alarms = alarms;

  // Critical Motion records the road it's on — reverse-geocode the position once.
  let road = null;
  if (alarms.some((a) => a.type === ALARM_TYPES.CRITICAL_MOTION) && t.lat != null && t.lng != null) {
    try { road = await reverseGeocodeRoad(t.lat, t.lng); } catch {}
    if (road) view.road = road;
  }

  // 3) normalized telemetry — stored for BOTH known and unknown (device_id may be NULL)
  let telemetryId = null;
  try {
    telemetryId = await insertTelemetry({ ...t, deviceId: device?.id ?? null, siteId: device?.site_id ?? null, ip, port, alarms: alarmTypes });
  } catch (e) { console.error("[ingest] telemetry insert error:", e.message); }

  // 4) registered devices: keep live state fresh + persist alarms to All Alarms/speaker
  if (known) {
    try { await updateDeviceState(device.id, t); } catch { try { await touchDeviceLastSeen(device.id); } catch {} }
    // The device just reported, so it isn't offline — clear any open offline alarm.
    try { await clearOpenAlarm(device.device_id || device.imei, ALARM_TYPES.DEVICE_OFFLINE); } catch {}

    const deviceIdText = device.device_id || device.imei;
    const at = t.deviceTime || rec.deviceTime || null;
    const disturbThreshold = resolveConfig(device).disturb_streak; // default 4
    const disturbMemsMg = resolveConfig(device).disturb_mems_mg;   // net-vector disturbance floor

    // Two DIFFERENT day-scoped anchors — they must not be conflated:
    //   • dayStartIso — start of the report's EAT day. Used as the INCIDENT-TYING
    //     window so Disturbance → Geofence → Critical on the same device/day always
    //     share one incident (a new day is a new incident). This is NOT moved by a
    //     simulator reset, so simulating the geofence/critical AFTER the disturbance
    //     (even with a reset in between) still ties them to that day's disturbance.
    //   • countSince — same day start, but never earlier than a simulator-restart
    //     cutoff. Used ONLY as the disturbance COUNT lower bound, so each sim run
    //     restarts the 1-2-3-4 count (raise on the 4th, not the 1st).
    const atMs = Date.parse(at || "") || Date.now();
    const eat = new Date(atMs + 3 * 3600 * 1000);                  // shift to EAT wall clock
    const eatMidnightMs = Date.UTC(eat.getUTCFullYear(), eat.getUTCMonth(), eat.getUTCDate()) - 3 * 3600 * 1000;
    const dayStartIso = new Date(eatMidnightMs).toISOString();     // incident-tying window only
    // Disturbance count is CLOSE-driven, NOT day-scoped: it resets when the last
    // disturbance alarm is closed. The only extra floor is a simulator-reset cutoff.
    const simCut = getIncidentCutoff(device.id) || 0;
    const simCutIso = simCut ? new Date(simCut).toISOString() : null;

    // Raise a (non-disturbance) alarm + notify its site contacts. Returns the row
    // (null when de-duped within today's incident).
    async function raiseAndNotify(a) {
      try {
        const row = await insertLiveAlarm({
          alarmType: a.type, value: a.value, deviceIdText,
          site: device.site || null, serial: device.imei || rec.imei,
          // Alarm location is the SITE location (where the alarm belongs), falling
          // back to the device position only if the site has no coordinates.
          lat: site?.lat ?? a.lat, lng: site?.lng ?? a.lng,
          road: a.type === ALARM_TYPES.CRITICAL_MOTION ? road : undefined,
          at, incidentSince: dayStartIso,
        });
        if (row) {
          console.log(`[NOTIFY] firing for ${row.id} (${row.name}, ${row.priority}) site_id=${device.site_id}`);
          try { await notifyAlarmRaised(row, { siteId: device.site_id, deviceStatus: device.status, deviceArmed: device.armed, deviceMuteUntil: device.mute_until }); }
          catch (e) { console.error("[NOTIFY] hook error:", e?.message || e); }
        } else {
          console.log(`[alarm] ${a.type} not raised (already open in today's incident) — no notification`);
        }
        return row;
      } catch (e) { console.error("[alarm] insert error:", e?.message || e); return null; }
    }

    // ESCALATION ORDER (per device, per EAT day): Disturbance MUST be raised before
    // a Geofence alarm, and Geofence before Critical Motion — even when one packet
    // carries several. So we process disturbance first, then gate the rest on what
    // is already raised in the system. Other alarms (battery, temperature, offline,
    // low-data) are not part of the chain and fire normally.
    const isDisturbType = (ty) => ty === ALARM_TYPES.DISTURBANCE || ty === ALARM_TYPES.DISTURBANCE_TECH;

    // HEARTBEAT GATE. A clean idle report (status 00000008/09) with NO open/acked
    // Critical alarm is a heartbeat. It never raises DISTURBANCE (an idle check-in is
    // not a knock), but it CAN raise Geofence / Critical Motion if the device woke up
    // in an outside location — subject to the normal de-dupe (insertLiveAlarm won't
    // re-raise while one is open/acked), plus battery. Because a heartbeat requires NO
    // open/acked Critical to begin with, this is exactly "raise only if not already
    // open/acked". While a Critical is live the device isn't a heartbeat at all.
    let isHeartbeat = false;
    if (isHeartbeatStatus(rec.statusHex)) {
      try { isHeartbeat = !(await hasOpenCriticalAlarm(deviceIdText, device.imei || rec.imei)); }
      catch { isHeartbeat = false; }
    }
    if (isHeartbeat) {
      try { await recordHeartbeat(device.id); } catch {}
      const dropped = alarms.filter((a) => isDisturbType(a.type)).map((a) => a.type);
      if (dropped.length) console.log(`[heartbeat] ${deviceIdText} idle check-in — dropped disturbance ${dropped.join(",")} (geofence/critical still allowed)`);
      alarms = alarms.filter((a) => !isDisturbType(a.type));
    }

    const disturbAlarms = alarms.filter((a) => isDisturbType(a.type));
    const geoAlarms = alarms.filter((a) => a.type === ALARM_TYPES.GEOFENCE_EXIT);
    const critAlarms = alarms.filter((a) => a.type === ALARM_TYPES.CRITICAL_MOTION);
    const otherAlarms = alarms.filter((a) =>
      !isDisturbType(a.type) && a.type !== ALARM_TYPES.GEOFENCE_EXIT && a.type !== ALARM_TYPES.CRITICAL_MOTION);

    // --- 1) DISTURBANCE first (graduated: #1 ignore, #2/#3 SMS+email only, #4 raise) ---
    for (const a of disturbAlarms) {
      try {
        const dec = await disturbanceDecision(deviceIdText, a.type, at, disturbThreshold, simCutIso, disturbMemsMg);
        if (dec.action === "notify") {
          try {
            await notifyDisturbanceEarly({
              deviceIdText, serial: device.imei || rec.imei,
              site: device.site || null, siteId: device.site_id, at,
              count: dec.count, threshold: dec.threshold, deviceStatus: device.status, deviceArmed: device.armed, deviceMuteUntil: device.mute_until,
            });
          } catch (e) { console.error("[disturbance] early-notify error:", e?.message || e); }
          console.log(`[disturbance] ${deviceIdText} count=${dec.count}/${dec.threshold} → EARLY WARNING (sms/email, no alarm)`);
        } else if (dec.action === "raise") {
          const row = await insertLiveAlarm({
            alarmType: a.type, value: a.value, deviceIdText,
            site: device.site || null, serial: device.imei || rec.imei,
            lat: site?.lat ?? a.lat, lng: site?.lng ?? a.lng, at, incidentSince: dayStartIso,
          });
          if (row) {
            console.log(`[NOTIFY] firing for ${row.id} (${row.name}, ${row.priority}) site_id=${device.site_id}`);
            try { await notifyAlarmRaised(row, { siteId: device.site_id, deviceStatus: device.status, deviceArmed: device.armed, deviceMuteUntil: device.mute_until }); }
            catch (e) { console.error("[NOTIFY] hook error:", e?.message || e); }
          }
          console.log(`[disturbance] ${deviceIdText} count=${dec.count}/${dec.threshold} → RAISED ${row?.id || "(none)"}`);
        } else {
          console.log(`[disturbance] ${deviceIdText} count=${dec.count}/${dec.threshold} → ${dec.action}`);
        }
      } catch (e) { console.error("[disturbance] gate error:", e?.message || e); }
    }

    // ORDER, DON'T SUPPRESS. Each alarm fires on its OWN genuine condition (from the
    // engine) — a missing or closed earlier stage never blocks a later one. We just
    // process them in escalation order — Disturbance (above) → Geofence → Critical
    // Motion → others — so when several land in the SAME packet they're recorded in
    // that sequence. De-dupe (one open Geofence / one open Critical per device) and
    // incident grouping live in insertLiveAlarm, so the lifecycle still reads
    // Disturbance → Geofence → Critical under one incident, in true time order.

    // --- 2) GEOFENCE — fires whenever the device is genuinely off-site ---
    for (const a of geoAlarms) await raiseAndNotify(a);

    // --- 3) CRITICAL MOTION — fires whenever motion is genuinely critical ---
    for (const a of critAlarms) await raiseAndNotify(a);

    // --- 4) everything else (battery, temperature, offline, low-data) ---
    for (const a of otherAlarms) await raiseAndNotify(a);
  }

  return { unknown: !known, view };
}
