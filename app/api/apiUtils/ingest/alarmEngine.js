// app/api/apiUtils/ingest/alarmEngine.js
// -----------------------------------------------------------------------------
// Stateful alarm rules. `evaluate(t, device, site, state)` — `state` is a small
// per-device object the caller keeps between packets so we can reason about
// *sequences*, not just single packets.
//
// Model (agreed with user):
//   GEOFENCE_EXIT is the trigger. CRITICAL_MOTION is the escalation that follows:
//   the asset is moving *while off-site*.
//     • With GPS:   breach = outside 30 m; critical = breach AND speed ≥ 5 km/h.
//     • GPS lost:   distance is unknown, so critical comes from SUSTAINED MEMS
//                   movement (or the step counter climbing) across packets —
//                   *sustained* is what separates it from a DISTURBANCE (a
//                   one-off spike). GPS speed, when present, is the authority for
//                   motion; MEMS is only the fallback when there is no fix.
//   DISTURBANCE:   status 3rd digit == '1' (gospel), or a transient MEMS spike.
//   LOW_BATTERY:   battery % ≤ threshold (always).
//
//   Network-derived positions (cell/Wi-Fi) only count for the geofence when the
//   distance clearly exceeds the location accuracy (so a coarse fix near the site
//   doesn't false-trigger).
//
// state shape: { breached:boolean, dyn:number[], lastSteps:number|null }
// -----------------------------------------------------------------------------

export const ALARM_TYPES = {
  DISTURBANCE: "DISTURBANCE",
  DISTURBANCE_TECH: "DISTURBANCE_TECH",     // a disturbance while a tech is on site (Low)
  CRITICAL_MOTION: "CRITICAL_MOTION",
  LOW_BATTERY: "LOW_BATTERY",               // ≤ low_battery_pct  (Medium)
  CRITICAL_LOW_BATTERY: "CRITICAL_LOW_BATTERY", // ≤ critical_battery_pct (High)
  GEOFENCE_EXIT: "GEOFENCE_EXIT",
  HIGH_TEMPERATURE: "HIGH_TEMPERATURE",
  DEVICE_OFFLINE: "DEVICE_OFFLINE",
  LOW_DATA: "LOW_DATA",
  NOTIFICATION_FAILED: "NOTIFICATION_FAILED",
};

// Confirmed defaults (see claude/alarms-and-severity.md). Every one is overridable
// per device via devices.config, and editable per-device or in batch from the UI.
export const DEFAULTS = {
  low_battery_pct: 20,        // ≤ this and > critical => Low Battery (Medium)
  critical_battery_pct: 10,   // ≤ this => Critical Low Battery (High)
  high_temp_c: 55,            // > this => High Temperature (High)
  offline_hours: 24,          // last_seen older than this => Device Offline (High)
  low_data_mb: 1,             // SIM bundle ≤ this (MB) => Low Data (Medium)
  speed_alert_kph: 5,
  geofence_radius_m: 30,
  // NET accelerometer motion = |sqrt(x²+y²+z²) − 1000mg| (gravity removed;
  // orientation-independent since a resting cell reads ~1 g in any pose).
  disturb_mems_mg: 1800,  // net vector floor for a disturbance (rest idles ~1450 mg; below 1800 = still)
  motion_mems_mg: 3000,   // net vector ≥ this, sustained (≥2 in window) => Critical Motion
  window: 3,              // how many recent MEMS readings define "sustained"
  disturb_streak: 4,      // graduated disturbance rule (per EAT day, per device):
                          //   #1        -> ignore
                          //   #2, #3    -> early warning: SMS + email only (no system alarm)
                          //   #4        -> raise the system alarm (+ SMS + email)
                          //   #5+ / already open today -> event only
                          // This is the count at which the ALARM is raised.
  disturb_window_sec: 300, // the streak must accumulate within this window (5 min);
                           // if the run takes longer, the counter resets.
};

const numOr = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

