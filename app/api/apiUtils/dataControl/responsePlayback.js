// app/api/apiUtils/dataControl/responsePlayback.js
// Combined playback for a response: the TARGET device's route (from
// device_telemetry) AND every responder's route (from responder_track), placed on
// ONE shared timeline so they can be replayed together on the Response Playback
// page. Everything is timed in seconds from a single t0 = the earliest fix of any
// track in the window, so target and responders stay in sync.
import { query } from "../s_env/db.js";

const EAT_OFFSET = 3 * 3600; // Africa/Nairobi = UTC+3 (display clock)

function srcOf(v) {
  const s = String(v || "").toLowerCase().trim();
  if (!s) return null;
  if (s === "network") return "lbs";
  return s;
}
function matchesSrc(loc, sources) {
  if (!sources || !sources.length) return true;
  const s = srcOf(loc);
  if (s == null) return true;
  return s.split("+").some((p) => sources.includes(p));
}
function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const kmOf = (pts) => { let k = 0; for (let i = 1; i < pts.length; i++) k += haversineKm(pts[i - 1], pts[i]); return Number(k.toFixed(2)); };

/**
 * @returns {Promise<null | {device_id, from, to, t0Ms, start_sec, duration,
 *   target:{points,waypoints,summary}|null, responders:Array}>}
 */
export async function responsePlayback(deviceId, fromIso, toIso, sources = []) {
  const dev = String(deviceId || "");
  const want = (sources || []).map((s) => String(s).toLowerCase());

  // TARGET route from device telemetry (received_at based, like Route Playback).
  const { rows: tAll } = await query(
    `SELECT t.received_at AS ts, t.lat, t.lng, t.speed, t.loc_source, t.accuracy
       FROM device_telemetry t JOIN devices d ON d.id = t.device_id
      WHERE d.device_id = $1
        AND t.lat IS NOT NULL AND t.lng IS NOT NULL
        AND t.received_at >= $2::timestamptz AND t.received_at <= $3::timestamptz
      ORDER BY t.received_at ASC`,
    [dev, fromIso, toIso]
  );
  const tRows = want.length ? tAll.filter((r) => matchesSrc(r.loc_source, want)) : tAll;

  // RESPONDER routes from the append-only history (best-effort: table may be new).
  let rRows = [];
  try {
    const res = await query(
      `SELECT user_id, name, team, lat, lng, accuracy_m, at AS ts
         FROM responder_track
        WHERE device_id = $1 AND lat IS NOT NULL
          AND at >= $2::timestamptz AND at <= $3::timestamptz
        ORDER BY at ASC`,
      [dev, fromIso, toIso]
    );
    rRows = res.rows;
  } catch (e) {
    if (!/relation .*responder_track.* does not exist/i.test(e?.message || ""))
      console.error("[responsePlayback] responder_track read:", e?.message || e);
  }

  if (!tRows.length && !rRows.length) return null;

  // Shared t0 = earliest fix across target + responders.
  const firsts = [];
  if (tRows.length) firsts.push(new Date(tRows[0].ts).getTime());
  if (rRows.length) firsts.push(new Date(rRows[0].ts).getTime());
  const t0 = Math.min(...firsts);
  const rel = (ts) => Math.max(0, Math.round((new Date(ts).getTime() - t0) / 1000));
  const start_sec = ((Math.floor(t0 / 1000) + EAT_OFFSET) % 86400 + 86400) % 86400;

  // Target.
  let target = null;
  if (tRows.length) {
    const points = tRows.map((r) => ({
      t: rel(r.ts), lat: Number(r.lat), lng: Number(r.lng),
      spd: Math.round(Number(r.speed) || 0), src: srcOf(r.loc_source),
      acc: r.accuracy == null ? null : Math.round(Number(r.accuracy)),
    }));
    let maxSpeed = 0; for (const p of points) maxSpeed = Math.max(maxSpeed, p.spd);
    const last = points[points.length - 1];
    target = {
      points,
      waypoints: [
        { label: "Start", kind: "start", t: points[0].t, lat: points[0].lat, lng: points[0].lng },
        { label: "End", kind: "end", t: last.t, lat: last.lat, lng: last.lng },
      ],
      summary: { total_km: kmOf(points), max_speed: maxSpeed, duration_min: Math.max(1, Math.round(last.t / 60)) },
    };
  }

  // Responders grouped by user.
  const byUser = new Map();
  for (const r of rRows) {
    const k = String(r.user_id);
    if (!byUser.has(k)) byUser.set(k, { userId: r.user_id, name: r.name || `Responder ${r.user_id}`, team: r.team || null, points: [] });
    byUser.get(k).points.push({ t: rel(r.ts), lat: Number(r.lat), lng: Number(r.lng), acc: r.accuracy_m == null ? null : Math.round(Number(r.accuracy_m)) });
  }
  const responders = [...byUser.values()].map((u) => ({ ...u, total_km: kmOf(u.points) }));

  // Duration = latest t across everything.
  let duration = 0;
  if (target?.points?.length) duration = Math.max(duration, target.points[target.points.length - 1].t);
  for (const u of responders) if (u.points.length) duration = Math.max(duration, u.points[u.points.length - 1].t);

  return { device_id: dev, from: fromIso, to: toIso, t0Ms: t0, start_sec, duration, target, responders };
}
