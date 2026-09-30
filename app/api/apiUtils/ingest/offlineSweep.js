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
import { insertLiveAlarm, clearOpenAlarm } from "../dataControl/alarms.js";
import { hasOpenCriticalAlarm, reconcilePowerOffs } from "../dataControl/deviceCommands.js";
import { deviceDataUsage } from "../dataControl/dataUsage.js";
import { query } from "../s_env/db.js";
import { DEFAULTS, ALARM_TYPES } from "./alarmEngine.js";

// LOW_DATA fires when a device's remaining bundle drops to 10% (or less) of what
// it was assigned; it clears again once the bundle is reset or auto-renews.
const LOW_DATA_PCT = 0.10;

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
    // Power-off reconcile: a pwroff that got no ack but the device then went silent
    // means it powered off → set it Inactive + "Powered off". (Devices that ack are
    // already handled instantly in onReply.)
    try { await reconcilePowerOffs({ graceMin: 15 }); }
    catch (e) { console.error("[offlineSweep] poweroff reconcile error:", e?.message || e); }
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
    // Auto-end missions whose alarm was closed 3+ hours ago but the responder
    // never pressed "End mission". Backend-only — the deployed response app is
    // not touched. No photo is required for an administrative auto-close.
    try {
      const { autoEndStaleMissions } = await import("../dataControl/missions.js");
      const n = await autoEndStaleMissions(3);
      if (n) console.log(`[offlineSweep] auto-ended ${n} mission(s) on long-closed alarms`);
    } catch (e) { console.error("[offlineSweep] mission auto-end error:", e?.message || e); }

    // LOW DATA: every active device with a bundle — raise when ≤10% remains,
    // clear when it has recovered (a reset or the monthly/annual auto-renew).
    try {
      const { rows: devs } = await query(
        `SELECT d.id, d.device_id, d.imei, d.config, s.name AS site
           FROM devices d
           LEFT JOIN sites s ON s.id = d.site_id
          WHERE lower(COALESCE(d.status,'')) NOT IN ('inactive','maintenance')`
      );
      let lowData = 0;
      for (const d of devs) {
        let u;
        try { u = await deviceDataUsage(d); } catch { continue; }
        const assigned = Number(u?.assigned_mb) || 0;
        const remaining = u?.remaining_mb;
        if (!assigned || remaining == null) continue;   // no bundle → nothing to warn on
        const idText = d.device_id || d.imei;
        if (remaining <= assigned * LOW_DATA_PCT) {
          try {
            const row = await insertLiveAlarm({
              alarmType: ALARM_TYPES.LOW_DATA,
              value: remaining,                 // "Low Data — N MB left"
              deviceIdText: idText,
              site: d.site || null, serial: d.imei || null,
            });
            if (row) lowData++;
          } catch (e) { console.error("[offlineSweep] low-data insert:", e?.message || e); }
        } else {
          // Recovered above the threshold — resolve any open Low Data alarm.
          try { await clearOpenAlarm(idText, ALARM_TYPES.LOW_DATA); } catch {}
        }
      }
      if (lowData) console.log(`[offlineSweep] ${lowData} low-data alarm(s) raised`);
    } catch (e) { console.error("[offlineSweep] low-data check:", e?.message || e); }
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

  // Test-alarm auto-close on a TIGHT 1-min cadence, so a test alarm closes right at
  // the 30-minute mark (not up to 15 min later, on the main sweep).
  const closeTests = async () => {
    try {
      const { closeStaleTestAlarms } = await import("../dataControl/alarms.js");
      const n = await closeStaleTestAlarms(30);
      if (n) console.log(`[offlineSweep] auto-closed ${n} test alarm(s) at 30 min`);
    } catch (e) { console.error("[offlineSweep] test-close error:", e?.message || e); }
  };
  setTimeout(closeTests, 15 * 1000);
  const testTimer = setInterval(closeTests, 60 * 1000);
  if (testTimer.unref) testTimer.unref();

  console.log("[offlineSweep] started (offline every 15 min · test-close every 1 min)");
}
