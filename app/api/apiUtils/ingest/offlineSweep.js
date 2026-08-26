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
import { listStaleDevices, setDeviceStatus } from "../dataControl/devices.js";
import { insertLiveAlarm } from "../dataControl/alarms.js";
import { hasOpenCriticalAlarm } from "../dataControl/deviceCommands.js";
import { DEFAULTS, ALARM_TYPES } from "./alarmEngine.js";

const SWEEP_MS = 15 * 60 * 1000; // 15 min cadence

export async function runOfflineSweep() {
  let raised = 0, inactivated = 0;
  try {
    const stale = await listStaleDevices(DEFAULTS.offline_hours);
    for (const d of stale) {
      const hrs = Math.floor(Number(d.hours_silent) || 0);
      const age = hrs >= 48 ? `${Math.floor(hrs / 24)} d` : `${hrs} h`;
      const idText = d.device_id || d.imei;
      // A device that went dark WHILE a Critical alarm is open/acked was taken down
      // by the incident — mark it INACTIVE (sticky, manual-exit), not Offline.
      let inIncident = false;
      try { inIncident = await hasOpenCriticalAlarm(idText, d.imei); } catch { inIncident = false; }
      if (inIncident) {
        try {
          if (String(d.status || "").toLowerCase() !== "inactive") {
            await setDeviceStatus(d.id, "Inactive");
            inactivated++;
            console.log(`[offlineSweep] ${idText} silent during a Critical incident → set INACTIVE`);
          }
        } catch (e) { console.error("[offlineSweep] set-inactive error:", e?.message || e); }
        continue; // no Offline alarm for an incident-downed device
      }
      // Routine miss: raise Device Offline (auto-clears when a packet next arrives).
      try {
        const row = await insertLiveAlarm({
          alarmType: ALARM_TYPES.DEVICE_OFFLINE,
          value: age,
          deviceIdText: idText,
          site: d.site || null, serial: d.imei || null,
        });
        if (row) raised++;
      } catch (e) { console.error("[offlineSweep] insert error:", e?.message || e); }
    }
    if (stale.length) console.log(`[offlineSweep] ${stale.length} past window → ${raised} offline alarm(s), ${inactivated} set inactive`);
    // Reconcile site status from devices (all offline → site Offline, etc.).
    try {
      const { recomputeAllSiteStatuses } = await import("../dataControl/sites.js");
      await recomputeAllSiteStatuses();
    } catch (e) { console.error("[offlineSweep] site recompute error:", e?.message || e); }
    // Drill mode: auto-close test alarms older than 30 min so they don't linger.
    try {
      const { closeStaleTestAlarms } = await import("../dataControl/alarms.js");
      const n = await closeStaleTestAlarms(30);
      if (n) console.log(`[offlineSweep] auto-closed ${n} stale test alarm(s)`);
    } catch (e) { console.error("[offlineSweep] test-alarm close error:", e?.message || e); }
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
