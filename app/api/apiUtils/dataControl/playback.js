// app/api/apiUtils/dataControl/playback.js
// Route Playback access — a stored GPS route per (device, date).
import { query } from "../s_env/db.js";

/** The route for a device on a date (points + waypoints + summary), or null. */
export async function getRoute(deviceId, date) {
  const { rows } = await query(
    `SELECT * FROM playback_routes WHERE device_id = $1 AND route_date = $2 LIMIT 1`,
    [String(deviceId || ""), date]
  );
  const r = rows[0];
  if (!r) return null;
  return {
    device_id: r.device_id,
    date: r.route_date,
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

/** Dates that have a stored route for a device (for the date picker hinting). */
export async function routeDatesForDevice(deviceId) {
  const { rows } = await query(
    `SELECT route_date FROM playback_routes WHERE device_id = $1 ORDER BY route_date DESC`,
    [String(deviceId || "")]
  );
  return rows.map((r) => r.route_date);
}
