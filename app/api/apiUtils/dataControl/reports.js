// app/api/apiUtils/dataControl/reports.js
// Operational reports computed from REAL data: alarms (incidents, MTTA/MTTR, false
// positives), raw_logs (data volume + platform uptime proxy), device_telemetry +
// devices (availability), notifications (delivery), and missed_alarms (SLA). One
// entry point, buildReport(period), returns everything the Reports page renders.
import { query } from "../s_env/db.js";

const TZ = "Africa/Nairobi";
const pad = (n) => String(n).padStart(2, "0");
const iso = (d) => d.toISOString();

// Resolve the current + previous window for a period, plus a bucket granularity
// and label format for the per-bucket series (charts).
function windowFor(period) {
  const now = new Date();
  const y = now.getUTCFullYear(), m = now.getUTCMonth();
  const mk = (yy, mm, dd) => new Date(Date.UTC(yy, mm, dd));
  const shortMonth = (dt) => dt.toLocaleString("en-GB", { month: "short", year: "numeric" });
  // step = SQL interval per bucket; labelKind decides how JS labels each bucket to
  // match the prototype exactly: Weekly→day names, Monthly→W1..W5, Quarterly→month
  // names, Yearly→Q1..Q4.
  let from, to = now, prevFrom, prevTo, step, labelKind, label, prevLabel;
  if (period === "weekly") {
    from = new Date(now.getTime() - 6 * 86400000); from.setUTCHours(0, 0, 0, 0);
    prevFrom = new Date(from.getTime() - 7 * 86400000); prevTo = from;
    step = "1 day"; labelKind = "day";
    label = "Last 7 days"; prevLabel = "previous 7 days";
  } else if (period === "quarterly") {
    const q = Math.floor(m / 3) * 3;
    from = mk(y, q, 1); prevFrom = mk(y, q - 3, 1); prevTo = from;
    step = "1 month"; labelKind = "month";
    label = `Q${Math.floor(q / 3) + 1} ${y}`; prevLabel = "previous quarter";
  } else if (period === "yearly") {
    from = mk(y, 0, 1); prevFrom = mk(y - 1, 0, 1); prevTo = from;
    step = "3 months"; labelKind = "quarter";
    label = `${y}`; prevLabel = `${y - 1}`;
  } else { // monthly (default)
    period = "monthly";
    from = mk(y, m, 1); prevFrom = mk(y, m - 1, 1); prevTo = from;
    step = "7 days"; labelKind = "week";
    label = shortMonth(now); prevLabel = shortMonth(mk(y, m - 1, 1));
  }
  const hours = Math.max(1, Math.round((to - from) / 3600000));
  return { period, from, to, prevFrom, prevTo, step, labelKind, label, prevLabel, hours };
}

// Label a bucket by its start date + the period's labelKind (matches the prototype).
function bucketLabel(kind, startIso, idx) {
  const dt = new Date(startIso);
  if (kind === "week") return `W${idx}`;
  if (kind === "quarter") return `Q${idx}`;
  if (kind === "month") return dt.toLocaleString("en-GB", { month: "short", timeZone: "UTC" });
  return dt.toLocaleString("en-GB", { weekday: "short", timeZone: "UTC" }); // day
}

async function one(sql, p = []) { try { const { rows } = await query(sql, p); return rows[0] || {}; } catch (e) { console.error("[reports]", e?.message || e); return {}; } }
async function many(sql, p = []) { try { const { rows } = await query(sql, p); return rows; } catch (e) { console.error("[reports]", e?.message || e); return []; } }