// Editable alarm thresholds — the single source of truth shared by the engine,
// the config API and the editor UI. Each device stores overrides (flat keys) in
// devices.config; anything unset falls back to DEFAULTS.
export const THRESHOLD_FIELDS = [
  { key: "high_temp_c",          label: "High Temperature", unit: "°C",   min: 0,   max: 150,   tier: "High",     help: "Alarm when enclosure temp is above this." },
  { key: "low_battery_pct",      label: "Low Battery",      unit: "%",    min: 1,   max: 100,   tier: "Medium",   help: "Alarm at or below this charge." },
  { key: "critical_battery_pct", label: "Critical Battery", unit: "%",    min: 1,   max: 100,   tier: "High",     help: "Escalates to High at or below this charge." },
  { key: "offline_hours",        label: "Device Offline",   unit: "h",    min: 1,   max: 720,   tier: "High",     help: "Alarm when not seen for longer than this." },
  { key: "low_data_mb",          label: "Low Data",         unit: "MB",   min: 0,   max: 100000,tier: "Medium",   help: "Alarm when SIM bundle is at or below this." },
  { key: "geofence_radius_m",    label: "Geofence Radius",  unit: "m",    min: 5,   max: 100000,tier: "Critical", help: "Distance from site that counts as a violation." },
  { key: "speed_alert_kph",      label: "Critical Speed",   unit: "km/h", min: 1,   max: 300,   tier: "Critical", help: "Off-site speed that raises Critical Motion." },
  { key: "disturb_mems_mg",      label: "Disturbance",      unit: "mg",   min: 200, max: 8000,  tier: "Critical", help: "Net accelerometer motion (gravity removed) that counts as a disturbance. Rest idles ~1450 mg; below this = still." },
  { key: "motion_mems_mg",       label: "Critical Motion",  unit: "mg",   min: 200, max: 8000,  tier: "Critical", help: "Net accelerometer motion (gravity removed), sustained, that raises Critical Motion." },
];

export function resolveConfig(device) {
  const c = (device && device.config) || {};
  // Prefer flat editor keys; fall back to the legacy nested Add-device shape.
  return {
    low_battery_pct: numOr(c.low_battery_pct, DEFAULTS.low_battery_pct),
    critical_battery_pct: numOr(c.critical_battery_pct, DEFAULTS.critical_battery_pct),
    high_temp_c: numOr(c.high_temp_c, DEFAULTS.high_temp_c),
    offline_hours: numOr(c.offline_hours, DEFAULTS.offline_hours),
    low_data_mb: numOr(c.low_data_mb, DEFAULTS.low_data_mb),
    speed_alert_kph: numOr(c.speed_alert_kph, DEFAULTS.speed_alert_kph),
    geofence_radius_m: numOr(c.geofence_radius_m, numOr(c.geofence?.radius_m, DEFAULTS.geofence_radius_m)),
    geofence_enabled: c.geofence?.enabled !== false,
    disturb_mems_mg: numOr(c.disturb_mems_mg, numOr(c.disturbance?.mems_mg, DEFAULTS.disturb_mems_mg)),
    motion_mems_mg: numOr(c.motion_mems_mg, numOr(c.motion?.mems_mg, DEFAULTS.motion_mems_mg)),
    window: numOr(c.window, numOr(c.motion?.window, DEFAULTS.window)),
    disturb_streak: Math.max(1, numOr(c.disturb_streak, DEFAULTS.disturb_streak)),
    disturb_window_sec: Math.max(30, numOr(c.disturb_window_sec, DEFAULTS.disturb_window_sec)),
  };
}

export function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

/**
 * @param {object} ctx  optional per-evaluation context:
 *   { techOnSite:boolean }  — true when a technician is booked/present at the
 *   device's site right now. Only affects DISTURBANCE (it downgrades to Low).
 *   Supplied by store.js via the (currently inert) isTechOnSite() hook.
 */
