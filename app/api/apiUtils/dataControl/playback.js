// app/api/apiUtils/dataControl/playback.js
// Route Playback access. Two sources, tried in order:
//   1) a hand-authored/stored route in playback_routes (the demo routes), then
//   2) a route reconstructed live from device_telemetry — so anything a device
//      (or the simulator) actually reported can be replayed exactly like realtime.
import { query } from "../s_env/db.js";

/** The route for a device on a date (points + waypoints + summary), or null. */
export async function getRoute(deviceId, date) {
  const { rows } = await query(
    `SELECT * FROM playback_routes WHERE device_id = $1 AND route_date = $2 LIMIT 1`,
    [String(deviceId || ""), date]
  );
  const r = rows[0];
  if (r) {
    return {
      device_id: r.device_id,
      date: r.route_date,
      source: "stored",
      points: r.points || [],
      waypoints: r.waypoints || [],
      start_sec: r.start_sec,
      summary: {
        total_km: Number(r.total_km),
        duration_min: r.duration_min,
        max_speed: r.max_speed,
        stops: r.stops,
        stop_min: r.stop_min,
        total_km_day: Number(r.total_km_day),
      },
    };
  }
  // Fall back to the live telemetry feed.
  return await routeFromTelemetry(deviceId, date);
}

function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Build a playback route from device_telemetry for a device (device_id text) + date. */
export async function routeFromTelemetry(deviceIdText, date) {
  const { rows } = await query(
    `SELECT COALESCE(t.device_time, t.received_at) AS ts, t.lat, t.lng, t.speed
       FROM device_telemetry t
       JOIN devices d ON d.id = t.device_id
      WHERE d.device_id = $1
        AND t.lat IS NOT NULL AND t.lng IS NOT NULL
        AND COALESCE(t.device_time, t.received_at)::date = $2::date
      ORDER BY ts ASC`,
    [String(deviceIdText || ""), date]
  );
  if (rows.length < 2) return null;

  const first = new Date(rows[0].ts);
  const t0 = first.getTime();
  const start_sec = first.getUTCHours() * 3600 + first.getUTCMinutes() * 60 + first.getUTCSeconds();

  const points = rows.map((r) => ({
    t: Math.max(0, Math.round((new Date(r.ts).getTime() - t0) / 1000)),
    lat: Number(r.lat), lng: Number(r.lng), spd: Math.round(Number(r.speed) || 0),
  }));

  // distance, max speed, stop detection
  let total_km = 0, max_speed = 0, stops = 0, stop_min = 0;
  const waypoints = [{ label: "Start", kind: "start", t: points[0].t, lat: points[0].lat, lng: points[0].lng }];
  for (let i = 1; i < points.length; i++) {
    total_km += haversineKm(points[i - 1], points[i]);
    max_speed = Math.max(max_speed, points[i].spd);
    // a stop = speed drops to 0 after moving; record a waypoint (capped to keep it readable)
    if (points[i].spd === 0 && points[i - 1].spd > 0 && waypoints.filter((w) => w.kind === "stop").length < 12) {
      const dwell = i + 1 < points.length ? Math.round((points[i + 1].t - points[i].t) / 60) : 0;
      waypoints.push({ label: `Stop ${waypoints.filter((w) => w.kind === "stop").length + 1}`, kind: "stop", t: points[i].t, lat: points[i].lat, lng: points[i].lng, stop_min: dwell });
      stops += 1; stop_min += dwell;
    }
  }
  const last = points[points.length - 1];
  waypoints.push({ label: "End", kind: "end", t: last.t, lat: last.lat, lng: last.lng });

  return {
    device_id: String(deviceIdText),
    date,
    source: "telemetry",
    points,
    waypoints,
    start_sec,
    summary: {
      total_km: Number(total_km.toFixed(2)),
      duration_min: Math.max(1, Math.round(last.t / 60)),
      max_speed,
      stops,
      stop_min,
      total_km_day: Number(total_km.toFixed(2)),
    },
  };
}

/**
 * Incidents (alarms) for a device on a date, as playback overlay + CSV rows.
 * Alarm location is the SITE location; `t` is seconds since the route's start so
 * the pin can be revealed as the vehicle reaches that moment. Times are read in
 * UTC to line up with routeFromTelemetry's start_sec.
 */
export async function getIncidents(deviceIdText, date, startSec = 0) {
  const { rows } = await query(
    `SELECT id, name, priority, alarm_type, lat, lng, created_at AS at,
            (EXTRACT(HOUR   FROM (created_at AT TIME ZONE 'UTC')) * 3600
           + EXTRACT(MINUTE FROM (created_at AT TIME ZONE 'UTC')) * 60
           + EXTRACT(SECOND FROM (created_at AT TIME ZONE 'UTC')))::int AS tod
       FROM alarms
      WHERE device_id = $1
        AND (created_at AT TIME ZONE 'UTC')::date = $2::date
        AND lat IS NOT NULL AND lng IS NOT NULL
      ORDER BY created_at ASC`,
    [String(deviceIdText || ""), date]
  );
  return rows.map((r) => ({
    id: r.id, name: r.name, priority: r.priority, alarm_type: r.alarm_type,
    lat: Number(r.lat), lng: Number(r.lng), at: r.at,
    t: Math.max(0, (Number(r.tod) || 0) - (Number(startSec) || 0)),
  }));
}

/** Dates that have a route for a device — stored routes plus telemetry days. */
export async function routeDatesForDevice(deviceId) {
  const { rows } = await query(
    `SELECT route_date::text AS d FROM playback_routes WHERE device_id = $1
     UNION
     SELECT DISTINCT COALESCE(t.device_time, t.received_at)::date::text AS d
       FROM device_telemetry t JOIN devices d ON d.id = t.device_id
      WHERE d.device_id = $1 AND t.lat IS NOT NULL
      ORDER BY d DESC`,
    [String(deviceId || "")]
  );
  return rows.map((r) => r.d);
}
