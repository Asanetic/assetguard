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

  // DEVICE availability = 100% − time devices were OFFLINE. A device is "offline"
  // only while it is OVERDUE — past its own wake interval + tolerance since its last
  // report (default 24 h). So a 24 h-interval device that checks in daily reads ~100%;
  // it only loses availability for the stretch it actually went silent beyond its
  // window. Per bucket we sample "was each device current at the bucket's end?"
  const REG = `reg AS (
      SELECT id,
             (COALESCE(NULLIF(config->>'wake_interval_sec','')::numeric,
                       NULLIF(config->>'offline_hours','')::numeric * 3600, 86400)
              + COALESCE(NULLIF(config->>'hb_tolerance_sec','')::numeric, 300)) AS grace
        FROM devices WHERE lower(coalesce(status,'')) <> 'inactive'),
    dc AS (SELECT count(*)::numeric n FROM reg)`;
  // Fraction (×100) of devices whose last report as of `endExpr` is within their grace.
  const upPct = (endExpr) => `CASE WHEN (SELECT n FROM dc) = 0 THEN 0 ELSE ROUND(100.0 * (
      SELECT count(*) FROM reg r WHERE EXISTS (
        SELECT 1 FROM device_telemetry dt WHERE dt.device_id = r.id
          AND COALESCE(dt.device_time, dt.received_at) >  (${endExpr}) - (r.grace * interval '1 second')
          AND COALESCE(dt.device_time, dt.received_at) <= (${endExpr}))
    ) / (SELECT n FROM dc), 1) END`;

  let platform = [], device = [];

  if (R === "daily") {
    // 10-MINUTE resolution: each hour has six 10-min slots; the app is "up" for a
    // slot if it wrote at least one ping in that window. Hour % = up-slots / 6.
    platform = await many(`
      WITH cov AS (SELECT DISTINCT date_trunc('hour', ts) hr, floor(extract(minute from ts)/10)::int slot
                     FROM app_heartbeat WHERE ts >= date_trunc('hour', now()) - interval '23 hours')
      SELECT to_char(gs, 'HH24:00') AS t, gs AS ts, ROUND(100.0 * COALESCE(c.n, 0) / 6, 1) AS pct
        FROM generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') gs
        LEFT JOIN (SELECT hr, count(*) n FROM cov GROUP BY hr) c ON c.hr = gs ORDER BY gs`);
    device = await many(`
      WITH ${REG}
      SELECT to_char(gs, 'HH24:00') AS t, gs AS ts, ${upPct("gs + interval '1 hour'")} AS pct
        FROM generate_series(date_trunc('hour', now()) - interval '23 hours', date_trunc('hour', now()), interval '1 hour') gs
       ORDER BY gs`);

  } else if (R === "yearly") {
    // 10-minute slots per month = days-in-month × 144.
    platform = await many(`
      WITH cov AS (SELECT DISTINCT date_trunc('month', ts) m, date_trunc('hour', ts) hr, floor(extract(minute from ts)/10)::int slot
                     FROM app_heartbeat WHERE ts >= date_trunc('month', now()) - interval '11 months')
      SELECT to_char(gs, 'Mon') AS t, gs AS ts,
             ROUND(100.0 * COALESCE(c.n,0) / (EXTRACT(day FROM (gs + interval '1 month' - interval '1 day')) * 144), 1) AS pct
        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') gs
        LEFT JOIN (SELECT m, count(*) n FROM cov GROUP BY m) c ON c.m = gs ORDER BY gs`);
    device = await many(`
      WITH ${REG}
      SELECT to_char(gs, 'Mon') AS t, gs AS ts, ${upPct("gs + interval '1 month'")} AS pct
        FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') gs
       ORDER BY gs`);

  } else {
    const span = R === "weekly" ? 7 : 30;
    // 10-minute slots per day = 144.
    platform = await many(`
      WITH cov AS (SELECT DISTINCT date_trunc('day', ts) d, date_trunc('hour', ts) hr, floor(extract(minute from ts)/10)::int slot
                     FROM app_heartbeat WHERE ts >= date_trunc('day', now()) - (($1 - 1) || ' days')::interval)
      SELECT to_char(gs, 'Dy DD') AS t, gs AS ts, ROUND(100.0 * COALESCE(c.n,0) / 144, 1) AS pct
        FROM generate_series(date_trunc('day', now()) - (($1 - 1) || ' days')::interval, date_trunc('day', now()), interval '1 day') gs
        LEFT JOIN (SELECT d, count(*) n FROM cov GROUP BY d) c ON c.d = gs ORDER BY gs`, [span]);
    device = await many(`
      WITH ${REG}
      SELECT to_char(gs, 'Dy DD') AS t, gs AS ts, ${upPct("gs + interval '1 day'")} AS pct
        FROM generate_series(date_trunc('day', now()) - (($1 - 1) || ' days')::interval, date_trunc('day', now()), interval '1 day') gs
       ORDER BY gs`, [span]);
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