export function evaluate(t, device, site, state = {}, ctx = {}) {
  const c = resolveConfig(device);
  const alarms = [];
  const name = device?.device_id || device?.imei || t.imei;
  if (!Array.isArray(state.dyn)) state.dyn = [];
  if (typeof state.breached !== "boolean") state.breached = false;

  const hasPos = t.lat != null && t.lng != null && site && site.lat != null && site.lng != null;
  const at = { lat: t.lat ?? null, lng: t.lng ?? null };
  let dist = null;

  // ---- geofence ----
  if (hasPos) {
    dist = haversineMeters(Number(site.lat), Number(site.lng), at.lat, at.lng);
    // GPS uses the set geofence radius (fix is ≈ ±10 m). A NETWORK fix (Wi-Fi / LBS /
    // Wi-Fi+LBS) is far coarser, so we require the device to be beyond the zone by MORE
    // than the fix's ± blur: breach only when dist > geofence_radius + accuracy. That
    // respects the set radius AND the accuracy, so a coarse fix near a small site (or a
    // mid-range fix inside a large site) never false-fires. Unknown accuracy ⇒ radius.
    const netThreshold = c.geofence_radius_m + (t.accuracy && t.accuracy > 0 ? t.accuracy : 0);
    if (t.fixValid) {
      state.breached = dist > c.geofence_radius_m;
    } else {
      state.breached = dist > netThreshold;
    }
    if (c.geofence_enabled && state.breached) {
      alarms.push({ type: ALARM_TYPES.GEOFENCE_EXIT, severity: "warning",
        message: t.fixValid
          ? `Geofence exit — ${name} is ${Math.round(dist)} m from site (radius ${c.geofence_radius_m} m)`
          : `Geofence exit — ${name} is ${Math.round(dist)} m from site (network-located; beyond ${c.geofence_radius_m} m radius + ±${Math.round(t.accuracy || 0)} m accuracy)`,
        ...at, value: Math.round(dist) });
    }
  }
  // if there's no position at all, keep the previous breached state.

  // ---- MEMS window ----
  const dyn = t.mems && t.mems.valid ? t.mems.dynamic : null;   // NET vector = |√(x²+y²+z²) − 1000| mg
  if (dyn != null) { state.dyn.push(dyn); while (state.dyn.length > c.window) state.dyn.shift(); }
  const elevated = state.dyn.filter((v) => v >= c.motion_mems_mg).length;
  const sustained = elevated >= 2;                                     // ≥2 of the window
  // Step count is stored as data but is NOT a movement trigger — it ticks even on a
  // stationary unit, so it must never raise Critical Motion (per the device's behaviour).
  if (t.steps != null) state.lastSteps = t.steps;

  // ---- critical motion (escalation after geofence) ----
  let critical = false, critVal = null;
  if (t.fixValid) {
    // GPS is the authority: must be off-site AND moving.
    if (state.breached && t.speed != null && t.speed >= c.speed_alert_kph) { critical = true; critVal = `${t.speed} km/h`; }
  } else {
    // No fix: ONLY a sustained net accelerometer vector counts (≥ motion_mems_mg,
    // ≥2 in the window). No step-count or single-spike shortcut.
    if (sustained) { critical = true; critVal = `impact ${Math.max(...state.dyn)} mg (sustained)`; }
  }
  if (critical) {
    alarms.push({ type: ALARM_TYPES.CRITICAL_MOTION, severity: "critical",
      message: `Critical motion — ${name} moving${t.fixValid ? " off-site" : " (no GPS)"} · ${critVal}`,
      ...at, value: critVal });
  }

  // ---- disturbance (gospel status bit) ----
  // Emit a Disturbance CANDIDATE whenever the 00100008 status bit is present. The
  // decision to actually raise the alarm is NOT made here — it's made downstream in
  // disturbanceDecision() against the stored telemetry, so it can count the day's
  // disturbance reports and de-dupe against an already-open alarm:
  //     count 1-3 → skip · count 4 → log the alarm · 5+ (or one already open today)
  //     → log the event only · a new EAT day raises a fresh alarm regardless.
  // Counting from the DB (not an in-memory streak) survives restarts and never
  // double-fires. If a technician is on site the disturbance is expected work, so
  // it downgrades to the Low "tech on site" type (this alarm only).
  // Disturbance = the status byte's 3rd digit is 1, OR the NET vector is in the
  // disturbance band (≥ disturb_mems_mg). Either source makes this a candidate; the
  // graduated raise (2nd/3rd warn, 4th raise) is decided downstream in
  // disturbanceDecision, which counts BOTH sources from stored telemetry.
  const disturbBit = !!(t.status && t.status.disturbance);
  const disturbMems = dyn != null && dyn >= c.disturb_mems_mg;
  if (disturbBit || disturbMems) {
    const techOnSite = !!ctx.techOnSite;
    const why = disturbBit ? `status ${t.status?.word}` : `${dyn} mg net`;
    alarms.push({
      type: techOnSite ? ALARM_TYPES.DISTURBANCE_TECH : ALARM_TYPES.DISTURBANCE,
      severity: techOnSite ? "info" : "critical",
      message: techOnSite
        ? `Disturbance on ${name} — technician on site`
        : `Disturbance on ${name} (${why})`,
      ...at, value: t.status?.word || `${dyn}mg` });
  }

  // ---- battery: Critical Low (≤ critical %) is HIGH; Low Battery (≤ %) is MEDIUM
  //      (per contract — neither is a Critical-tier alarm). ----
  if (t.battery != null && t.battery <= c.critical_battery_pct) {
    alarms.push({ type: ALARM_TYPES.CRITICAL_LOW_BATTERY, severity: "warning",
      message: `Critical low battery — ${name} at ${t.battery}% (critical ≤ ${c.critical_battery_pct}%)`,
      ...at, value: t.battery });
  } else if (t.battery != null && t.battery <= c.low_battery_pct) {
    alarms.push({ type: ALARM_TYPES.LOW_BATTERY, severity: "info",
      message: `Low battery — ${name} at ${t.battery}% (threshold ${c.low_battery_pct}%)`,
      ...at, value: t.battery });
  }

  // ---- high temperature (enclosure °C from the MEMS tail; sensor is independent
  //      of the MEMS validity flag, so read temp even when x/y/z are void) ----
  const temp = t.mems && t.mems.temp != null ? Number(t.mems.temp) : null;
  if (temp != null && Number.isFinite(temp) && temp > c.high_temp_c) {
    alarms.push({ type: ALARM_TYPES.HIGH_TEMPERATURE, severity: "warning",
      message: `High temperature — ${name} at ${temp}°C (threshold ${c.high_temp_c}°C)`,
      ...at, value: temp });
  }

  return alarms;
}
