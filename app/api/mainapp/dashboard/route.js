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

    const [sites, devAgg, alarms, users, byCategory, today, byMonth, bySite, byRegion] = await Promise.all([
      one(`SELECT count(*)::int AS total,
                  count(*) FILTER (WHERE created_at >= date_trunc('month', now()))::int AS added_month
             FROM sites`),
      many(`SELECT bucket, count(*)::int AS n FROM (
              SELECT CASE
                WHEN lower(coalesce(status,'')) = 'pending'     THEN 'pending'
                WHEN lower(coalesce(status,'')) = 'testing'     THEN 'testing'
                WHEN lower(coalesce(status,'')) = 'maintenance' THEN 'maintenance'
                WHEN last_seen IS NULL OR last_seen <= now() - interval '24 hours' THEN 'offline'
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
    ]);

    const dev = { total: 0, live: 0, offline: 0, testing: 0, maintenance: 0, pending: 0 };
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
      byMonth, bySite, byRegion,
      viewer: { criticalOnly: restrict },
    });
  } catch (err) {
    console.error("[dashboard GET] error", err);
    return NextResponse.json({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
