// app/mainapp/dashboard/components/Dashboard.jsx
// AssetGuard dashboard — KPIs, open alarms by category, device-status donut,
// today's telemetry (packets / GPS fixes / data MB / alarms), and alarm charts
// (by month / site top 10 / region top 10).
"use client";

import { useEffect, useState } from "react";
import styles from "./dashboard.module.css";

const STATUS = [
  { key: "live", label: "Live & reporting", color: "#10B981" },
  { key: "offline", label: "Offline", color: "#EF4444" },
  { key: "testing", label: "Testing mode", color: "#F59E0B" },
  { key: "maintenance", label: "Maintenance", color: "#8B5CF6" },
  { key: "pending", label: "Pending", color: "#94A3B8" },
];

// alarm_type → friendly category label + severity colour (mirrors LIVE_META).
const CATEGORY = {
  DISTURBANCE:          { label: "Disturbance", color: "#EF4444" },
  DISTURBANCE_TECH:     { label: "Disturbance — tech on site", color: "#0EA5E9" },
  GEOFENCE_EXIT:        { label: "Geofence violation", color: "#EF4444" },
  CRITICAL_MOTION:      { label: "Critical motion", color: "#EF4444" },
  CRITICAL_LOW_BATTERY: { label: "Critical low battery", color: "#F59E0B" },
  LOW_BATTERY:          { label: "Low battery", color: "#F59E0B" },
  HIGH_TEMPERATURE:     { label: "High temperature", color: "#F59E0B" },
  DEVICE_OFFLINE:       { label: "Device offline", color: "#F59E0B" },
  LOW_DATA:             { label: "Low data", color: "#8B5CF6" },
  NOTIFICATION_FAILED:  { label: "Notification failed", color: "#8B5CF6" },
  OTHER:                { label: "Other", color: "#6366F1" },
};

