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
  CRITICAL_MOTION: "CRITICAL_MOTION",
  LOW_BATTERY: "LOW_BATTERY",
  GEOFENCE_EXIT: "GEOFENCE_EXIT",
  DEVICE_OFFLINE: "DEVICE_OFFLINE",
};

const DEFAULTS = {
  low_battery_pct: 20,
  speed_alert_kph: 5,
  geofence_radius_m: 30,
  disturb_mems_mg: 300,   // transient spike => disturbance
  motion_mems_mg: 600,    // elevated reading; ≥2 in the window => sustained (critical)
  window: 3,              // how many recent MEMS readings define "sustained"
};

const numOr = (v, d) => { const n = Number(v); return Number.isFinite(n) ? n : d; };

export function resolveConfig(device) {
  const c = (device && device.config) || {};
  return {
    low_battery_pct: numOr(c.low_battery_pct, DEFAULTS.low_battery_pct),
    speed_alert_kph: numOr(c.speed_alert_kph, DEFAULTS.speed_alert_kph),
    geofence_radius_m: numOr(c.geofence?.radius_m, DEFAULTS.geofence_radius_m),
    geofence_enabled: c.geofence?.enabled !== false,
    disturb_mems_mg: numOr(c.disturbance?.mems_mg, DEFAULTS.disturb_mems_mg),
    motion_mems_mg: numOr(c.motion?.mems_mg, DEFAULTS.motion_mems_mg),
    window: numOr(c.motion?.window, DEFAULTS.window),
  };
}

export function haversineMeters(aLat, aLng, bLat, bLng) {
  const R = 6371000, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat), dLng = toRad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(s)));
}

export function evaluate(t, device, site, state = {}) {
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
    if (t.fixValid) {
      state.breached = dist > c.geofence_radius_m;                    // GPS ≈ ±10 m
    } else {
      // network-derived: only "outside" when clearly beyond the accuracy blur
      state.breached = dist > c.geofence_radius_m && dist > (t.accuracy || 0);
    }
    if (c.geofence_enabled && state.breached) {
      alarms.push({ type: ALARM_TYPES.GEOFENCE_EXIT, severity: "warning",
        message: `Geofence exit — ${name} is ${Math.round(dist)} m from site (radius ${c.geofence_radius_m} m${t.locSource === "network" ? ", network-located" : ""})`,
        ...at, value: Math.round(dist) });
    }
  }
  // if there's no position at all, keep the previous breached state.

  // ---- MEMS window + steps ----
  const dyn = t.mems && t.mems.valid ? t.mems.dynamic : null;
  if (dyn != null) { state.dyn.push(dyn); while (state.dyn.length > c.window) state.dyn.shift(); }
  const elevated = state.dyn.filter((v) => v >= c.motion_mems_mg).length;
  const sustained = elevated >= 2;                                     // ≥2 of the window
  let stepMoving = false;
  if (t.steps != null) { if (state.lastSteps != null && t.steps > state.lastSteps) stepMoving = true; state.lastSteps = t.steps; }

  // ---- critical motion (escalation after geofence) ----
  let critical = false, critVal = null;
  if (t.fixValid) {
    // GPS is the authority: must be off-site AND moving.
    if (state.breached && t.speed != null && t.speed >= c.speed_alert_kph) { critical = true; critVal = `${t.speed} km/h`; }
  } else {
    // No fix: sustained MEMS movement or a climbing step count => critical.
    if (sustained) { critical = true; critVal = `impact ${Math.max(...state.dyn)} mg (sustained)`; }
    else if (stepMoving) { critical = true; critVal = `steps ${t.steps}`; }
  }
  if (critical) {
    alarms.push({ type: ALARM_TYPES.CRITICAL_MOTION, severity: "critical",
      message: `Critical motion — ${name} moving${t.fixValid ? " off-site" : " (no GPS)"} · ${critVal}`,
      ...at, value: critVal });
  }

  // ---- disturbance (gospel status bit, or a transient spike that isn't sustained) ----
  const disturbBit = !!(t.status && t.status.disturbance);
  const transientSpike = dyn != null && dyn >= c.disturb_mems_mg && !sustained && !critical;
  if (disturbBit || transientSpike) {
    alarms.push({ type: ALARM_TYPES.DISTURBANCE, severity: "critical",
      message: disturbBit ? `Disturbance on ${name} (status ${t.status.word})` : `Disturbance on ${name} (impact ${dyn} mg)`,
      ...at, value: disturbBit ? t.status.word : dyn });
  }

  // ---- low battery (always on the %) ----
  if (t.battery != null && t.battery <= c.low_battery_pct) {
    alarms.push({ type: ALARM_TYPES.LOW_BATTERY,
      severity: t.battery <= Math.min(10, c.low_battery_pct / 2) ? "critical" : "warning",
      message: `Low battery — ${name} at ${t.battery}% (threshold ${c.low_battery_pct}%)`,
      ...at, value: t.battery });
  }

  return alarms;
}
