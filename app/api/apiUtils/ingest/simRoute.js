// app/api/apiUtils/ingest/simRoute.js
// Build a moving GL-28 route that plays out a real vandalism scenario, in order,
// ~2 minutes apart, over the real TCP pipeline:
//   1) ON-SITE DISTURBANCE — vandals reach the asset and tamper with it (cutting
//      cables, pulling it from the cabinet). The disturbance bit 00100008 is on
//      every packet while the asset sits DEEP INSIDE the fence (~6 m). No geofence,
//      no motion. The engine debounces the bit and raises ONE Disturbance on the
//      4th packet.
//   2) GEOFENCE EXIT — they carry it out; it crosses the 30 m fence.
//   3) CRITICAL MOTION — at the road they put it on a motorbike and speed off; from
//      here the tracker streams every 3 s for `fastMinutes`.
// Alarm times come from each packet's own timestamp, so the three land ~2 min apart
// and never overlap. Pure string building — no I/O.
import { buildUD } from "./simPackets.js";

export function buildCriticalRoute({
  imei, lat, lng, start,
  paceSec = 120,          // spacing between the three alarms
  coarseStepSec = 20,     // reporting cadence before the motorbike
  fastStepSec = 3,        // high-frequency cadence during Critical Motion
  fastMinutes = 5,        // how long the 3 s streaming lasts
  disturbStreak = 4,      // engine raises Disturbance on this packet (keep in sync)
} = {}) {
  const baseLat = Number(lat), baseLng = Number(lng);
  const startMs = start instanceof Date ? start.getTime() : Number(start) || 0;
  const pace = Math.max(30, Number(paceSec) || 120);
  const cStep = Math.max(5, Number(coarseStepSec) || 20);
  const fStep = Math.max(1, Number(fastStepSec) || 3);
  const fastSec = Math.max(30, Math.round((Number(fastMinutes) || 5) * 60));

  // The Disturbance alarm lands on the Nth disturbing packet ≈ (N-1)*cStep in.
  const tDisturb = Math.max(0, (Math.max(1, disturbStreak) - 1) * cStep);
  const tG = tDisturb + pace;   // geofence exit, 2 min after the disturbance
  const tC = tG + pace;         // motorbike / critical motion, 2 min after geofence
  const totalSec = tC + fastSec;
  const cosLat = Math.max(0.2, Math.cos((baseLat * Math.PI) / 180));

  // distance from the site (METRES) over time.
  function metersAt(t) {
    if (t < tG) return 6 + 3 * Math.abs(Math.sin(t / 7));           // ~6–9 m: deep inside the 30 m fence
    if (t < tC) { const f = (t - tG) / (tC - tG); return 45 + f * (350 - 45); }   // walk out 45 → 350 m
    const f = (t - tC) / (totalSec - tC); return 350 + f * (5200 - 350);          // motorbike 350 m → 5.2 km
  }
  function speedAt(t) {
    if (t < tG) return 1;                                           // stationary tampering (< critical speed)
    if (t < tC) return 3;                                           // walking (< critical speed → no critical yet)
    return 66 + Math.round(24 * Math.abs(Math.sin(t / 6)));         // motorbike 66–90 km/h
  }
  // NE bearing; convert metres → degrees (≈111 km/deg), split diagonally.
  function posAt(t) {
    const deg = metersAt(t) / 111000, c = deg * 0.70710678;
    const w = t >= tC ? 0.00025 * Math.sin(t / 5) : 0;             // small wobble only while fleeing
    return { lat: baseLat + c + w, lng: baseLng + (c - w) / cosLat };
  }

  // timeline: coarse cadence up to the motorbike, then 3 s cadence to the end.
  const times = [];
  for (let t = 0; t <= tC; t += cStep) times.push(t);
  for (let t = tC + fStep; t <= totalSec; t += fStep) times.push(t);

  const packets = [];
  const plan = [];
  times.forEach((t, i) => {
    const p = posAt(t);
    const motionByte = "00100008";                                 // disturbance bit present throughout
    let label = null;
    if (i === disturbStreak - 1) label = "Disturbance (raised here)";
    else if (t === tG) label = "Geofence exit";
    else if (Math.abs(t - tC) < 1) label = "Critical motion (motorbike)";
    const ts = new Date(startMs + t * 1000);
    packets.push(buildUD({
      imei, lat: p.lat, lng: p.lng, speed: speedAt(t), motionByte,
      battery: Math.max(55, 92 - Math.round((t / totalSec) * 16)), date: ts,
      mems: { valid: true, x: 20, y: -12, z: 1010, roll: 0.4, pitch: 0.9, temp: 30 },
    }));
    plan.push({ i, t, lat: Number(p.lat.toFixed(6)), lng: Number(p.lng.toFixed(6)), speed: speedAt(t), meters: Math.round(metersAt(t)), label });
  });

  return {
    packets, plan, count: times.length, totalSec,
    tDisturb, tGeofence: tG, tCritical: tC,
    order: ["DISTURBANCE", "GEOFENCE_EXIT", "CRITICAL_MOTION"],
  };
}
