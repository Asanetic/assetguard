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
import { insertLiveAlarm } from "../dataControl/alarms.js";
import { toTelemetry } from "./parse.js";
import { evaluate } from "./alarmEngine.js";
import { geolocate } from "./geolocate.js";

// Per-device motion/geofence state (keyed by device id, or imei when unregistered).
function motionState(key) {
  if (!globalThis.__agMotion) globalThis.__agMotion = new Map();
  let s = globalThis.__agMotion.get(key);
  if (!s) { s = { breached: false, dyn: [], lastSteps: null }; globalThis.__agMotion.set(key, s); }
  return s;
}

export async function resolveAndStore(rec, ip, port) {
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
  let alarms = [];
  try { alarms = evaluate(t, devForEngine, site, motionState(known ? device.id : `imei:${rec.imei}`)) || []; } catch (e) { console.error("[ingest] engine error:", e.message); }
  const alarmTypes = alarms.map((a) => a.type);
  view.alarms = alarms;

  // 3) normalized telemetry — stored for BOTH known and unknown (device_id may be NULL)
  let telemetryId = null;
  try {
    telemetryId = await insertTelemetry({ ...t, deviceId: device?.id ?? null, siteId: device?.site_id ?? null, ip, port, alarms: alarmTypes });
  } catch (e) { console.error("[ingest] telemetry insert error:", e.message); }

  // 4) registered devices: keep live state fresh + persist alarms to All Alarms/speaker
  if (known) {
    try { await updateDeviceState(device.id, t); } catch { try { await touchDeviceLastSeen(device.id); } catch {} }
    for (const a of alarms) {
      try {
        await insertLiveAlarm({
          alarmType: a.type, value: a.value,
          deviceIdText: device.device_id || device.imei,
          site: device.site || null, serial: device.imei || rec.imei,
          lat: a.lat, lng: a.lng,
        });
      } catch {}
    }
  }

  return { unknown: !known, view };
}
