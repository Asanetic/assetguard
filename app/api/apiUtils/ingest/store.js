// app/api/apiUtils/ingest/store.js
// Resolve a parsed packet to a device + site and persist it.
//   IMEI (field 2) -> devices row -> device.site_id -> sites row
// Unknown IMEI -> quarantine table + flagged for the "unregistered device" view.
import { findDeviceByImei, touchDeviceLastSeen } from "../dataControl/devices.js";
import { insertDeviceLog, insertUnknownLog } from "../dataControl/deviceLogs.js";

export async function resolveAndStore(rec, ip, port) {
  const view = {
    receivedAt: new Date().toISOString(),
    imei: rec.imei, cmd: rec.cmd,
    fix: rec.fix ?? null, lat: rec.lat ?? null, lng: rec.lng ?? null,
    speed: rec.speed ?? null, course: rec.course ?? null,
    deviceTime: rec.deviceTime ?? null, statusHex: rec.statusHex ?? null,
    src: `${ip || "?"}:${port || 0}`,
    deviceName: null, siteName: null, siteId: null, unknown: false,
  };

  let device = null;
  try { device = await findDeviceByImei(rec.imei); } catch (e) { /* table may be missing */ }

  if (!device) {
    try { await insertUnknownLog({ imei: rec.imei, raw: rec.raw, ip, port }); } catch {}
    view.unknown = true;
    return { unknown: true, view };
  }

  view.deviceName = device.device_id || device.imei;
  view.siteName = device.site || null;
  view.siteId = device.site_id || null;

  // Persist location/alarm packets; heartbeats (LK) only bump last_seen.
  if (rec.cmd === "UD" || rec.cmd === "UD2" || rec.cmd === "AL") {
    try {
      await insertDeviceLog({
        deviceId: device.id, siteId: device.site_id, imei: rec.imei,
        deviceTime: rec.deviceTime, fix: rec.fix, lat: rec.lat, lng: rec.lng,
        speed: rec.speed, course: rec.course, statusHex: rec.statusHex,
        event: rec.cmd === "AL" ? "Alarm" : null,
        mcc: rec.mcc, mnc: rec.mnc, lac: rec.lac, cellId: rec.cellId,
        raw: rec.raw, ip, port,
      });
    } catch {}
  }
  try { await touchDeviceLastSeen(device.id); } catch {}

  return { unknown: false, view };
}
