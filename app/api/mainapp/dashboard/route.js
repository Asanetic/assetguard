// app/api/mainapp/dashboard/route.js
// GET /api/mainapp/dashboard  (signed in)
// Everything the Dashboard shows in one call: KPIs (sites/devices/alarms/users),
// device-status donut, open alarms by category, today's telemetry (packets / GPS
// fixes / data MB / alarms), and alarm charts by month / by site (top 10) / by
// region (top 10). Respects the viewer's visibility (security-side users see
// Critical alarms only).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import { alarmPerms } from "../../apiUtils/authUtils/alarmPerms.js";
import { getUserOrg } from "../../apiUtils/dataControl/companies.js";
import { alarmCounts } from "../../apiUtils/dataControl/alarms.js";
import { getOrgConfig } from "../../apiUtils/dataControl/appConfig.js";
import { query } from "../../apiUtils/s_env/db.js";
import { ensureAppHeartbeat } from "../../apiUtils/monitor/appHeartbeat.js";

ensureAppHeartbeat(); // start proof-of-life pings for platform uptime

async function one(sql, params = []) { try { const { rows } = await query(sql, params); return rows[0] || {}; } catch (e) { console.error("[dashboard]", e?.message || e); return {}; } }
async function many(sql, params = []) { try { const { rows } = await query(sql, params); return rows; } catch (e) { console.error("[dashboard]", e?.message || e); return []; } }

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const org = (await getUserOrg(me.sub).catch(() => null)) || { role: me.role, purposes: [] };
    const perms = alarmPerms({ role: me.role, purposes: org.purposes });
    const restrict = perms.criticalOnly;
    // alarm filter for the charts/aggregates (security-side users → Critical only)
    const aw = restrict ? `priority = 'Critical'` : `TRUE`;

    let company = "";
    try { company = (await getOrgConfig())?.name || ""; } catch {}

    const [sites, devAgg, alarms, users, byCategory, today, byMonth, bySite, byRegion,
           telemetryToday, commandsToday, activityToday, usersByStatus, health,
           byHour, byDay] = await Promise.all([
      one(`SELECT count(*)::int AS total,
                  count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS added_month
             FROM sites`),
      many(`SELECT bucket, count(*)::int AS n FROM (
              SELECT CASE
                WHEN lower(coalesce(status,'')) = 'inactive'    THEN 'inactive'
                WHEN lower(coalesce(status,'')) = 'testing'     THEN 'testing'
                WHEN lower(coalesce(status,'')) = 'maintenance' THEN 'maintenance'
                WHEN last_seen IS NULL OR now() - last_seen >
                     ((COALESCE(NULLIF(config->>'wake_interval_sec','')::numeric,
                                NULLIF(config->>'offline_hours','')::numeric * 3600,
                                86400)
                       + COALESCE(NULLIF(config->>'hb_tolerance_sec','')::numeric, 300))
                      * interval '1 second') THEN 'offline'
                ELSE 'live' END AS bucket
              FROM devices) x GROUP BY bucket`),
      alarmCounts(me.role, restrict),
      one(`SELECT count(*)::int AS total,
                  count(*) FILTER (WHERE status = 'Pending')::int AS pending
             FROM users`),
      // ALL alarms grouped by category (alarm_type) — the horizontal bar chart.
      many(`SELECT COALESCE(NULLIF(alarm_type,''), 'OTHER') AS alarm_type,
                   count(*)::int AS n,
                   count(*) FILTER (WHERE status <> 'Closed')::int AS open,
                   max(created_at) AS last_at
              FROM alarms
             WHERE ${aw}
             GROUP BY 1 ORDER BY n DESC, last_at DESC`),
      one(`SELECT
              (SELECT count(*)::int FROM device_telemetry WHERE received_at >= date_trunc('day', now())) AS packets,
              (SELECT count(*)::int FROM device_telemetry
                 WHERE received_at >= date_trunc('day', now())
                   AND lat IS NOT NULL AND lng IS NOT NULL) AS gps_fixes,
              (SELECT COALESCE(SUM(bytes),0)::bigint FROM raw_logs WHERE received_at >= date_trunc('day', now())) AS bytes,
              (SELECT count(*)::int FROM alarms WHERE created_at >= date_trunc('day', now()) AND ${aw}) AS alarms`),
      many(`SELECT to_char(m, 'Mon') AS label, COALESCE(c.n, 0)::int AS n
              FROM generate_series(date_trunc('month', now()) - interval '11 months', date_trunc('month', now()), interval '1 month') m
              LEFT JOIN (SELECT date_trunc('month', created_at) mm, count(*) n
                           FROM alarms WHERE ${aw} AND created_at >= date_trunc('month', now()) - interval '11 months'
                          GROUP BY mm) c ON c.mm = m
             ORDER BY m`),
      many(`SELECT COALESCE(NULLIF(site,''), '—') AS site, count(*)::int AS n
              FROM alarms WHERE ${aw} GROUP BY 1 ORDER BY n DESC LIMIT 10`),
      many(`SELECT COALESCE(s.region, 'Unassigned') AS region, count(*)::int AS n
              FROM alarms a
              LEFT JOIN devices d ON d.device_id = a.device_id
              LEFT JOIN sites s ON s.id = d.site_id
             WHERE ${aw} GROUP BY 1 ORDER BY n DESC LIMIT 10`),
      // --- Today's telemetry (8 cards). Each subquery is independent so a missing
      //     table (e.g. brand-new install) just yields 0, never a hard failure.
      one(`SELECT
              (SELECT count(*)::int FROM device_logs WHERE received_at >= date_trunc('day', now())) AS device_events,
              (SELECT count(*)::int FROM raw_logs WHERE received_at >= date_trunc('day', now()) AND direction = 'in' AND data LIKE '%LK]') AS heartbeats,
              (SELECT count(*)::int FROM device_telemetry WHERE received_at >= date_trunc('day', now()) AND lat IS NOT NULL AND lng IS NOT NULL) AS gps_fixes,
              -- Active incidents = currently open (non-closed) incidents across the fleet.
              (SELECT count(DISTINCT incident_id)::int FROM alarms WHERE status <> 'Closed' AND incident_id IS NOT NULL AND ${aw}) AS active_incidents,
              (SELECT count(*)::int FROM devices WHERE created_at >= date_trunc('day', now())) AS enrolments,
              (SELECT COALESCE(SUM(bytes),0)::bigint FROM raw_logs WHERE received_at >= date_trunc('day', now())) AS bytes`),
      // Commands + firmware today (command_log may not exist yet → {} → zeros).
      one(`SELECT count(*)::int AS sent,
                  count(*) FILTER (WHERE lower(coalesce(status,'')) = 'failed')::int AS failed,
                  count(*) FILTER (WHERE upper(coalesce(cmd,'')) LIKE 'UPGRADE%')::int AS firmware
             FROM command_log WHERE created_at >= date_trunc('day', now())`),
      // Activity — notification sends by channel, for today / this week / month / year.
      one(`SELECT
              count(*) FILTER (WHERE channel='sms'   AND status='sent' AND created_at >= date_trunc('day',now()))::int   AS sms_today,
              count(*) FILTER (WHERE channel='email' AND status='sent' AND created_at >= date_trunc('day',now()))::int   AS email_today,
              count(*) FILTER (WHERE channel='push'  AND status='sent' AND created_at >= date_trunc('day',now()))::int   AS push_today,
              count(*) FILTER (WHERE channel='sms'   AND status='sent' AND created_at >= date_trunc('week',now()))::int  AS sms_week,
              count(*) FILTER (WHERE channel='email' AND status='sent' AND created_at >= date_trunc('week',now()))::int  AS email_week,
              count(*) FILTER (WHERE channel='push'  AND status='sent' AND created_at >= date_trunc('week',now()))::int  AS push_week,
              count(*) FILTER (WHERE channel='sms'   AND status='sent' AND created_at >= date_trunc('month',now()))::int AS sms_month,
              count(*) FILTER (WHERE channel='email' AND status='sent' AND created_at >= date_trunc('month',now()))::int AS email_month,
              count(*) FILTER (WHERE channel='push'  AND status='sent' AND created_at >= date_trunc('month',now()))::int AS push_month,
              count(*) FILTER (WHERE channel='sms'   AND status='sent' AND created_at >= date_trunc('year',now()))::int  AS sms_year,
              count(*) FILTER (WHERE channel='email' AND status='sent' AND created_at >= date_trunc('year',now()))::int  AS email_year,
              count(*) FILTER (WHERE channel='push'  AND status='sent' AND created_at >= date_trunc('year',now()))::int  AS push_year
             FROM notifications`),
      // User administration counts.
      one(`SELECT
              count(*) FILTER (WHERE status = 'Active')::int    AS active,
              count(*) FILTER (WHERE status = 'Pending')::int   AS pending,
              count(*) FILTER (WHERE status = 'Suspended')::int AS suspended
             FROM users`),
      // System health — data-ingestion uptime proxy over the last 30 days
      // (share of hours that received at least one inbound frame).
      one(`SELECT ROUND(100.0 * count(DISTINCT date_trunc('hour', received_at)) / (30*24.0), 1) AS uptime30d
             FROM raw_logs WHERE received_at >= now() - interval '30 days' AND direction = 'in'`),
      // Alarms by HOUR of the current EAT day (Daily tab — 24 bars).
      many(`SELECT lpad(gs::text,2,'0') || 'h' AS label, COALESCE(c.n,0)::int AS n
              FROM generate_series(0,23) gs
              LEFT JOIN (SELECT extract(hour from (created_at AT TIME ZONE 'Africa/Nairobi'))::int h, count(*) n
                           FROM alarms
                          WHERE ${aw} AND (created_at AT TIME ZONE 'Africa/Nairobi')::date = (now() AT TIME ZONE 'Africa/Nairobi')::date
                          GROUP BY h) c ON c.h = gs
             ORDER BY gs`),
      // Alarms by DAY over the last 7 EAT days (Weekly tab — 7 bars).
      many(`SELECT to_char(gs, 'Dy') AS label, COALESCE(c.n,0)::int AS n
              FROM generate_series((now() AT TIME ZONE 'Africa/Nairobi')::date - 6,
                                   (now() AT TIME ZONE 'Africa/Nairobi')::date, interval '1 day') gs
              LEFT JOIN (SELECT (created_at AT TIME ZONE 'Africa/Nairobi')::date d, count(*) n
                           FROM alarms
                          WHERE ${aw} AND created_at >= now() - interval '7 days'
                          GROUP BY d) c ON c.d = gs::date
             ORDER BY gs`),
    ]);

    const dev = { total: 0, live: 0, offline: 0, testing: 0, maintenance: 0, inactive: 0 };
    for (const r of devAgg) { dev[r.bucket] = r.n; dev.total += r.n; }

    const data_mb = Number(((Number(today.bytes) || 0) / 1e6).toFixed(2));

    return NextResponse.json({
      company,
      sites: { total: sites.total || 0, addedThisMonth: sites.added_month || 0 },
      devices: dev,
      alarms: { open: alarms.open || 0, critical: alarms.criticalOpen || 0, closed: alarms.closed || 0, bySeverity: alarms.bySeverity || {} },
      users: { total: users.total || 0, pending: users.pending || 0 },
      byCategory,
      today: { packets: today.packets || 0, gpsFixes: today.gps_fixes || 0, dataMb: data_mb, alarms: today.alarms || 0 },
      // New: 8-card Today's telemetry
      telemetryToday: {
        deviceEvents: telemetryToday.device_events || 0,
        heartbeats: telemetryToday.heartbeats || 0,
        gpsFixes: telemetryToday.gps_fixes || 0,
        activeIncidents: telemetryToday.active_incidents || 0,
        commandsSent: commandsToday.sent || 0,
        commandsFailed: commandsToday.failed || 0,
        firmware: commandsToday.firmware || 0,
        enrolments: telemetryToday.enrolments || 0,
        dataMb: Number(((Number(telemetryToday.bytes) || 0) / 1e6).toFixed(1)),
      },
      activity: {
        today: { sms: activityToday.sms_today || 0, email: activityToday.email_today || 0, push: activityToday.push_today || 0 },
        week:  { sms: activityToday.sms_week || 0,  email: activityToday.email_week || 0,  push: activityToday.push_week || 0 },
        month: { sms: activityToday.sms_month || 0, email: activityToday.email_month || 0, push: activityToday.push_month || 0 },
        year:  { sms: activityToday.sms_year || 0,  email: activityToday.email_year || 0,  push: activityToday.push_year || 0 },
      },
      admin: { active: usersByStatus.active || 0, pending: usersByStatus.pending || 0, suspended: usersByStatus.suspended || 0 },
      health: { uptime30d: health.uptime30d != null ? Number(health.uptime30d) : null },
      byMonth, byHour, byDay, bySite, byRegion,
      viewer: { criticalOnly: restrict },
    });
  } catch (err) {
    console.error("[dashboard GET] error", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