function relTime(v) {
  if (!v) return "—";
  const t = new Date(v).getTime(); if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const dd = Math.round(h / 24); return dd === 1 ? "yesterday" : `${dd} days ago`;
}
function fmtEAT(v) {
  if (!v) return "";
  try { return new Date(v).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " EAT"; }
  catch { return ""; }
}

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [range, setRange] = useState("monthly");   // System Health range
  const [health, setHealth] = useState(null);
  const [actRange, setActRange] = useState("today"); // notifications activity range

  async function load() {
    try {
      const r = await fetch("/api/mainapp/dashboard", { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Failed to load"); return; }
      setD(j);
    } catch { setErr("Network error"); } finally { setLoading(false); }
  }
  async function loadHealth(rg) {
    try { const r = await fetch(`/api/mainapp/dashboard/health?range=${rg}`, { cache: "no-store" }); if (r.ok) setHealth(await r.json()); } catch {}
  }
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, []);
  useEffect(() => { loadHealth(range); const id = setInterval(() => loadHealth(range), 30000); return () => clearInterval(id); }, [range]);

  if (loading && !d) return <div className={styles.page}><div className={styles.muted}>Loading dashboard…</div></div>;
  if (err && !d) return <div className={styles.page}><div className={styles.err}>{err}</div></div>;

  const dev = d.devices || {};
  const segs = STATUS.map((s) => ({ ...s, value: dev[s.key] || 0 }));

  // Every alarm category, even ones with zero alarms.
  const catMap = Object.fromEntries((d.byCategory || []).map((c) => [c.alarm_type, c]));
  const catList = Object.keys(CATEGORY).filter((k) => k !== "OTHER")
    .map((k) => catMap[k] || { alarm_type: k, n: 0, open: 0 });
  for (const c of (d.byCategory || [])) if (!CATEGORY[c.alarm_type]) catList.push(c); // unknown types
  if (catMap.OTHER) catList.push(catMap.OTHER);
  catList.sort((a, b) => (b.n || 0) - (a.n || 0)); // busiest first, zeros last

  // Selected notifications-activity range (supports both the new {today,week,…}
  // shape and the older flat {sms,email,push} shape for safety).
  const A = (d.activity && (d.activity[actRange] || d.activity)) || {};
  const kpis = [
    { label: "Total sites", value: d.sites?.total ?? 0, sub: d.sites?.addedThisMonth ? `↑ ${d.sites.addedThisMonth} added this month` : "—", icon: "ti-map-pin", color: "#2E6CF5", href: "/mainapp/sites" },
    { label: "Active devices", value: dev.live ?? 0, sub: `${dev.offline ?? 0} offline`, icon: "ti-cpu", color: "#10B981", href: "/mainapp/devices" },
    { label: "Open alarms", value: d.alarms?.open ?? 0, sub: `${d.alarms?.critical ?? 0} critical`, icon: "ti-bell-ringing", color: "#EF4444", href: "/mainapp/alarms" },
    { label: "Total users", value: d.users?.total ?? 0, sub: d.users?.pending ? `${d.users.pending} awaiting approval` : "—", icon: "ti-users", color: "#8B5CF6", href: "/mainapp/admin/users" },
  ];

  const T = d.telemetryToday || {};
  const telemetry = [
    { k: "Device log events", n: (T.deviceEvents ?? 0).toLocaleString(), sub: "ingested today", href: "/mainapp/logs" },
    { k: "Heartbeats", n: (T.heartbeats ?? 0).toLocaleString(), sub: "LK check-ins today", color: "#10B981", href: "/mainapp/logs" },
    { k: "GPS fixes", n: (T.gpsFixes ?? 0).toLocaleString(), sub: "position reports", href: "/mainapp/tcplogs" },
    { k: "Active incidents", n: (T.activeIncidents ?? 0).toLocaleString(), sub: "open now", color: (T.activeIncidents ?? 0) > 0 ? "#EF4444" : undefined, href: "/mainapp/alarms" },
    { k: "Commands sent", n: (T.commandsSent ?? 0).toLocaleString(), sub: `${T.commandsFailed ?? 0} failed`, color: (T.commandsFailed ?? 0) > 0 ? "#EF4444" : undefined, href: "/mainapp/ports" },
    { k: "Firmware updates", n: (T.firmware ?? 0).toLocaleString(), sub: "applied today", href: "/mainapp/devices" },
    { k: "New enrolments", n: (T.enrolments ?? 0).toLocaleString(), sub: "new devices", href: "/mainapp/devices" },
    { k: "Data used", n: `${(T.dataMb ?? 0).toLocaleString()} MB`, sub: "across fleet", href: "/mainapp/logs" },
  ];

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Dashboard</div>
          <div className={styles.sub}>Platform overview{d.company ? ` · ${d.company}` : ""}{d.viewer?.criticalOnly ? " · Critical alarms only" : ""}</div>
        </div>
        <span className={styles.ok}><span className={styles.okDot} />All systems operational</span>
      </div>

      {/* KPIs */}
      <div className={styles.kpis}>
        {kpis.map((k) => (
          <a key={k.label} className={styles.kpi} href={k.href}>
            <div className={styles.kpiBody}>
              <div className={styles.kpiLabel}>{k.label}</div>
              <div className={styles.kpiValue}>{k.value}</div>
              <div className={styles.kpiSub}>{k.sub}</div>
            </div>
            <div className={styles.kpiIcon} style={{ background: `${k.color}1a`, color: k.color }}><i className={`ti ${k.icon}`} /></div>
          </a>
        ))}
      </div>

      {/* Today's telemetry — full-width, 8 tiles */}
      <div className={styles.card}>
        <div className={styles.cardHead}>Today’s telemetry<a className={styles.viewAll} href="/mainapp/logs">View all →</a><span className={styles.since}>since 00:00</span></div>
        <div className={styles.tGrid}>
          {telemetry.map((t) => (
            <a key={t.k} className={styles.tCard} href={t.href}>
              <div className={styles.tN} style={t.color ? { color: t.color } : null}>{t.n}</div>
              <div className={styles.tK}>{t.k}</div>
              <div className={styles.tSub}>{t.sub}</div>
            </a>
          ))}
        </div>
      </div>

      <div className={styles.cols}>
        {/* left column */}
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.cardHead}>Alarms by category<a className={styles.viewAll} href="/mainapp/alarms">View all →</a></div>
            <CatBars data={catList} />
          </div>
        </div>

        {/* right column */}
        <div className={styles.right}>
          <div className={styles.card}>
            <div className={styles.cardHead}>Device status<a className={styles.viewAll} href="/mainapp/devices">View all →</a></div>
            <div className={styles.donutWrap}>
              <Donut segments={segs} total={dev.total || 0} />
            </div>
            <div className={styles.legend}>
              {segs.map((s) => (
                <div key={s.key} className={styles.legRow}>
                  <span className={styles.legL}><span className={styles.dot} style={{ background: s.color }} />{s.label}</span>
                  <b className={styles.legN}>{s.value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* activity / user admin / system health */}
      <div className={styles.groups}>
        <div className={styles.card}>
          <div className={styles.cardHead}>
            Notifications activity
            <span className={styles.rangeSel}>
              {ACT_RANGES.map((r) => (
                <button key={r.k} className={actRange === r.k ? styles.rangeOn : styles.rangeBtn} onClick={() => setActRange(r.k)}>{r.label}</button>
              ))}
            </span>
          </div>
          <div className={styles.rows}>
            <Row label="SMS sent" value={(A.sms ?? 0).toLocaleString()} color="#10B981" />
            <Row label="Emails dispatched" value={(A.email ?? 0).toLocaleString()} color="#2E6CF5" />
            <Row label="Push notifications" value={(A.push ?? 0).toLocaleString()} color="#8B5CF6" />
            <Row label="Total" value={((A.sms || 0) + (A.email || 0) + (A.push || 0)).toLocaleString()} color="#0F274A" />
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardHead}>User administration<a className={styles.viewAll} href="/mainapp/admin/users">View all →</a></div>
          <div className={styles.rows}>
            <Row label="Active users" value={(d.admin?.active ?? 0).toLocaleString()} color="#10B981" />
            <Row label="Pending approvals" value={(d.admin?.pending ?? 0).toLocaleString()} color="#F59E0B" />
            <Row label="Suspended" value={(d.admin?.suspended ?? 0).toLocaleString()} color="#94A3B8" />
          </div>
        </div>
      </div>

      {/* system health — platform uptime + device availability, area charts */}
      <div className={styles.card}>
        <div className={styles.cardHead}>
          System health
          <span className={styles.rangeSel}>
            {RANGES.map((r) => (
              <button key={r.k} className={range === r.k ? styles.rangeOn : styles.rangeBtn} onClick={() => setRange(r.k)}>{r.label}</button>
            ))}
          </span>
        </div>
        <div className={styles.cols2}>
          <HealthChart title="Platform uptime" sub="server online — 100% minus time the server was down" series={health?.platformUptime} summary={health?.summary?.platformUptime} color="#2E6CF5" />
          <HealthChart title="Device availability" sub="installed devices online — 100% minus time devices were offline" series={health?.deviceAvailability} summary={health?.summary?.deviceAvailability} color="#10B981" />
        </div>
      </div>

      {/* charts */}
      <div className={styles.card}>
        <div className={styles.cardHead}>Alarms by month<a className={styles.viewAll} href="/mainapp/alarms">View all →</a><span className={styles.since}>last 12 months</span></div>
        <BarsV data={d.byMonth || []} color="#2E6CF5" tall />
      </div>

      <div className={styles.cols2}>
        <div className={styles.card}>
          <div className={styles.cardHead}>Alarms by site<a className={styles.viewAll} href="/mainapp/alarms">View all →</a><span className={styles.since}>top 10</span></div>
          <BarsH data={(d.bySite || []).map((r) => ({ label: r.site, n: r.n }))} color="#F59E0B" />
        </div>
        <div className={styles.card}>
          <div className={styles.cardHead}>Alarms by region<a className={styles.viewAll} href="/mainapp/alarms">View all →</a><span className={styles.since}>top 10</span></div>
          <BarsH data={(d.byRegion || []).map((r) => ({ label: r.region, n: r.n }))} color="#10B981" />
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, color }) {
  return (
    <div className={styles.row}>
      <span className={styles.rowL}>{label}</span>
      <b className={styles.rowV} style={color ? { color } : null}>{value}</b>
    </div>
  );
}

