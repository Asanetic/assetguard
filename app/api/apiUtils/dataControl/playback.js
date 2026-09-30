// app/api/apiUtils/dataControl/playback.js
// Route Playback access. Two sources, tried in order:
//   1) a hand-authored/stored route in playback_routes (the demo routes), then
//   2) a route reconstructed live from device_telemetry — so anything a device
//      (or the simulator) actually reported can be replayed exactly like realtime.
import { query } from "../s_env/db.js";

const EAT_OFFSET = 3 * 3600; // Africa/Nairobi = UTC+3 (display clock + day boundaries)

/** The route for a device on a date (points + waypoints + summary), or null. */
export async function getRoute(deviceId, date, sources = []) {
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
  return await routeFromTelemetry(deviceId, date, sources);
}

/**
 * `gps` | `wifi` | `lbs` | `wifi+lbs` | null.
 *
 * Null means the row predates the column, NOT that the fix was bad. A client
 * filtering on source must keep those visible rather than hiding history it
 * cannot classify.
 */
function srcOf(value) {
  const v = String(value || "").toLowerCase().trim();
  if (!v) return null;
  if (v === "network") return "lbs";
  return v;
}

/**
 * Keep only the telemetry rows whose fix source is one the caller asked for.
 * `sources` is the lowercase set the UI sends (subset of gps/wifi/lbs); empty =
 * no filter (show everything). A row's `loc_source` is normalised the same way
 * the points are (network→lbs, wifi+lbs counts as both), so unticking "Wi-Fi" or
 * "LBS" actually removes those fixes from the route. Rows too old to be classified
 * (loc_source null) stay visible — hiding history we cannot label would be worse.
 */
function filterSources(rows, sources) {
  if (!Array.isArray(sources) || sources.length === 0) return rows;
  const want = sources.map((s) => String(s).toLowerCase());
  return rows.filter((r) => {
    const s = srcOf(r.loc_source);         // gps | wifi | lbs | wifi+lbs | null
    if (s == null) return true;
    return s.split("+").some((p) => want.includes(p));
  });
}

