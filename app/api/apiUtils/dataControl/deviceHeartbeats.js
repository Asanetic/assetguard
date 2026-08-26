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

// A device's wake interval (sec) + tolerance from config, as a SQL fragment. The
// wake interval drives the "up" window everywhere (matches offlineSweep / dashboard).
const INTERVAL_SEC_SQL = `COALESCE(NULLIF(d.config->>'wake_interval_sec','')::numeric,
                                   NULLIF(d.config->>'offline_hours','')::numeric * 3600, 86400)`;
const TOL_SEC_SQL = `COALESCE(NULLIF(d.config->>'hb_tolerance_sec','')::numeric, 300)`;

// Given last_seen + interval/tolerance + status, classify a device's live state.
function liveState(lastSeen, intervalSec, tolSec, status) {
  if (String(status || "").toLowerCase() === "inactive") return "inactive";
  if (!lastSeen) return "down";
  const ageSec = (Date.now() - new Date(lastSeen).getTime()) / 1000;
  return ageSec <= Number(intervalSec) + Number(tolSec) ? "up" : "down";
}

// Expected next heartbeat = last report + wake interval. Computed here (not read from
// the stored hb_next_at column) so the page works whether or not the migration ran.
function expectedNext(lastSeen, intervalSec) {
  if (!lastSeen) return null;
  return new Date(new Date(lastSeen).getTime() + (Number(intervalSec) || 86400) * 1000).toISOString();
}

/** Device header info for the logs page: name, imei, site, status, last seen, and
 *  the heartbeat schedule (wake interval, ±tolerance, predicted next, live state). */