export async function buildReport(period, { restrictCritical = false } = {}) {
  const w = windowFor(period);
  const fromIso = iso(w.from), toIso = iso(w.to);
  const pFromIso = iso(w.prevFrom), pToIso = iso(w.prevTo);
  const aw = restrictCritical ? `priority = 'Critical'` : `TRUE`;

  const [
    alarmAgg, alarmPrev, incidentsCount, devAgg, dataAgg, peak, notif,
    uptimeCur, uptimePrevRow, seriesRows, topSites,
    missed, battery, alarmLog,
  ] = await Promise.all([
    // alarms in period: severity split, resolution, MTTA/MTTR, false positives
    one(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE priority='Critical')::int AS critical,
              count(*) FILTER (WHERE priority='High')::int     AS high,
              count(*) FILTER (WHERE priority='Medium')::int   AS medium,
              count(*) FILTER (WHERE priority='Low')::int      AS low,
              count(*) FILTER (WHERE status='Closed')::int     AS closed,
              count(*) FILTER (WHERE status<>'Open')::int      AS acknowledged,
              count(*) FILTER (WHERE close_outcome='false')::int AS false_positive,
              round(avg(EXTRACT(EPOCH FROM (LEAST(ack_monitoring_at, ack_security_at) - created_at))/60)
                    FILTER (WHERE ack_monitoring_at IS NOT NULL OR ack_security_at IS NOT NULL))::int AS mtta_min,
              -- ack times are measured separately per company: the monitoring
              -- company (NOC) and the security company acknowledge independently.
              round(avg(EXTRACT(EPOCH FROM (ack_monitoring_at - created_at))/60)
                    FILTER (WHERE ack_monitoring_at IS NOT NULL))::int AS mtta_monitoring_min,
              round(avg(EXTRACT(EPOCH FROM (ack_security_at - created_at))/60)
                    FILTER (WHERE ack_security_at IS NOT NULL))::int AS mtta_security_min,
              round(avg(EXTRACT(EPOCH FROM (closed_at - created_at))/60)
                    FILTER (WHERE closed_at IS NOT NULL))::int AS mttr_min
         FROM alarms WHERE ${aw} AND created_at >= $1 AND created_at < $2`,
      [fromIso, toIso]),
    one(`SELECT count(*)::int AS total FROM alarms WHERE ${aw} AND created_at >= $1 AND created_at < $2`, [pFromIso, pToIso]),
    one(`SELECT count(DISTINCT incident_id)::int AS incidents FROM alarms WHERE ${aw} AND incident_id IS NOT NULL AND created_at >= $1 AND created_at < $2`, [fromIso, toIso]),
    // devices snapshot
    one(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE lower(coalesce(status,''))='live' OR (last_seen IS NOT NULL AND last_seen > now() - interval '24 hours'))::int AS live,
              count(*) FILTER (WHERE (last_seen IS NULL OR last_seen <= now() - interval '24 hours') AND lower(coalesce(status,'')) NOT IN ('pending','testing','maintenance'))::int AS offline,
              count(*) FILTER (WHERE lower(coalesce(status,''))='maintenance')::int AS maintenance,
              count(*) FILTER (WHERE created_at >= $1 AND created_at < $2)::int AS new_enrolled
         FROM devices`, [fromIso, toIso]),
    // data volume + messages
    one(`SELECT COALESCE(SUM(bytes),0)::bigint AS bytes, count(*)::int AS msgs FROM raw_logs WHERE received_at >= $1 AND received_at < $2`, [fromIso, toIso]),
    one(`SELECT COALESCE(MAX(c),0)::int AS peak FROM (SELECT count(*) c FROM raw_logs WHERE received_at >= $1 AND received_at < $2 GROUP BY date_trunc('minute', received_at)) x`, [fromIso, toIso]),
    // notifications
    one(
      `SELECT count(*)::int AS sent,
              count(*) FILTER (WHERE status='sent')::int   AS delivered,
              count(*) FILTER (WHERE status='failed')::int AS failed
         FROM notifications WHERE created_at >= $1 AND created_at < $2`, [fromIso, toIso]),
    // uptime proxy = share of HOURS in the window that received any raw traffic
    one(`SELECT count(DISTINCT date_trunc('hour', received_at))::int AS h FROM raw_logs WHERE received_at >= $1 AND received_at < $2`, [fromIso, toIso]),
    one(`SELECT count(DISTINCT date_trunc('hour', received_at))::int AS h FROM raw_logs WHERE received_at >= $1 AND received_at < $2`, [pFromIso, pToIso]),
    // per-bucket series (one query, range-joined) — alarms, incidents, data GB and
    // devices reporting per bucket. $3 = the bucket step interval (e.g. '7 days').
    many(
      `WITH b AS (
         SELECT gs AS bstart, (row_number() OVER (ORDER BY gs))::int AS idx
           FROM generate_series($1::timestamptz, $2::timestamptz - interval '1 second', $3::interval) gs
       )
       SELECT b.idx, b.bstart,
         (SELECT count(*) FROM alarms a WHERE ${aw} AND a.created_at >= b.bstart AND a.created_at < b.bstart + $3::interval)::int AS alarms,
         (SELECT count(DISTINCT a.incident_id) FROM alarms a WHERE ${aw} AND a.incident_id IS NOT NULL AND a.created_at >= b.bstart AND a.created_at < b.bstart + $3::interval)::int AS incidents,
         (SELECT COALESCE(SUM(bytes),0)/1e9 FROM raw_logs r WHERE r.received_at >= b.bstart AND r.received_at < b.bstart + $3::interval)::numeric(12,2) AS gb,
         (SELECT count(DISTINCT device_id) FROM device_telemetry t WHERE t.received_at >= b.bstart AND t.received_at < b.bstart + $3::interval)::int AS reporting
       FROM b ORDER BY b.idx`, [fromIso, toIso, w.step]),
    // top sites by incidents
    many(`SELECT COALESCE(NULLIF(site,''),'—') AS site, count(*)::int AS n FROM alarms WHERE ${aw} AND created_at >= $1 AND created_at < $2 GROUP BY 1 ORDER BY n DESC LIMIT 12`, [fromIso, toIso]),
    // SLA inputs
    one(`SELECT count(*)::int AS n FROM missed_alarms WHERE created_at >= $1 AND created_at < $2`, [fromIso, toIso]).catch(() => ({ n: 0 })),
    one(`SELECT count(*) FILTER (WHERE battery IS NOT NULL AND battery < 10)::int AS below10, COALESCE(MIN(battery),100)::int AS min_batt, count(*)::int AS total FROM devices`),
    // FULL alarm lifecycle log for the period — raised → ack (monitoring +
    // security, independently) → close, with who / notes / timestamps / photos.
    many(
      `SELECT id, name, priority, alarm_type, status, site, device_id, incident_id, created_at,
              LEAST(ack_monitoring_at, ack_security_at) AS ack_at,
              ack_monitoring_at, ack_monitoring_by, ack_monitoring_finding, ack_monitoring_note,
              ack_security_at,   ack_security_by,   ack_security_finding,   ack_security_note,
              closed_at, closed_by, close_outcome, close_note, close_photos
         FROM alarms WHERE ${aw} AND created_at >= $1 AND created_at < $2
        ORDER BY created_at DESC LIMIT 500`, [fromIso, toIso]),
  ]);

  const bytes = Number(dataAgg.bytes || 0);
  const totalGb = +(bytes / 1e9).toFixed(2);
  const devTotal = devAgg.total || 0;
  const perDeviceMb = devTotal ? +((bytes / 1e6) / devTotal).toFixed(1) : 0;
  const uptime = +((Math.min(uptimeCur.h || 0, w.hours) / w.hours) * 100).toFixed(2);
  const prevHours = Math.max(1, Math.round((w.prevTo - w.prevFrom) / 3600000));
  const uptimePrev = +((Math.min(uptimePrevRow.h || 0, prevHours) / prevHours) * 100).toFixed(2);
  const availability = devTotal ? +(((devAgg.live || 0) / devTotal) * 100).toFixed(1) : 0;

  const mtta = alarmAgg.mtta_min ?? null;
  const mttaMon = alarmAgg.mtta_monitoring_min ?? null;
  const mttaSec = alarmAgg.mtta_security_min ?? null;
  const mttr = alarmAgg.mttr_min ?? null;
  const openUnack = (alarmAgg.total || 0) - (alarmAgg.acknowledged || 0);

  // Contracted SLAs — each measured, not asserted. Ack time is reported per
  // company (monitoring NOC and security acknowledge independently).
  const slaRows = [
    { name: "Platform uptime", target: "≥ 99.5%", value: `${uptime}%`, met: uptime >= 99.5 },
    { name: "MTTA — Monitoring (NOC)", target: "≤ 5 min", value: mttaMon == null ? "—" : `${mttaMon} min`, met: mttaMon == null ? true : mttaMon <= 5 },
    { name: "MTTA — Security company", target: "≤ 15 min", value: mttaSec == null ? "—" : `${mttaSec} min`, met: mttaSec == null ? true : mttaSec <= 15 },
    { name: "Incident resolution (MTTR)", target: "≤ 60 min", value: mttr == null ? "—" : `${mttr} min`, met: mttr == null ? true : mttr <= 60 },
    { name: "Missed alarms", target: "0 missed", value: `${missed.n || 0}`, met: (missed.n || 0) === 0 },
    { name: "Device battery ≥ 10%", target: "≥ 10%", value: `${battery.below10 || 0} below`, met: (battery.below10 || 0) === 0 },
    { name: "Unacknowledged alarms", target: "0 open", value: `${openUnack}`, met: openUnack === 0 },
  ];
  const breaches = slaRows.filter((r) => !r.met).length;

  return {
    period: w.period, range: w.label, prevRange: w.prevLabel,
    kpis: {
      uptime, uptimePrev,
      incidents: incidentsCount.incidents || alarmAgg.total || 0,
      availability,
      dataGb: totalGb,
    },
    incidents: {
      total: alarmAgg.total || 0, critical: alarmAgg.critical || 0, high: alarmAgg.high || 0,
      medium: alarmAgg.medium || 0, low: alarmAgg.low || 0, resolved: alarmAgg.closed || 0,
      mttaMin: mtta, mttaMonitoringMin: mttaMon, mttaSecurityMin: mttaSec, mttrMin: mttr,
    },
    devices: {
      total: devTotal, available: devAgg.live || 0, availability,
      offline: devAgg.offline || 0, maintenance: devAgg.maintenance || 0, newEnrolled: devAgg.new_enrolled || 0,
    },
    data: { totalGb, perDeviceMb, ingestMsgs: dataAgg.msgs || 0, peakMsgMin: peak.peak || 0 },
    alarms: {
      raised: alarmAgg.total || 0, ack: alarmAgg.acknowledged || 0, closed: alarmAgg.closed || 0,
      falsePositive: alarmAgg.false_positive || 0,
    },
    notif: { sent: notif.sent || 0, delivered: notif.delivered || 0, failed: notif.failed || 0 },
    sla: { target: 99.5, met: uptime >= 99.5 && breaches === 0, breaches, downtimeMin: Math.max(0, Math.round((w.hours - Math.min(uptimeCur.h || 0, w.hours)) * 60)) },
    slaRows,
    series: {
      labels: seriesRows.map((r) => bucketLabel(w.labelKind, r.bstart, r.idx)),
      incidents: seriesRows.map((r) => r.incidents),
      alarms: seriesRows.map((r) => r.alarms),
      dataGb: seriesRows.map((r) => Number(r.gb)),
      reporting: seriesRows.map((r) => r.reporting),
    },
    topSites: topSites.map((r) => ({ site: r.site, n: r.n })),
    // Full lifecycle per alarm: raised → ack (monitoring + security) → closed,
    // with who, findings, notes, timestamps and any photos captured at close.
    alarmLog: alarmLog.map((a) => ({
      id: a.id, name: a.name, priority: a.priority, alarm_type: a.alarm_type, status: a.status,
      site: a.site, device_id: a.device_id, incident_id: a.incident_id,
      created_at: a.created_at, ack_at: a.ack_at,
      ackMonitoring: a.ack_monitoring_at ? { at: a.ack_monitoring_at, by: a.ack_monitoring_by, finding: a.ack_monitoring_finding, note: a.ack_monitoring_note } : null,
      ackSecurity: a.ack_security_at ? { at: a.ack_security_at, by: a.ack_security_by, finding: a.ack_security_finding, note: a.ack_security_note } : null,
      closed_at: a.closed_at, closed_by: a.closed_by, outcome: a.close_outcome, note: a.close_note,
      photos: Array.isArray(a.close_photos) ? a.close_photos : (a.close_photos || []),
    })),
  };
}