function haversineKm(a, b) {
  const R = 6371, toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Build a playback route from device_telemetry for a device (device_id text) + date.
 *
 * Filtered and ordered by `received_at` — the time the PLATFORM received the fix,
 * not `device_time` (the tracker's own clock). GL trackers routinely report a
 * wrong RTC (default/UTC-1970/drifted), which filed a fix taken during today's run
 * under some other date and made it vanish from playback. received_at is always
 * correct, so "today" means the fixes that actually arrived today. */
export async function routeFromTelemetry(deviceIdText, date, sources = []) {
  const { rows: all } = await query(
    `SELECT t.received_at AS ts, t.lat, t.lng, t.speed,
            t.loc_source, t.accuracy
       FROM device_telemetry t
       JOIN devices d ON d.id = t.device_id
      WHERE d.device_id = $1
        AND t.lat IS NOT NULL AND t.lng IS NOT NULL
        AND (t.received_at AT TIME ZONE 'Africa/Nairobi')::date = $2::date
      ORDER BY t.received_at ASC`,
    [String(deviceIdText || ""), date]
  );
  const rows = filterSources(all, sources);
  // A SINGLE fix is still playable — show the point. Only a day with NO recorded
  // position at all has nothing to draw. (A stationary asset routinely reports one
  // position for a whole day; the old "need 2 points" rule hid it entirely.)
  if (rows.length < 1) return null;

  const first = new Date(rows[0].ts);
  const t0 = first.getTime();
  // Clock shown in EAT so the timeline matches the calendar day the user picked.
  const start_sec = ((Math.floor(t0 / 1000) + EAT_OFFSET) % 86400 + 86400) % 86400;

  const points = rows.map((r) => ({
    t: Math.max(0, Math.round((new Date(r.ts).getTime() - t0) / 1000)),
    lat: Number(r.lat), lng: Number(r.lng), spd: Math.round(Number(r.speed) || 0),
    // Where the fix came from, so a client can filter by it. `network` is
    // normalised to `lbs` — that is the word the rest of the UI uses for a
    // cell-tower fix, and two names for one thing is how a filter comes to
    // silently miss half its rows.
    src: srcOf(r.loc_source),
    acc: r.accuracy == null ? null : Math.round(Number(r.accuracy)),
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

/** Build a playback route from device_telemetry within a from→to datetime range. */
export async function routeFromTelemetryRange(deviceIdText, fromIso, toIso, sources = []) {
  const { rows: all } = await query(
    `SELECT t.received_at AS ts, t.lat, t.lng, t.speed,
            t.loc_source, t.accuracy
       FROM device_telemetry t
       JOIN devices d ON d.id = t.device_id
      WHERE d.device_id = $1
        AND t.lat IS NOT NULL AND t.lng IS NOT NULL
        AND t.received_at >= $2::timestamptz
        AND t.received_at <= $3::timestamptz
      ORDER BY t.received_at ASC`,
    [String(deviceIdText || ""), fromIso, toIso]
  );
  const rows = filterSources(all, sources);
  // A single fix is playable — only an empty window has nothing to draw.
  if (rows.length < 1) return null;

  const t0 = new Date(rows[0].ts).getTime();
  // clock shown in EAT so it matches the from/to the user picked
  const start_sec = ((Math.floor(t0 / 1000) + EAT_OFFSET) % 86400 + 86400) % 86400;

  const points = rows.map((r) => ({
    t: Math.max(0, Math.round((new Date(r.ts).getTime() - t0) / 1000)),
    lat: Number(r.lat), lng: Number(r.lng), spd: Math.round(Number(r.speed) || 0),
    // Where the fix came from, so a client can filter by it. `network` is
    // normalised to `lbs` — that is the word the rest of the UI uses for a
    // cell-tower fix, and two names for one thing is how a filter comes to
    // silently miss half its rows.
    src: srcOf(r.loc_source),
    acc: r.accuracy == null ? null : Math.round(Number(r.accuracy)),
  }));

  let total_km = 0, max_speed = 0, stops = 0, stop_min = 0;
  const waypoints = [{ label: "Start", kind: "start", t: points[0].t, lat: points[0].lat, lng: points[0].lng }];
  for (let i = 1; i < points.length; i++) {
    total_km += haversineKm(points[i - 1], points[i]);
    max_speed = Math.max(max_speed, points[i].spd);
    if (points[i].spd === 0 && points[i - 1].spd > 0 && waypoints.filter((w) => w.kind === "stop").length < 12) {
      const dwell = i + 1 < points.length ? Math.round((points[i + 1].t - points[i].t) / 60) : 0;
      waypoints.push({ label: `Stop ${waypoints.filter((w) => w.kind === "stop").length + 1}`, kind: "stop", t: points[i].t, lat: points[i].lat, lng: points[i].lng, stop_min: dwell });
      stops += 1; stop_min += dwell;
    }
  }
  const last = points[points.length - 1];
  waypoints.push({ label: "End", kind: "end", t: last.t, lat: last.lat, lng: last.lng });

  return {
    device_id: String(deviceIdText), from: fromIso, to: toIso, source: "telemetry",
    points, waypoints, start_sec, t0Ms: t0,
    summary: {
      total_km: Number(total_km.toFixed(2)), duration_min: Math.max(1, Math.round(last.t / 60)),
      max_speed, stops, stop_min, total_km_day: Number(total_km.toFixed(2)),
    },
  };
}

/** Incidents (alarms) within a from→to range, timed relative to the route start. */
export async function getIncidentsRange(deviceIdText, fromIso, toIso, startMs) {
  const { rows } = await query(
    `SELECT id, name, priority, alarm_type, lat, lng, created_at AS at,
            (EXTRACT(EPOCH FROM created_at) * 1000)::bigint AS ms
       FROM alarms
      WHERE device_id = $1 AND lat IS NOT NULL AND lng IS NOT NULL
        AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz
      ORDER BY created_at ASC`,
    [String(deviceIdText || ""), fromIso, toIso]
  );
  const base = Number(startMs) || (fromIso ? Date.parse(fromIso) : 0);
  return rows.map((r) => ({
    id: r.id, name: r.name, priority: r.priority, alarm_type: r.alarm_type,
    lat: Number(r.lat), lng: Number(r.lng), at: r.at,
    t: Math.max(0, Math.round((Number(r.ms) - base) / 1000)),
  }));
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
            (EXTRACT(HOUR   FROM (created_at AT TIME ZONE 'Africa/Nairobi')) * 3600
           + EXTRACT(MINUTE FROM (created_at AT TIME ZONE 'Africa/Nairobi')) * 60
           + EXTRACT(SECOND FROM (created_at AT TIME ZONE 'Africa/Nairobi')))::int AS tod
       FROM alarms
      WHERE device_id = $1
        AND (created_at AT TIME ZONE 'Africa/Nairobi')::date = $2::date
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
     SELECT DISTINCT (t.received_at AT TIME ZONE 'Africa/Nairobi')::date::text AS d
       FROM device_telemetry t JOIN devices d ON d.id = t.device_id
      WHERE d.device_id = $1 AND t.lat IS NOT NULL
      ORDER BY d DESC`,
    [String(deviceId || "")]
  );
  return rows.map((r) => r.d);
}
