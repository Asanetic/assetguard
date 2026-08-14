// app/api/apiUtils/ingest/store.js
// Parse a packet, resolve position, store telemetry, and raise alarms — for BOTH
// registered and unregistered devices, so everything is visible in TCP logs.
//   parse -> lookup device by IMEI (found or not) -> geolocate (if no fix)
//         -> insert device_telemetry -> alarm engine -> (registered) update state + alarms
// Unregistered IMEIs are still stored (device_id NULL) and also quarantined in
// unknown_logs, so you can see exactly what's arriving before you register them.
import { findDeviceByImei, touchDeviceLastSeen } from "../dataControl/devices.js";
import { insertDeviceLog, insertUnknownLog } from "../dataControl/deviceLogs.js";
import { insertTelemetry, updateDeviceState, getSiteLatLng } from "../dataControl/telemetry.js";
import { insertLiveAlarm, clearOpenAlarm, disturbanceDecision } from "../dataControl/alarms.js";
import { toTelemetry } from "./parse.js";
import { evaluate, resolveConfig, ALARM_TYPES } from "./alarmEngine.js";
import { notifyAlarmRaised } from "../notify/alarmNotify.js";
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

  // --- resolve position BEFORE writing the row ---
  if (t.fixValid) {
    t.accuracy = 10; t.locSource = "gps"; t.geoError = null;
    view.geo = { source: "gps", lat: t.lat, lng: t.lng, accuracy: 10 };
    console.log(`[ingest] ${rec.imei} GPS fix ${t.lat},${t.lng} ±10m`);
  } else if (t.cells.length || t.wifi.length) {
    t.locSource = "network";
    try {
      const g = await geolocate({ cells: t.cells, wifi: t.wifi, mcc: t.mcc, mnc: t.mnc });
      t.geoRaw = g.raw ?? null;
      if (g.location && g.location.lat != null) {
        t.lat = g.location.lat; t.lng = g.location.lng; t.accuracy = g.location.accuracy;
        t.networkLocated = true; t.geoError = null; t.locSource = g.source || "network";
        view.geo = { source: t.locSource, lat: t.lat, lng: t.lng, accuracy: t.accuracy, raw: g.raw };
        console.log(`[ingest] ${rec.imei} geolocation OK (${t.locSource}) ${t.lat},${t.lng} ±${t.accuracy}m (from ${t.cells.length} cells, ${t.wifi.length} wifi)`);
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
    const simCut = getIncidentCutoff(device.id) || 0;
    const dayStartIso = new Date(eatMidnightMs).toISOString();
    const countSince = new Date(Math.max(eatMidnightMs, simCut)).toISOString();

    for (const a of alarms) {
      const isDisturb = a.type === ALARM_TYPES.DISTURBANCE || a.type === ALARM_TYPES.DISTURBANCE_TECH;

      // Disturbance day-rule: skip the day's 1st-3rd, log the alarm on the 4th, and
      // for the 5th+ (or if one is already open today) log the event only. A new EAT
      // day raises a fresh alarm regardless of an un-closed one from a previous day.
      if (isDisturb) {
        try {
          const dec = await disturbanceDecision(deviceIdText, a.type, at, disturbThreshold, countSince);
          if (dec.action === "raise") {
            const row = await insertLiveAlarm({
              alarmType: a.type, value: a.value, deviceIdText,
              site: device.site || null, serial: device.imei || rec.imei,
              lat: site?.lat ?? a.lat, lng: site?.lng ?? a.lng,
              at, incidentSince: dayStartIso,
            });
            // Every CRITICAL alarm that is actually raised notifies the site's contacts.
            if (row?.priority === "Critical") {
              console.log(`[NOTIFY] firing for ${row.id} (${row.name}) site_id=${device.site_id}`);
              try { await notifyAlarmRaised(row, { siteId: device.site_id }); }
              catch (e) { console.error("[NOTIFY] hook error:", e?.message || e); }
            } else if (!row) {
              console.log(`[disturbance] raise decided but alarm was de-duped (already open) — no notification`);
            }
            console.log(`[disturbance] ${deviceIdText} count=${dec.count}/${dec.threshold} → RAISED ${row?.id || "(none)"}`);
          } else {
            // skip (1-3) or event (5+/already open today) — the telemetry row is the log.
            console.log(`[disturbance] ${deviceIdText} count=${dec.count}/${dec.threshold} → ${dec.action}`);
          }
        } catch (e) { console.error("[disturbance] gate error:", e?.message || e); }
        continue;
      }

      try {
        const row = await insertLiveAlarm({
          alarmType: a.type, value: a.value, deviceIdText,
          site: device.site || null, serial: device.imei || rec.imei,
          // Alarm location is the SITE location (where the alarm belongs), not the
          // device's current position. Fall back to device position only if the
          // site has no coordinates.
          lat: site?.lat ?? a.lat, lng: site?.lng ?? a.lng,
          road: a.type === ALARM_TYPES.CRITICAL_MOTION ? road : undefined,
          // Alarm time = the packet's own timestamp, so "x min ago" is real.
          // Tie by EAT day (not the reset cutoff) so escalations attach to the
          // day's disturbance even when simulated as a separate step.
          at, incidentSince: dayStartIso,
        });
        // Every CRITICAL alarm that is actually raised notifies the site's contacts.
        if (row?.priority === "Critical") {
          console.log(`[NOTIFY] firing for ${row.id} (${row.name}) site_id=${device.site_id}`);
          try { await notifyAlarmRaised(row, { siteId: device.site_id }); }
          catch (e) { console.error("[NOTIFY] hook error:", e?.message || e); }
        } else if (!row) {
          console.log(`[alarm] ${a.type} not raised (already open in today's incident) — no notification`);
        }
      } catch (e) { console.error("[alarm] insert error:", e?.message || e); }
    }
  }

  return { unknown: !known, view };
}