const RANGES = [
  { k: "daily", label: "Daily" },
  { k: "weekly", label: "Weekly" },
  { k: "monthly", label: "Monthly" },
  { k: "yearly", label: "Yearly" },
];

const ACT_RANGES = [
  { k: "today", label: "Today" },
  { k: "week", label: "Week" },
  { k: "month", label: "Month" },
  { k: "year", label: "Year" },
];

function HealthChart({ title, sub, series, summary, color }) {
  return (
    <div>
      <div className={styles.hcHead}>
        <div>
          <div className={styles.hcTitle}>{title}</div>
          <div className={styles.hcSub}>{sub}</div>
        </div>
        <div className={styles.hcPct} style={{ color }}>{summary != null ? `${summary}%` : "—"}</div>
      </div>
      <AreaChart data={series || []} color={color} />
    </div>
  );
}

// Line + filled area (coloured under the curve) for a 0–100% series.
function AreaChart({ data = [], color = "#2E6CF5" }) {
  const W = 520, H = 150, pad = { l: 28, r: 8, t: 10, b: 22 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const n = data.length;
  if (!n) return <div className={styles.empty}>No data.</div>;
  const x = (i) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => pad.t + ih - (Math.max(0, Math.min(100, v)) / 100) * ih;
  const pts = data.map((row, i) => [x(i), y(row.pct)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const base = pad.t + ih;
  const area = `${line} L${pts[n - 1][0].toFixed(1)},${base.toFixed(1)} L${pts[0][0].toFixed(1)},${base.toFixed(1)} Z`;
  const gid = `ag_${color.replace("#", "")}`;
  const step = Math.max(1, Math.ceil(n / 6));
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={styles.areaSvg}>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0.03" />
        </linearGradient>
      </defs>
      {[0, 50, 100].map((g) => (
        <line key={g} x1={pad.l} y1={y(g)} x2={W - pad.r} y2={y(g)} stroke="#EEF2F7" strokeWidth="1" />
      ))}
      {[0, 50, 100].map((g) => (
        <text key={`l${g}`} x={pad.l - 5} y={y(g) + 3} textAnchor="end" className={styles.axLbl}>{g}</text>
      ))}
      <path d={area} fill={`url(#${gid})`} />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((row, i) => (i % step === 0 || i === n - 1)
        ? <text key={`x${i}`} x={x(i)} y={H - 6} textAnchor="middle" className={styles.axLbl}>{row.t}</text>
        : null)}
    </svg>
  );
}

function MiniStat({ n, k }) {
  return <div className={styles.mini}><div className={styles.miniN}>{n}</div><div className={styles.miniK}>{k}</div></div>;
}

// Alarms-by-category horizontal bars, each coloured by its own category colour.
function CatBars({ data = [] }) {
  if (!data.length) return <div className={styles.empty}>No alarms yet.</div>;
  const max = Math.max(1, ...data.map((x) => x.n || 0));
  return (
    <div className={styles.catBars}>
      {data.map((c) => {
        const meta = CATEGORY[c.alarm_type] || CATEGORY.OTHER;
        return (
          <a key={c.alarm_type} className={styles.catBarRow} href={`/mainapp/alarms?type=${encodeURIComponent(c.alarm_type)}`}>
            <span className={styles.catBarLbl} title={meta.label}>
              <span className={styles.dot} style={{ background: meta.color }} />{meta.label}
            </span>
            <span className={styles.catBarTrack}>
              <span className={styles.catBarFill} style={{ width: `${Math.round(((c.n || 0) / max) * 100)}%`, background: meta.color }} />
            </span>
            <span className={styles.catBarN}>{c.n}{c.open ? <em className={styles.catBarOpen}>{c.open} open</em> : null}</span>
          </a>
        );
      })}
    </div>
  );
}

// multi-segment donut
function Donut({ segments = [], total = 0 }) {
  const R = 52, C = 2 * Math.PI * R;
  const sum = total || segments.reduce((a, s) => a + (s.value || 0), 0) || 1;
  let acc = 0;
  return (
    <svg width="150" height="150" viewBox="0 0 150 150" className={styles.donut}>
      <circle cx="75" cy="75" r={R} fill="none" stroke="#F1F5F9" strokeWidth="16" />
      {segments.filter((s) => s.value > 0).map((s) => {
        const len = (s.value / sum) * C;
        const el = (
          <circle key={s.key} cx="75" cy="75" r={R} fill="none" stroke={s.color} strokeWidth="16"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform="rotate(-90 75 75)" />
        );
        acc += len; return el;
      })}
      <text x="75" y="72" textAnchor="middle" className={styles.donutN}>{total}</text>
      <text x="75" y="90" textAnchor="middle" className={styles.donutC}>DEVICES</text>
    </svg>
  );
}

// vertical bars
function BarsV({ data = [], color = "#2E6CF5", tall }) {
  const max = Math.max(1, ...data.map((x) => x.n || 0));
  return (
    <div className={`${styles.barsV} ${tall ? styles.barsVTall : ""}`}>
      {data.map((x, i) => (
        <div key={i} className={styles.barVcol} title={`${x.label}: ${x.n}`}>
          <div className={styles.barVwrap}>
            <div className={styles.barV} style={{ height: `${Math.round(((x.n || 0) / max) * 100)}%`, background: color }}>
              {x.n ? <span className={styles.barVn}>{x.n}</span> : null}
            </div>
          </div>
          <div className={styles.barVlbl}>{x.label}</div>
        </div>
      ))}
      {data.length === 0 && <div className={styles.empty}>No data.</div>}
    </div>
  );
}

// horizontal bars
function BarsH({ data = [], color = "#F59E0B" }) {
  const max = Math.max(1, ...data.map((x) => x.n || 0));
  return (
    <div className={styles.barsH}>
      {data.map((x, i) => (
        <div key={i} className={styles.barHrow}>
          <span className={styles.barHlbl} title={x.label}>{x.label}</span>
          <span className={styles.barHtrack}><span className={styles.barHfill} style={{ width: `${Math.round(((x.n || 0) / max) * 100)}%`, background: color }} /></span>
          <span className={styles.barHn}>{x.n}</span>
        </div>
      ))}
      {data.length === 0 && <div className={styles.empty}>No data.</div>}
    </div>
  );
}
