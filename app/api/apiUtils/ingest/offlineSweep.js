// app/api/apiUtils/ingest/offlineSweep.js
// -----------------------------------------------------------------------------
// Device Offline detection. No packet can raise "offline" — it's the ABSENCE of
// packets — so a periodic sweep does it: every 15 min, any enrolled device whose
// last_seen is older than its offline window (config.offline_hours, default 24 h)
// raises a DEVICE_OFFLINE (High) alarm. insertLiveAlarm de-dupes per (device,type)
// so a device that stays offline doesn't stack rows. When the device reports again,
// store.js calls clearOpenAlarm(...) to close the offline alarm automatically.
//
// Runs in-process (like the port listeners). ensureOfflineSweep() is idempotent —
// it starts the interval once per process and is safe to call from any route.
// -----------------------------------------------------------------------------
import { listStaleDevices } from "../dataControl/devices.js";
import { insertLiveAlarm } from "../dataControl/alarms.js";
import { DEFAULTS, ALARM_TYPES } from "./alarmEngine.js";

const SWEEP_MS = 15 * 60 * 1000; // 15 min cadence

export async function runOfflineSweep() {
  let raised = 0;
  try {
    const stale = await listStaleDevices(DEFAULTS.offline_hours);
    for (const d of stale) {
      const hrs = Math.floor(Number(d.hours_silent) || 0);
      const age = hrs >= 48 ? `${Math.floor(hrs / 24)} d` : `${hrs} h`;
      try {
        const row = await insertLiveAlarm({
          alarmType: ALARM_TYPES.DEVICE_OFFLINE,
          value: age,
          deviceIdText: d.device_id || d.imei,
          site: d.site || null, serial: d.imei || null,
        });
        if (row) raised++;
      } catch (e) { console.error("[offlineSweep] insert error:", e?.message || e); }
    }
    if (stale.length) console.log(`[offlineSweep] ${stale.length} device(s) past offline window, ${raised} new alarm(s)`);
  } catch (e) {
    console.error("[offlineSweep] error:", e?.message || e);
  }
  return raised;
}

export function ensureOfflineSweep() {
  const g = globalThis;
  if (g.__agOfflineSweep) return;
  g.__agOfflineSweep = true;
  // kick one shortly after boot, then on the cadence
  setTimeout(() => { runOfflineSweep(); }, 10 * 1000);
  const timer = setInterval(() => { runOfflineSweep(); }, SWEEP_MS);
  if (timer.unref) timer.unref(); // don't hold the event loop open
  console.log("[offlineSweep] started (every 15 min)");
}
