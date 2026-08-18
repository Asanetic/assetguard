// app/api/apiUtils/dataControl/deviceHeartbeats.js
// Device logs = a device's routine reporting (its "heartbeats" — the normal
// check-in frames it sends while healthy, carrying battery / signal / fix /
// position / status). Read from device_telemetry (one row per report). Two views:
//   1) dailyHeartbeats  — per-EAT-day rollups across a date range, so you can see
//      the state of the device every day and analyse many dates at a glance.
//   2) dayHeartbeats    — every heartbeat within one EAT day, to analyse a single
//      day in detail (with the gap since the previous beat).
import { query } from "../s_env/db.js";

const TZ = "Africa/Nairobi"; // EAT (UTC+3) — all day buckets + clocks are EAT.

/** Device header info for the logs page (name, imei, site, status, last seen). */
export async function heartbeatDevice(deviceIdText) {
  try {
    const { rows } = await query(
      `SELECT d.id, d.device_id, d.imei, d.status, d.last_seen,
              COALESCE(s.name, d.site) AS site, s.region
         FROM devices d
         LEFT JOIN sites s ON s.id = d.site_id
        WHERE d.device_id = $1 OR d.imei = $1
        LIMIT 1`,
      [String(deviceIdText || "")]
    );
    return rows[0] || null;
  } catch (e) { console.error("[heartbeatDevice]", e?.message || e); return null; }
}

/**
 * Per-EAT-day rollups of a device's heartbeats between fromIso and toIso.
 * One row per day that has data: count, first/last report, longest gap, hours
 * covered, battery start→end (+min), avg signal, GPS fixes, and how many beats
 * carried an alarm. Newest day first.
 */
export async function dailyHeartbeats(deviceIdText, fromIso, toIso) {
  const { rows } = await query(
    `WITH t AS (
        SELECT COALESCE(dt.device_time, dt.received_at) AS ts,
               dt.battery, dt.signal, dt.lat, dt.lng, dt.alarms
          FROM device_telemetry dt
          JOIN devices d ON d.id = dt.device_id
         WHERE (d.device_id = $1 OR d.imei = $1)
           AND COALESCE(dt.device_time, dt.received_at) >= $2::timestamptz
           AND COALESCE(dt.device_time, dt.received_at) <  $3::timestamptz
      ),
      w AS (
        SELECT (ts AT TIME ZONE $4)::date AS day, ts, battery, signal, lat, lng, alarms,
               EXTRACT(EPOCH FROM (ts - LAG(ts) OVER (
                  PARTITION BY (ts AT TIME ZONE $4)::date ORDER BY ts)))::int AS gap_s
          FROM t
      )
      SELECT day::text AS day,
             count(*)::int AS beats,
             min(ts) AS first_at,
             max(ts) AS last_at,
             COALESCE(max(gap_s), 0)::int AS max_gap_s,
             count(DISTINCT EXTRACT(HOUR FROM (ts AT TIME ZONE $4)))::int AS active_hours,
             (array_agg(battery ORDER BY ts)      FILTER (WHERE battery IS NOT NULL))[1] AS batt_start,
             (array_agg(battery ORDER BY ts DESC) FILTER (WHERE battery IS NOT NULL))[1] AS batt_end,
             min(battery)::int AS batt_min,
             round(avg(signal))::int AS avg_signal,
             count(*) FILTER (WHERE lat IS NOT NULL AND lng IS NOT NULL)::int AS fixes,
             COALESCE(sum(CASE WHEN jsonb_typeof(alarms) = 'array' AND jsonb_array_length(alarms) > 0
                               THEN 1 ELSE 0 END), 0)::int AS alarm_beats
        FROM w
       GROUP BY day
       ORDER BY day DESC`,
    [String(deviceIdText || ""), fromIso, toIso, TZ]
  );
  return rows.map((r) => ({
    day: r.day,
    beats: r.beats,
    first_at: r.first_at,
    last_at: r.last_at,
    max_gap_s: r.max_gap_s,
    active_hours: r.active_hours,
    batt_start: r.batt_start != null ? Number(r.batt_start) : null,
    batt_end: r.batt_end != null ? Number(r.batt_end) : null,
    batt_min: r.batt_min != null ? Number(r.batt_min) : null,
    avg_signal: r.avg_signal != null ? Number(r.avg_signal) : null,
    fixes: r.fixes,
    alarm_beats: r.alarm_beats,
  }));
}

