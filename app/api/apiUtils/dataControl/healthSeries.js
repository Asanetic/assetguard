// app/api/apiUtils/dataControl/healthSeries.js
// Two SLA time-series for the dashboard System Health section:
//
//   Platform uptime      = 100% − time the APP was down. Atomic unit = an HOUR;
//                          the app is "up" for an hour if it wrote ≥1 proof-of-life
//                          ping (app_heartbeat) that hour. Measures the app being
//                          online, NOT device traffic.
//   Device availability  = 100% − time devices were offline, across all REGISTERED
//                          devices (status ≠ Inactive/decommissioned). For a period,
//                          availability = Σ(online-hours per device) / (period-hours
//                          × registered-devices). A device is online for an hour if
//                          it reported at least once that hour.
//
// Ranges (bucket → point): daily → 24 hourly, weekly → 7 daily,
// monthly → 30 daily, yearly → 12 monthly.
import { query } from "../s_env/db.js";

const many = async (sql, params = []) => {
  try { const { rows } = await query(sql, params); return rows; }
  catch (e) { console.error("[healthSeries]", e?.message || e); return []; }
};
const num = (v) => (v == null ? 0 : Number(v));

export async function healthSeries(range = "monthly") {
  const R = ["daily", "weekly", "monthly", "yearly"].includes(range) ? range : "monthly";
  // registered devices = everything except decommissioned (Inactive)
  const reg = await query(`SELECT count(*)::int AS n FROM devices WHERE lower(coalesce(status,'')) <> 'inactive'`)
    .then((r) => r.rows[0]?.n || 0).catch(() => 0);

  let platform = [], device = [];

  if (R === "daily") {
    platform = await many(`
      WITH cov AS (SELECT DISTINCT date_trunc('hour', ts) h
                     FROM app_heartbeat WHERE ts >= date_trunc('hour', now()) - interval '23 hours')
      SELECT to_char(gs, 'HH24:00') AS t, gs AS ts, CASE WHEN c.h IS NOT NULL THEN 100 ELSE 0 END AS pct
        FROM generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') gs
        LEFT JOIN cov c ON c.h = gs ORDER BY gs`);
    device = await many(`
      WITH reg AS (SELECT id FROM devices WHERE lower(coalesce(status,'')) <> 'inactive'),
           cov AS (SELECT dt.device_id, date_trunc('hour', COALESCE(dt.device_time, dt.received_at)) hr
                     FROM device_telemetry dt JOIN reg ON reg.id = dt.device_id
                    WHERE COALESCE(dt.device_time, dt.received_at) >= date_trunc('hour', now()) - interval '23 hours'
                    GROUP BY 1, 2)
      SELECT to_char(gs, 'HH24:00') AS t, gs AS ts,
             CASE WHEN $1 = 0 THEN 0 ELSE ROUND(100.0 * count(c.device_id) / $1, 1) END AS pct
        FROM generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') gs
        LEFT JOIN cov c ON c.hr = gs GROUP BY gs ORDER BY gs`, [reg]);

  } else if (R === "yearly") {
    platform = await many(`
      WITH cov AS (SELECT date_trunc('month', ts) m, count(DISTINCT date_trunc('hour', ts)) hrs
                     FROM app_heartbeat WHERE ts >= date_trunc('month', now()) - interval '11 months' GROUP BY 1)
      SELECT to_char(gs, 'Mon') AS t, gs AS ts,
             ROUND(100.0 * COALESCE(c.hrs,0) / (EXTRACT(day FROM (gs + interval '1 month' - interval '1 day')) * 24), 1) AS pct
        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') gs
        LEFT JOIN cov c ON c.m = gs ORDER BY gs`);
    device = await many(`
      WITH reg AS (SELECT id FROM devices WHERE lower(coalesce(status,'')) <> 'inactive'),
           cov AS (SELECT dt.device_id, date_trunc('hour', COALESCE(dt.device_time, dt.received_at)) hr
                     FROM device_telemetry dt JOIN reg ON reg.id = dt.device_id
                    WHERE COALESCE(dt.device_time, dt.received_at) >= date_trunc('month', now()) - interval '11 months'
                    GROUP BY 1, 2)
      SELECT to_char(gs, 'Mon') AS t, gs AS ts,
             CASE WHEN $1 = 0 THEN 0
                  ELSE ROUND(100.0 * count(c.device_id) / (EXTRACT(day FROM (gs + interval '1 month' - interval '1 day')) * 24 * $1), 1) END AS pct
        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') gs
        LEFT JOIN cov c ON date_trunc('month', c.hr) = gs GROUP BY gs ORDER BY gs`, [reg]);

  } else {
    const span = R === "weekly" ? 7 : 30;
    platform = await many(`
      WITH cov AS (SELECT date_trunc('day', ts) d, count(DISTINCT date_trunc('hour', ts)) hrs
                     FROM app_heartbeat WHERE ts >= date_trunc('day', now()) - (($1 - 1) || ' days')::interval GROUP BY 1)
      SELECT to_char(gs, 'Dy DD') AS t, gs AS ts, ROUND(100.0 * COALESCE(c.hrs,0) / 24, 1) AS pct
        FROM generate_series(date_trunc('day', now()) - (($1 - 1) || ' days')::interval, date_trunc('day', now()), interval '1 day') gs
        LEFT JOIN cov c ON c.d = gs ORDER BY gs`, [span]);
    device = await many(`
      WITH reg AS (SELECT id FROM devices WHERE lower(coalesce(status,'')) <> 'inactive'),
           cov AS (SELECT dt.device_id, date_trunc('hour', COALESCE(dt.device_time, dt.received_at)) hr
                     FROM device_telemetry dt JOIN reg ON reg.id = dt.device_id
                    WHERE COALESCE(dt.device_time, dt.received_at) >= date_trunc('day', now()) - (($1 - 1) || ' days')::interval
                    GROUP BY 1, 2)
      SELECT to_char(gs, 'Dy DD') AS t, gs AS ts,
             CASE WHEN $2 = 0 THEN 0 ELSE ROUND(100.0 * count(c.device_id) / (24.0 * $2), 1) END AS pct
        FROM generate_series(date_trunc('day', now()) - (($1 - 1) || ' days')::interval, date_trunc('day', now()), interval '1 day') gs
        LEFT JOIN cov c ON date_trunc('day', c.hr) = gs GROUP BY gs ORDER BY gs`, [span, reg]);
  }

  const map = (rows) => rows.map((r) => ({ t: r.t, pct: num(r.pct) }));
  const avg = (rows) => (rows.length ? Math.round((rows.reduce((a, r) => a + num(r.pct), 0) / rows.length) * 10) / 10 : 0);

  return {
    range: R,
    registeredDevices: reg,
    platformUptime: map(platform),
    deviceAvailability: map(device),
    summary: { platformUptime: avg(platform), deviceAvailability: avg(device) },
  };
}
