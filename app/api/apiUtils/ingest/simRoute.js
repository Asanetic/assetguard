// app/api/apiUtils/ingest/simRoute.js
// Build a moving GL-28 route that walks the FULL critical-alarm procedure in order,
// paced ~2 minutes apart, so Playback + the lifecycle log tell a clean story:
//   1) Disturbance  — near the site (motion byte 00100008)
//   2) Geofence     — the vehicle drives out past the fence
//   3) Critical Motion — a 92 km/h spike while off-site
// then it heads back. Timestamps are spread across the window so the telemetry
// timeline reconstructs exactly. Pure string building — no I/O.
import { buildUD } from "./simPackets.js";

export function buildCriticalRoute({ imei, lat, lng, start, paceSec = 120, stepSec = 20 } = {}) {
  const baseLat = Number(lat), baseLng = Number(lng);
  const startMs = start instanceof Date ? start.getTime() : Number(start) || 0;
  const pace = Math.max(30, Number(paceSec) || 120);
  const step = Math.max(5, Number(stepSec) || 20);

  const tD = pace;          // disturbance   (near site)
  const tG = 2 * pace;      // geofence exit (crossing the fence)
  const tC = 3 * pace;      // critical motion (far out, 92 km/h)
  const total = 5 * pace;   // + response/return tail
  const N = Math.floor(total / step) + 1;

  // distance from the site over time (km) — inside the fence, then out past it.
  function kmAt(t) {
    if (t < tG - 20) return 0.03;                                   // near site
    if (t < tG + 20) { const f = (t - (tG - 20)) / 40; return 0.05 + f * 3.0; }   // cross fence
    if (t < tC)      { const f = (t - (tG + 20)) / (tC - (tG + 20)); return 3.05 + f * 1.6; } // drive further out
    if (t < total)   { const f = (t - tC) / (total - tC); return Math.max(0.3, 4.65 - f * 4.3); } // return home
    return 0.3;
  }
  // NE bearing; convert km → degrees (≈111 km/deg), split diagonally so the
  // straight-line distance from the site is ~kmAt(t).
  const cosLat = Math.max(0.2, Math.cos((baseLat * Math.PI) / 180));
  function posAt(t) {
    const d = kmAt(t) / 111;                 // degrees of great-circle offset
    const c = d * 0.70710678;
    return { lat: baseLat + c, lng: baseLng + c / cosLat };
  }
  function speedAt(t, i) {
    if (i === Math.round(tC / step)) return 92;               // critical motion spike
    if (t < tG - 20) return 6 + (i % 3) * 3;                  // idling near site
    if (t < tC) return 48 + (i % 5) * 4;                      // driving out
    return 38 + (i % 4) * 3;                                  // returning
  }

  const critIdx = Math.round(tC / step);
  const distIdx = Math.round(tD / step);

  const packets = [];
  const plan = [];
  for (let i = 0; i < N; i++) {
    const t = i * step;
    const p = posAt(t);
    let motionByte = "00000008";
    let label = null;
    if (i === distIdx) { motionByte = "00100008"; label = "Disturbance"; }
    if (i === critIdx) { label = "Critical motion"; }
    const r = Math.min(1, kmAt(t) / 4.65);
    const ts = new Date(startMs + i * step * 1000);
    packets.push(buildUD({
      imei, lat: p.lat, lng: p.lng, speed: speedAt(t, i), motionByte,
      battery: Math.max(60, 92 - Math.round((t / total) * 12)), date: ts,
      mems: { valid: true, x: 20 + Math.round(30 * r), y: -12, z: 1010, roll: 0.4, pitch: 0.9, temp: 30 },
    }));
    plan.push({ i, t, lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)), speed: speedAt(t, i), label });
  }

  return {
    packets, plan, count: N,
    // seconds since route start for each procedure step (used to pace created_at)
    eventOffsets: { DISTURBANCE: tD, GEOFENCE_EXIT: tG, CRITICAL_MOTION: tC },
    order: ["DISTURBANCE", "GEOFENCE_EXIT", "CRITICAL_MOTION"],
  };
}
