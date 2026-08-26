// app/api/apiUtils/ingest/heartbeat.js
// -----------------------------------------------------------------------------
// Heartbeat classification + timing.
//
// A HEARTBEAT is the device's scheduled idle report — it is DATA (position, or
// Wi-Fi/LBS, or no fix), not the bare keepalive. It is identified by:
//   • status word exactly "00000008" or "00000009" (clean: no disturbance bit,
//     no other alarm flag), AND
//   • the device has NO open/acked Critical alarm (while a critical is live the
//     device is in incident/tracking mode, not heartbeat mode).
//
// From a heartbeat we update position + battery + last_seen and raise ONLY battery
// alarms (Low Battery / Critical Low Battery). Disturbance / Geofence / Critical
// Motion are never raised off a heartbeat.
//
// The wake interval (config.wake_interval_sec, default 86400 = 24 h) drives both
// the next-heartbeat prediction and the offline timeout. Tolerance is ±5 min
// (config.hb_tolerance_sec, default 300) — a 10-minute window that absorbs the
// device clock's ±1–2 min wobble.
// -----------------------------------------------------------------------------

const HEARTBEAT_STATUS = new Set(["00000008", "00000009"]);

/** True if the status word marks a clean idle report (heartbeat candidate). */
export function isHeartbeatStatus(statusHex) {
  return HEARTBEAT_STATUS.has(String(statusHex || "").trim());
}

/** Wake interval (seconds) for a device — config.wake_interval_sec, falling back
 *  to a legacy offline_hours setting, else 24 h. */
export function wakeIntervalSec(config) {
  const c = config || {};
  const w = Number(c.wake_interval_sec);
  if (Number.isFinite(w) && w > 0) return w;
  const oh = Number(c.offline_hours);
  if (Number.isFinite(oh) && oh > 0) return oh * 3600;
  return 86400;
}

/** Heartbeat tolerance (seconds) — ±this around the predicted time. Default 300. */
export function hbToleranceSec(config) {
  const t = Number((config || {}).hb_tolerance_sec);
  return Number.isFinite(t) && t >= 0 ? t : 300;
}