/** Every heartbeat within one EAT day, oldest first, with the gap since the prev. */
export async function dayHeartbeats(deviceIdText, dateStr, limit = 5000) {
  const { rows } = await query(
    `SELECT COALESCE(dt.device_time, dt.received_at) AS at,
            dt.battery, dt.signal, dt.fix, dt.speed, dt.lat, dt.lng,
            dt.temperature, dt.motion_byte, dt.satellites,
            (jsonb_typeof(dt.alarms) = 'array' AND jsonb_array_length(dt.alarms) > 0) AS has_alarm,
            dt.alarms,
            EXTRACT(EPOCH FROM (COALESCE(dt.device_time, dt.received_at)
              - LAG(COALESCE(dt.device_time, dt.received_at)) OVER (
                  ORDER BY COALESCE(dt.device_time, dt.received_at))))::int AS gap_s
       FROM device_telemetry dt
       JOIN devices d ON d.id = dt.device_id
      WHERE (d.device_id = $1 OR d.imei = $1)
        AND (COALESCE(dt.device_time, dt.received_at) AT TIME ZONE $3)::date = $2::date
      ORDER BY at ASC
      LIMIT $4`,
    [String(deviceIdText || ""), dateStr, TZ, limit]
  );
  return rows.map((r) => ({
    at: r.at,
    battery: r.battery,
    signal: r.signal,
    fix: r.fix,
    speed: r.speed != null ? Number(r.speed) : null,
    lat: r.lat != null ? Number(r.lat) : null,
    lng: r.lng != null ? Number(r.lng) : null,
    temperature: r.temperature != null ? Number(r.temperature) : null,
    motion_byte: r.motion_byte,
    satellites: r.satellites,
    has_alarm: !!r.has_alarm,
    alarms: Array.isArray(r.alarms) ? r.alarms : [],
    gap_s: r.gap_s,
  }));
}

/**
 * FLEET availability (SLA). A device counts as "up" on an EAT day if it sent
 * data at least once that day. System availability over a window of N days is
 *   Σ(device-days that reported) / (devices × N).
 * Returns current 24h status, availability % for 7/14/30/365-day windows, and a
 * per-device breakdown for the requested window (worst first — SLA triage).
 */
export async function fleetAvailability(windowDays = 30) {
  const W = [7, 14, 30, 365].includes(Number(windowDays)) ? Number(windowDays) : 30;

  // 1) fleet size + how many reported in the last 24h ("up now")
  const totalsSql = `
    SELECT
      (SELECT count(*)::int FROM devices) AS total,
      (SELECT count(DISTINCT dt.device_id)::int FROM device_telemetry dt
         WHERE COALESCE(dt.device_time, dt.received_at) >= now() - interval '24 hours') AS up_now`;

  // 2) distinct (device, EAT-day) that reported, per window → device-days up
  const ddSql = `
    SELECT
      count(DISTINCT (id, day)) FILTER (WHERE ts >= now() - interval '7 days')::int   AS d7,
      count(DISTINCT (id, day)) FILTER (WHERE ts >= now() - interval '14 days')::int  AS d14,
      count(DISTINCT (id, day)) FILTER (WHERE ts >= now() - interval '30 days')::int  AS d30,
      count(DISTINCT (id, day)) FILTER (WHERE ts >= now() - interval '365 days')::int AS d365
    FROM (
      SELECT dt.device_id AS id,
             (COALESCE(dt.device_time, dt.received_at) AT TIME ZONE $1)::date AS day,
             COALESCE(dt.device_time, dt.received_at) AS ts
        FROM device_telemetry dt
       WHERE COALESCE(dt.device_time, dt.received_at) >= now() - interval '365 days'
    ) x`;

  // 3) per-device availability for the chosen window
  const perDevSql = `
    SELECT d.device_id, d.imei, COALESCE(s.name, d.site) AS site, d.last_seen,
           count(DISTINCT (COALESCE(dt.device_time, dt.received_at) AT TIME ZONE $1)::date)::int AS days_up
      FROM devices d
      LEFT JOIN sites s ON s.id = d.site_id
      LEFT JOIN device_telemetry dt ON dt.device_id = d.id
             AND COALESCE(dt.device_time, dt.received_at) >= now() - ($2 || ' days')::interval
     GROUP BY d.id, d.device_id, d.imei, s.name, d.site, d.last_seen
     ORDER BY days_up ASC, d.last_seen ASC NULLS FIRST`;

  const [tot, dd, per] = await Promise.all([
    query(totalsSql).then((r) => r.rows[0] || {}).catch(() => ({})),
    query(ddSql, [TZ]).then((r) => r.rows[0] || {}).catch(() => ({})),
    query(perDevSql, [TZ, W]).then((r) => r.rows).catch(() => []),
  ]);

  const total = Number(tot.total) || 0;
  const pct = (deviceDays, n) => (total > 0 && n > 0 ? Math.round((Number(deviceDays) / (total * n)) * 1000) / 10 : 0);
  const now24 = Date.now() - 24 * 3600 * 1000;

  return {
    now: { up: Number(tot.up_now) || 0, total, pct: total > 0 ? Math.round((Number(tot.up_now) / total) * 1000) / 10 : 0 },
    windows: {
      d7: pct(dd.d7, 7), d14: pct(dd.d14, 14), d30: pct(dd.d30, 30), d365: pct(dd.d365, 365),
    },
    window: W,
    devices: per.map((r) => ({
      device_id: r.device_id,
      imei: r.imei,
      site: r.site || "—",
      last_seen: r.last_seen,
      days_up: Number(r.days_up) || 0,
      days: W,
      pct: W > 0 ? Math.round((Number(r.days_up) / W) * 1000) / 10 : 0,
      up: r.last_seen ? new Date(r.last_seen).getTime() >= now24 : false,
    })),
  };
}