export async function heartbeatDevice(deviceIdText) {
  try {
    const { rows } = await query(
      `SELECT d.id, d.device_id, d.imei, d.status, d.last_seen,
              ${INTERVAL_SEC_SQL} AS interval_sec, ${TOL_SEC_SQL} AS tol_sec,
              NULLIF(d.config->>'pending_wake_interval_sec','')::numeric AS pending_sec,
              s.name AS site, s.region
         FROM devices d
         LEFT JOIN sites s ON s.id = d.site_id
        WHERE d.device_id = $1 OR d.imei = $1
        LIMIT 1`,
      [String(deviceIdText || "")]
    );
    const r = rows[0];
    if (!r) return null;
    const interval = Number(r.interval_sec) || 86400;
    return {
      ...r,
      interval_sec: interval,
      tol_sec: Number(r.tol_sec) || 300,
      pending_sec: r.pending_sec != null ? Number(r.pending_sec) : null,
      next_at: expectedNext(r.last_seen, r.interval_sec),
      state: liveState(r.last_seen, r.interval_sec, r.tol_sec, r.status),
      // Expected beats in a full EAT day at the active interval (for the detail table).
      expected_per_day: Math.max(1, Math.round(86400 / interval)),
    };
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

// Gap-minus-grace uptime: a report at ts keeps the device "up" until ts + grace
// (grace = wake interval + tolerance). Downtime in a window = the parts of the
// window NOT covered by any report's [ts, ts+grace] segment. This is the SAME
// interval-based definition the dashboard uses — a device on a long wake interval
// is NOT penalised for the days it isn't due, and a short interval catches partial
// outages. `d` is the outer devices row; `$N` is the window length in days.
function uptimeLateral(nExpr) {
  return `LEFT JOIN LATERAL (
    WITH b AS (
      SELECT (${INTERVAL_SEC_SQL} + ${TOL_SEC_SQL})::numeric AS grace,
             now() - (${nExpr} || ' days')::interval          AS w0,
             EXTRACT(EPOCH FROM (${nExpr} || ' days')::interval)::numeric AS win_sec
    ),
    rr AS (   -- reports inside the window + the last report just before it
      SELECT ts FROM (
        SELECT COALESCE(dt.device_time, dt.received_at) AS ts
          FROM device_telemetry dt
         WHERE dt.device_id = d.id
           AND COALESCE(dt.device_time, dt.received_at) >= (SELECT w0 FROM b)
        UNION ALL
        SELECT max(COALESCE(dt.device_time, dt.received_at))
          FROM device_telemetry dt
         WHERE dt.device_id = d.id
           AND COALESCE(dt.device_time, dt.received_at) <  (SELECT w0 FROM b)
      ) z WHERE ts IS NOT NULL
    ),
    ord AS ( SELECT ts, LAG(ts) OVER (ORDER BY ts) AS prev FROM rr ),
    calc AS (   -- uncovered time between a report's coverage-end and the next report
      SELECT GREATEST(0, EXTRACT(EPOCH FROM (
               LEAST(ts, now())
               - GREATEST(COALESCE(prev + make_interval(secs => (SELECT grace FROM b)), (SELECT w0 FROM b)), (SELECT w0 FROM b))
             )))::numeric AS down
        FROM ord
    )
    SELECT CASE
      WHEN (SELECT count(*) FROM rr) = 0 THEN 0.0
      ELSE GREATEST(0, ROUND(100.0 * (1 - LEAST((SELECT win_sec FROM b),
              (SELECT COALESCE(sum(down),0) FROM calc)
              + GREATEST(0, EXTRACT(EPOCH FROM (now() - GREATEST((SELECT max(ts) FROM rr) + make_interval(secs => (SELECT grace FROM b)), (SELECT w0 FROM b)))))
           ) / NULLIF((SELECT win_sec FROM b),0)), 1))
    END AS uptime_pct
  ) up ON true`;
}

/**
 * FLEET availability. Liveness is the primary view: a device is ALIVE right now
 * when now - last_seen <= its ACTIVE wake interval + tolerance (each device by its
 * own interval; Inactive excluded). Availability over 7/14/30/365-day windows is
 * interval-based (gap-minus-grace uptime), consistent with the dashboard. Per-device
 * rows carry the active interval, any pending (unconfirmed) interval, expected next
 * heartbeat, and live state. Sorted worst-first for SLA triage.
 */
export async function fleetAvailability(windowDays = 30) {
  const W = [7, 14, 30, 365].includes(Number(windowDays)) ? Number(windowDays) : 30;

  // Per-device: liveness + interval-based uptime for the selected window.
  const perDevSql = `
    SELECT d.device_id, d.imei, s.name AS site, d.last_seen, d.status,
           ${INTERVAL_SEC_SQL} AS interval_sec, ${TOL_SEC_SQL} AS tol_sec,
           NULLIF(d.config->>'pending_wake_interval_sec','')::numeric AS pending_sec,
           up.uptime_pct
      FROM devices d
      LEFT JOIN sites s ON s.id = d.site_id
      ${uptimeLateral("$1")}
     ORDER BY up.uptime_pct ASC NULLS FIRST, d.last_seen ASC NULLS FIRST`;

  // Four fleet cards: average interval-based uptime per window (Inactive excluded).
  const cardsSql = `
    SELECT w.n::int AS n, ROUND(AVG(up.uptime_pct)::numeric, 1) AS pct
      FROM devices d
      CROSS JOIN (VALUES (7),(14),(30),(365)) AS w(n)
      ${uptimeLateral("w.n")}
     WHERE lower(coalesce(d.status,'')) <> 'inactive'
     GROUP BY w.n`;

  const [per, cards] = await Promise.all([
    query(perDevSql, [W]).then((r) => r.rows).catch((e) => { console.error("[fleet perDev]", e?.message || e); return []; }),
    query(cardsSql).then((r) => r.rows).catch((e) => { console.error("[fleet cards]", e?.message || e); return []; }),
  ]);

  const cardMap = {};
  for (const c of cards) cardMap[Number(c.n)] = Number(c.pct) || 0;

  const devices = per.map((r) => {
    const state = liveState(r.last_seen, r.interval_sec, r.tol_sec, r.status);
    return {
      device_id: r.device_id,
      imei: r.imei,
      site: r.site || "—",
      last_seen: r.last_seen,
      days: W,
      pct: r.uptime_pct != null ? Number(r.uptime_pct) : 0,   // interval-based uptime %
      up: state === "up",
      state,                                                  // "up" | "down" | "inactive"
      interval_sec: Number(r.interval_sec) || 86400,
      pending_sec: r.pending_sec != null ? Number(r.pending_sec) : null,
      next_at: expectedNext(r.last_seen, r.interval_sec),     // expected next heartbeat (active interval)
    };
  });

  const total = devices.length;
  const inactive = devices.filter((d) => d.state === "inactive").length;
  const upNow = devices.filter((d) => d.state === "up").length;
  const monitored = total - inactive; // devices that can be up/down

  return {
    now: {
      up: upNow,
      inactive,
      total,
      pct: monitored > 0 ? Math.round((upNow / monitored) * 1000) / 10 : 0,
    },
    windows: {
      d7: cardMap[7] || 0, d14: cardMap[14] || 0, d30: cardMap[30] || 0, d365: cardMap[365] || 0,
    },
    window: W,
    devices,
  };
}
