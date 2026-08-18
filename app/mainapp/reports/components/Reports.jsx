// app/mainapp/reports/components/Reports.jsx
// Operational reports (weekly / monthly / quarterly / yearly) from the prototype,
// wired to real data via /api/mainapp/reports. Uptime, incidents, availability,
// data usage, alarms, SLA compliance, false alarms, notifications, and the full
// alarm lifecycle log. Export to PDF (print) or Word (.doc).
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./reports.module.css";

const PERIODS = [
  { k: "weekly", label: "Weekly" },
  { k: "monthly", label: "Monthly" },
  { k: "quarterly", label: "Quarterly" },
  { k: "yearly", label: "Yearly" },
];
const SEV = { Critical: "#EF4444", High: "#F59E0B", Medium: "#2E6CF5", Low: "#94A3B8" };
function fmtEAT(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }); }
  catch { return "—"; }
}
function mins(a, b) {
  if (!a || !b) return null;
  const d = (new Date(b).getTime() - new Date(a).getTime()) / 60000;
  return d >= 0 ? Math.round(d) : null;
}

export default function Reports() {
  const [period, setPeriod] = useState("monthly");
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const printRef = useRef(null);

  useEffect(() => {
    let ok = true;
    setLoading(true);
    fetch(`/api/mainapp/reports?period=${period}`, { cache: "no-store" })
      .then((r) => r.json().then((j) => ({ ok: r.ok, j })))
      .then(({ ok: rok, j }) => { if (!ok) return; if (!rok) setErr(j.error || "Failed"); else { setD(j.report); setErr(""); } })
      .catch(() => ok && setErr("Network error"))
      .finally(() => ok && setLoading(false));
    return () => { ok = false; };
  }, [period]);

  // PDF = a purpose-built report document (its own layout, charts and watermark)
  // opened in a new window and printed — NOT a screenshot of this page.
  function exportPdf() {
    if (!d) return;
    const html = buildReportHtml(d, period);
    const w = window.open("", "_blank");
    if (!w) { alert("Please allow pop-ups to export the PDF report."); return; }
    w.document.open(); w.document.write(html); w.document.close(); w.focus();
    setTimeout(() => { try { w.print(); } catch {} }, 500);
  }
  function exportDoc() {
    if (!d) return;
    const html = buildDocHtml(d, period);
    const blob = new Blob(["﻿", html], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `AssetGuard-report-${period}.doc`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  if (loading && !d) return <div className={styles.page}><div className={styles.muted}>Building report…</div></div>;
  if (err && !d) return <div className={styles.page}><div className={styles.err}>{err}</div></div>;
  if (!d) return null;

  const K = d.kpis, I = d.incidents, V = d.devices, DT = d.data, AL = d.alarms, N = d.notif;
  const upDelta = (K.uptime - K.uptimePrev).toFixed(2);
  const dr = N.sent ? ((N.delivered / N.sent) * 100).toFixed(1) : "0.0";
  const maxTop = Math.max(1, ...d.topSites.map((t) => t.n));
  const sevSegs = [
    { v: I.critical, c: SEV.Critical }, { v: I.high, c: SEV.High },
    { v: I.medium, c: SEV.Medium }, { v: I.low, c: SEV.Low },
  ].filter((s) => s.v > 0);

  const brand = d.branding || {};
  return (
    <div className={styles.page} ref={printRef} style={{ position: "relative" }}>
      {brand.watermark && brand.logoDataUrl ? (
        <div aria-hidden style={{ position: "fixed", inset: 0, backgroundImage: `url(${brand.logoDataUrl})`, backgroundRepeat: "no-repeat", backgroundPosition: "center", backgroundSize: "48% auto", opacity: 0.05, pointerEvents: "none", zIndex: 0 }} />
      ) : null}
      <div className={styles.head}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {brand.logoDataUrl ? <img src={brand.logoDataUrl} alt="" style={{ height: 40, width: "auto", objectFit: "contain" }} /> : null}
          <div>
            <div className={styles.title}>{brand.companyName ? `${brand.companyName} · Reports` : "Reports"}</div>
            <div className={styles.sub}>Uptime, incidents, availability, data usage and alarms{d.viewer?.criticalOnly ? " · Critical only" : ""}</div>
          </div>
        </div>
      </div>

      {/* period switch + export — inline flex so no global button rule can stack them */}
      {/* Fully inline layout + colours — no CSS-module dependency (avoids stale
          cached chunks). Period pills on the left, a flex:1 spacer, PDF/DOCX right. */}
      <div style={{ display: "flex", flexWrap: "nowrap", alignItems: "center", gap: 8, width: "100%" }}>
        {PERIODS.map((p) => {
          const on = period === p.k;
          return (
            <button key={p.k} type="button" onClick={() => setPeriod(p.k)}
              style={{ flex: "0 0 auto", width: "auto", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap",
                border: `1px solid ${on ? "#2E6CF5" : "#E2E8F0"}`, background: on ? "#2E6CF5" : "#fff", color: on ? "#fff" : "#334155",
                borderRadius: 999, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
              {p.label}
            </button>
          );
        })}
        <div style={{ flex: "1 1 auto" }} />
        <button type="button" onClick={exportPdf}
          style={{ flex: "0 0 auto", width: "auto", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            border: "1px solid #E2E8F0", background: "#fff", color: "#DC2626", borderRadius: 9, padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-file-type-pdf" /> PDF
        </button>
        <button type="button" onClick={exportDoc}
          style={{ flex: "0 0 auto", width: "auto", display: "inline-flex", alignItems: "center", gap: 6, whiteSpace: "nowrap",
            border: "1px solid #E2E8F0", background: "#fff", color: "#2E6CF5", borderRadius: 9, padding: "6px 13px", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
          <i className="ti ti-file-type-docx" /> DOCX
        </button>
      </div>
      <div className={styles.range}>{d.range} · compared against {d.prevRange}</div>

      {/* KPIs */}
      <div className={styles.kpis}>
        <Kpi k="PLATFORM UPTIME" v={`${K.uptime}%`} sub={`vs ${K.uptimePrev}% · ${upDelta >= 0 ? "▲" : "▼"} ${Math.abs(upDelta)} pp`} icon="ti-activity-heartbeat" color="#059669" bg="#D1FAE5" />
        <Kpi k="INCIDENTS" v={I.total} sub={`${I.critical} critical · ${I.resolved} resolved`} icon="ti-alert-triangle" color="#DC2626" bg="#FEE2E2" />
        <Kpi k="DEVICE AVAILABILITY" v={`${V.availability}%`} sub={`${V.available} of ${V.total} devices`} icon="ti-cpu" color="#2E6CF5" bg="#DBE7FE" />
        <Kpi k="DATA USED" v={`${DT.totalGb} GB`} sub={`${DT.perDeviceMb} MB / device`} icon="ti-database" color="#7C3AED" bg="#EDE9FE" />
      </div>

      <div className={styles.grid2}>
        {/* uptime */}
        <Card title="Platform uptime" note={`SLA ${d.sla.target}%`}>
          <div className={styles.upRow}>
            <Gauge value={K.uptime} target={d.sla.target} />
            <div className={styles.upLine}><Line data={d.series.reporting} color="#059669" /></div>
          </div>
          <div className={styles.chips}>
            <span>Downtime <b>{d.sla.downtimeMin} min</b></span>
            <span>Breaches <b style={{ color: d.sla.breaches ? "#DC2626" : "#059669" }}>{d.sla.breaches}</b></span>
            <span>SLA <b style={{ color: d.sla.met ? "#059669" : "#DC2626" }}>{d.sla.met ? "Met" : "Missed"}</b></span>
          </div>
        </Card>

        {/* incidents */}
        <Card title="Incidents" note="by severity">
          <BarsV data={d.series.incidents} labels={d.series.labels} color="#EF4444" />
          <div className={styles.donutRow}>
            <Donut segs={sevSegs} total={I.total} label="TOTAL" />
            <div className={styles.legend}>
              <Leg c={SEV.Critical} t="Critical" n={I.critical} />
              <Leg c={SEV.High} t="High" n={I.high} />
              <Leg c={SEV.Medium} t="Medium" n={I.medium} />
              <Leg c={SEV.Low} t="Low" n={I.low} />
              <div className={styles.mtt}>MTTA · NOC <b>{I.mttaMonitoringMin == null ? "—" : `${I.mttaMonitoringMin}m`}</b> · Security <b>{I.mttaSecurityMin == null ? "—" : `${I.mttaSecurityMin}m`}</b> · MTTR <b>{I.mttrMin == null ? "—" : `${I.mttrMin}m`}</b></div>
            </div>
          </div>
        </Card>

        {/* availability */}
        <Card title="Device availability" note="devices reporting">
          <Line data={d.series.reporting} color="#2E6CF5" tall />
          <div className={styles.chips}>
            <span>Available <b style={{ color: "#059669" }}>{V.available}</b></span>
            <span>Offline <b style={{ color: "#DC2626" }}>{V.offline}</b></span>
            <span>Maintenance <b style={{ color: "#7C3AED" }}>{V.maintenance}</b></span>
            <span>New <b>{V.newEnrolled}</b></span>
          </div>
        </Card>

        {/* data usage */}
        <Card title="Data usage" note="GB transferred">
          <BarsV data={d.series.dataGb} labels={d.series.labels} color="#7C3AED" fmt={(x) => x.toFixed(1)} />
          <div className={styles.chips}>
            <span>Messages <b>{DT.ingestMsgs.toLocaleString()}</b></span>
            <span>Peak <b>{DT.peakMsgMin}/min</b></span>
          </div>
        </Card>

        {/* alarms */}
        <Card title="Alarms" note={`avg ack ${I.mttaMin == null ? "—" : I.mttaMin + " min"}`}>
          <BarsV data={d.series.alarms} labels={d.series.labels} color="#F59E0B" />
          <div className={`${styles.ackBox} ${(I.mttaMin != null && I.mttaMin <= 5) ? styles.ackOk : styles.ackBad}`}>
            <i className="ti ti-clock-check" />
            <span>Average time to acknowledge</span>
            <b>{I.mttaMin == null ? "—" : `${I.mttaMin} min`}</b>
            <em>SLA ≤ 5m</em>
          </div>
          <div className={styles.chips}>
            <span>Ack <b>{AL.ack}</b></span>
            <span>Closed <b style={{ color: "#059669" }}>{AL.closed}</b></span>
            <span>False <b style={{ color: "#B45309" }}>{AL.falsePositive}</b></span>
          </div>
        </Card>

        {/* sites with incidents */}
        <Card title="Sites with incidents" note={`${d.topSites.length} sites`}>
          <div className={styles.siteList}>
            {d.topSites.length ? d.topSites.map((t) => (
              <div key={t.site} className={styles.barRow}>
                <span className={styles.barLbl} title={t.site}>{t.site}</span>
                <span className={styles.barTrack}><span className={styles.barFill} style={{ width: `${Math.round((t.n / maxTop) * 100)}%`, background: "#EF4444" }} /></span>
                <span className={styles.barN}>{t.n}</span>
              </div>
            )) : <div className={styles.muted}>No incidents in this period.</div>}
          </div>
        </Card>
      </div>

      {/* notifications */}
      <Card title="Notifications" note={`${dr}% delivered`}>
        <div className={styles.metrics}>
          <Metric k="Sent" v={N.sent.toLocaleString()} sub="all channels" />
          <Metric k="Delivered" v={N.delivered.toLocaleString()} sub={`${dr}%`} color="#059669" />
          <Metric k="Failed" v={N.failed.toLocaleString()} sub="not sent" color="#DC2626" />
          <Metric k="Recipients reached" v={N.delivered.toLocaleString()} sub="people alerted" color="#2E6CF5" />
        </div>
      </Card>

      {/* SLA compliance */}
      <Card title="SLA compliance" note={`${d.slaRows.filter((r) => r.met).length}/${d.slaRows.length} met`}>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr>{["SERVICE LEVEL", "TARGET", "MEASURED", "STATUS"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {d.slaRows.map((r) => (
                <tr key={r.name}>
                  <td className={styles.slaName}>{r.name}</td>
                  <td className={styles.muted2}>{r.target}</td>
                  <td><b>{r.value}</b></td>
                  <td>{r.met
                    ? <span className={`${styles.pill} ${styles.pOk}`}><i className="ti ti-check" />Met</span>
                    : <span className={`${styles.pill} ${styles.pBad}`}><i className="ti ti-alert-triangle" />Breached</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* full alarm lifecycle log — a table with the detail in columns */}
      <Card title="Alarm full lifecycle log" note={`${d.alarmLog.length} alarms in period · full detail in the exported report`}>
        <div className={styles.tblWrap}>
          <table className={styles.tbl}>
            <thead><tr>{["ALARM", "SITE / DEVICE", "RAISED", "ACK — NOC", "ACK — SECURITY", "ACK NOTE", "CLOSED", "CLOSING NOTE", "OUTCOME"].map((h) => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>
              {d.alarmLog.length ? d.alarmLog.map((a) => {
                const ackNote = a.ackMonitoring?.note || a.ackMonitoring?.finding || a.ackSecurity?.note || a.ackSecurity?.finding || "—";
                return (
                  <tr key={a.id}>
                    <td><a className={styles.link} href={`/mainapp/alarms/${encodeURIComponent(a.id)}`}>{a.name}</a><div className={styles.sub2}><span style={{ color: SEV[a.priority] }}>● {a.priority}</span> · {a.id}</div></td>
                    <td>{a.site || "—"}<div className={styles.sub2}>{a.device_id || ""}</div></td>
                    <td className={styles.muted2}>{fmtEAT(a.created_at)}</td>
                    <td className={styles.muted2}>{a.ackMonitoring ? <>{a.ackMonitoring.by || "—"}<div className={styles.sub2}>{fmtEAT(a.ackMonitoring.at)}</div></> : "—"}</td>
                    <td className={styles.muted2}>{a.ackSecurity ? <>{a.ackSecurity.by || "—"}<div className={styles.sub2}>{fmtEAT(a.ackSecurity.at)}</div></> : "—"}</td>
                    <td className={styles.muted2} style={{ maxWidth: 180 }}>{ackNote}</td>
                    <td className={styles.muted2}>{a.closed_at ? <>{a.closed_by || "—"}<div className={styles.sub2}>{fmtEAT(a.closed_at)}</div></> : "—"}</td>
                    <td className={styles.muted2} style={{ maxWidth: 180 }}>{a.note || "—"}{a.photos?.length ? <div className={styles.sub2}>📷 {a.photos.length} photo{a.photos.length > 1 ? "s" : ""}</div> : null}</td>
                    <td>{a.outcome === "false" ? <span className={`${styles.pill} ${styles.pWarn}`}>False</span> : a.outcome === "genuine" ? <span className={`${styles.pill} ${styles.pOk}`}>Genuine</span> : <span className={styles.muted2}>{a.status}</span>}</td>
                  </tr>
                );
              }) : <tr><td className={styles.muted} colSpan={9}>No alarms in this period.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ---------- small pieces ---------- */
function Kpi({ k, v, sub, icon, color, bg }) {
  return (
    <div className={styles.kpi}>
      <div><div className={styles.kpiK}>{k}</div><div className={styles.kpiV}>{v}</div><div className={styles.kpiSub}>{sub}</div></div>
      <div className={styles.kpiIcon} style={{ background: bg, color }}><i className={`ti ${icon}`} /></div>
    </div>
  );
}
function Card({ title, note, children }) {
  return (
    <div className={styles.card}>
      <div className={styles.cardHead}><span>{title}</span>{note ? <span className={styles.note}>{note}</span> : null}</div>
      <div className={styles.cardBody}>{children}</div>
    </div>
  );
}
function Metric({ k, v, sub, color }) {
  return <div className={styles.metric}><div className={styles.metricK}>{k}</div><div className={styles.metricV} style={color ? { color } : null}>{v}</div><div className={styles.metricSub}>{sub}</div></div>;
}
function Leg({ c, t, n }) {
  return <div className={styles.legRow}><span className={styles.legL}><span className={styles.dot} style={{ background: c }} />{t}</span><b>{n}</b></div>;
}

function Gauge({ value, target, size = 104 }) {
  const r = size / 2 - 9, C = 2 * Math.PI * r, pct = Math.max(0, Math.min(100, value)) / 100;
  const col = value >= target ? "#059669" : "#DC2626";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.gauge}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#EEF2F7" strokeWidth="9" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={col} strokeWidth="9" strokeLinecap="round"
        strokeDasharray={`${C * pct} ${C}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="47%" textAnchor="middle" className={styles.gaugeV}>{value}%</text>
      <text x="50%" y="63%" textAnchor="middle" className={styles.gaugeT}>uptime</text>
    </svg>
  );
}
function Line({ data = [], color = "#2E6CF5", tall }) {
  const w = 300, h = tall ? 92 : 80, pad = 6;
  if (!data.length) return <div className={styles.muted}>No data.</div>;
  const max = Math.max(1, ...data), min = Math.min(0, ...data);
  const sx = (i) => pad + (i * (w - 2 * pad)) / Math.max(1, data.length - 1);
  const sy = (v) => h - pad - ((v - min) / (max - min || 1)) * (h - 2 * pad);
  const pts = data.map((v, i) => `${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className={styles.svgWide} preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
function BarsV({ data = [], labels = [], color = "#2E6CF5", fmt }) {
  const max = Math.max(1, ...data);
  const show = data.length <= 16;
  return (
    <div className={styles.barsV}>
      {data.map((v, i) => (
        <div key={i} className={styles.barCol} title={`${labels[i] || ""}: ${fmt ? fmt(v) : v}`}>
          <div className={styles.barWrap}><div className={styles.bar} style={{ height: `${Math.round((v / max) * 100)}%`, background: color }} /></div>
          {show && <div className={styles.barLblX}>{labels[i]}</div>}
        </div>
      ))}
      {data.length === 0 && <div className={styles.muted}>No data.</div>}
    </div>
  );
}
function Donut({ segs = [], size = 92, total = 0, label = "" }) {
  const R = size / 2 - 8, C = 2 * Math.PI * R;
  const sum = segs.reduce((a, s) => a + s.v, 0) || 1;
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={styles.donut}>
      <circle cx={size / 2} cy={size / 2} r={R} fill="none" stroke="#F1F5F9" strokeWidth="10" />
      {segs.map((s, i) => {
        const len = (s.v / sum) * C, el = (
          <circle key={i} cx={size / 2} cy={size / 2} r={R} fill="none" stroke={s.c} strokeWidth="10"
            strokeDasharray={`${len} ${C - len}`} strokeDashoffset={-acc} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
        );
        acc += len; return el;
      })}
      <text x="50%" y="47%" textAnchor="middle" className={styles.donutV}>{total}</text>
      <text x="50%" y="62%" textAnchor="middle" className={styles.donutL}>{label}</text>
    </svg>
  );
}

// Word-compatible HTML for the .doc export.
/* ---------- exported document builders ---------- */
const esc = (s) => String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

// Inline SVG line chart (area filled) as an HTML string, 0..max auto.
function svgLineStr(data = [], color = "#2E6CF5", W = 520, H = 130) {
  const pad = { l: 6, r: 6, t: 8, b: 8 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const n = data.length; if (!n) return `<div style="color:#94a3b8;font-size:12px">No data.</div>`;
  const max = Math.max(1, ...data.map((v) => Number(v) || 0));
  const x = (i) => pad.l + (n === 1 ? iw / 2 : (i / (n - 1)) * iw);
  const y = (v) => pad.t + ih - ((Number(v) || 0) / max) * ih;
  const pts = data.map((v, i) => [x(i), y(v)]);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" ");
  const area = `${line} L${pts[n - 1][0].toFixed(1)},${(pad.t + ih).toFixed(1)} L${pts[0][0].toFixed(1)},${(pad.t + ih).toFixed(1)} Z`;
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg">
    <path d="${area}" fill="${color}22"/><path d="${line}" fill="none" stroke="${color}" stroke-width="2"/></svg>`;
}
// Inline SVG vertical bars as an HTML string.
function svgBarsStr(data = [], labels = [], color = "#EF4444", W = 520, H = 130) {
  const pad = { l: 6, r: 6, t: 10, b: 18 }, iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;
  const n = data.length; if (!n) return `<div style="color:#94a3b8;font-size:12px">No data.</div>`;
  const max = Math.max(1, ...data.map((v) => Number(v) || 0));
  const bw = iw / n * 0.62, gap = iw / n;
  const bars = data.map((v, i) => {
    const h = ((Number(v) || 0) / max) * ih, xx = pad.l + i * gap + (gap - bw) / 2, yy = pad.t + ih - h;
    const lbl = labels[i] != null && (n <= 14 || i % Math.ceil(n / 10) === 0) ? `<text x="${(xx + bw / 2).toFixed(1)}" y="${H - 5}" text-anchor="middle" font-size="8" fill="#94a3b8">${esc(labels[i])}</text>` : "";
    return `<rect x="${xx.toFixed(1)}" y="${yy.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(1, h).toFixed(1)}" rx="2" fill="${color}"/>${lbl}`;
  }).join("");
  return `<svg viewBox="0 0 ${W} ${H}" width="100%" height="${H}" xmlns="http://www.w3.org/2000/svg">${bars}</svg>`;
}

// A self-contained, print-optimised REPORT document (charts + watermark).
function buildReportHtml(d, period) {
  const K = d.kpis, I = d.incidents, V = d.devices, DT = d.data, AL = d.alarms, N = d.notif, b = d.branding || {};
  const title = `${b.companyName || "AssetGuard"} — ${period[0].toUpperCase() + period.slice(1)} Operations Report`;
  const bd = "border:1px solid #d9e1ec;padding:6px 10px";
  const sla = d.slaRows.map((r) => `<tr><td style="${bd}">${esc(r.name)}</td><td style="${bd}">${esc(r.target)}</td><td style="${bd}"><b>${esc(r.value)}</b></td><td style="${bd};color:${r.met ? "#059669" : "#DC2626"}">${r.met ? "Met" : "Breached"}</td></tr>`).join("");

  const lifecycle = d.alarmLog.slice(0, 300).map((a) => {
    const steps = [`<tr><td style="${bd}"><b>Raised</b></td><td style="${bd}"></td><td style="${bd}">${fmtEAT(a.created_at)}</td><td style="${bd}">${esc((a.alarm_type || "").replace(/_/g, " "))}</td></tr>`];
    if (a.ackMonitoring) steps.push(`<tr><td style="${bd}"><b>Ack · Monitoring (NOC)</b></td><td style="${bd}">${esc(a.ackMonitoring.by)}</td><td style="${bd}">${fmtEAT(a.ackMonitoring.at)}</td><td style="${bd}">${esc(a.ackMonitoring.note || a.ackMonitoring.finding)}</td></tr>`);
    if (a.ackSecurity) steps.push(`<tr><td style="${bd}"><b>Responded · Security</b></td><td style="${bd}">${esc(a.ackSecurity.by)}</td><td style="${bd}">${fmtEAT(a.ackSecurity.at)}</td><td style="${bd}">${esc(a.ackSecurity.note || a.ackSecurity.finding)}</td></tr>`);
    if (a.closed_at) steps.push(`<tr><td style="${bd}"><b>Closed${a.outcome ? " · " + esc(a.outcome) : ""}</b></td><td style="${bd}">${esc(a.closed_by)}</td><td style="${bd}">${fmtEAT(a.closed_at)}</td><td style="${bd}">${esc(a.note)}</td></tr>`);
    const photos = (Array.isArray(a.photos) ? a.photos : []).map((p) => (typeof p === "string" ? p : (p?.url || p?.src || p?.dataUrl || ""))).filter(Boolean);
    const imgs = photos.length ? `<div style="margin:4px 0">${photos.slice(0, 8).map((s) => `<img src="${s}" style="height:120px;margin:3px;border:1px solid #ccc;border-radius:4px">`).join("")}</div>` : "";
    return `<div class="alarm"><h3 style="margin:12px 0 3px">${esc(a.name)} <span style="color:${SEV[a.priority] || "#555"};font-size:12px">● ${esc(a.priority)}</span></h3>
      <div style="color:#64748b;font-size:12px;margin-bottom:4px">${esc(a.id)} · ${esc(a.site || "—")}${a.device_id ? " · " + esc(a.device_id) : ""} · status ${esc(a.status)}</div>
      <table style="border-collapse:collapse;width:100%;font-size:12px"><tr style="background:#f1f5f9"><th style="${bd}">Stage</th><th style="${bd}">By</th><th style="${bd}">When</th><th style="${bd}">Finding / note</th></tr>${steps.join("")}</table>${imgs}</div>`;
  }).join("");

  const wm = (b.watermark && b.logoDataUrl)
    ? `<div class="wm"><img src="${b.logoDataUrl}"></div>` : "";
  const logo = b.logoDataUrl ? `<img src="${b.logoDataUrl}" style="height:52px;margin-right:14px">` : "";

  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #0F274A; margin: 0; }
  .wm { position: fixed; inset: 0; display: flex; align-items: center; justify-content: center; z-index: 0; pointer-events: none; }
  .wm img { width: 58%; opacity: 0.06; }
  .content { position: relative; z-index: 1; }
  header { display: flex; align-items: center; border-bottom: 3px solid #2E6CF5; padding-bottom: 10px; margin-bottom: 14px; }
  h1 { font-size: 20px; margin: 0; } h2 { font-size: 15px; margin: 18px 0 6px; border-left: 4px solid #2E6CF5; padding-left: 8px; }
  .range { color: #64748b; font-size: 12px; }
  .kpis { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin: 10px 0; }
  .kpi { border: 1px solid #E2E8F0; border-radius: 8px; padding: 10px 12px; }
  .kpi .k { font-size: 10px; color: #94a3b8; font-weight: 700; text-transform: uppercase; letter-spacing: .04em; }
  .kpi .v { font-size: 22px; font-weight: 800; } .kpi .s { font-size: 11px; color: #64748b; }
  .charts { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
  .chart { border: 1px solid #EEF2F7; border-radius: 8px; padding: 8px 10px; }
  .chart .ct { font-size: 12px; font-weight: 700; margin-bottom: 4px; }
  table { border-collapse: collapse; width: 100%; font-size: 12px; }
  th { background: #f1f5f9; text-align: left; }
  .alarm { break-inside: avoid; page-break-inside: avoid; }
  @media print { .charts { grid-template-columns: 1fr 1fr; } }
</style></head>
<body>
  ${wm}
  <div class="content">
    <header>${logo}<div><h1>${esc(title)}</h1><div class="range">${esc(d.range)} · compared against ${esc(d.prevRange)}</div></div></header>

    <div class="kpis">
      <div class="kpi"><div class="k">Platform uptime</div><div class="v">${K.uptime}%</div><div class="s">prev ${K.uptimePrev}%</div></div>
      <div class="kpi"><div class="k">Incidents</div><div class="v">${I.total}</div><div class="s">${I.critical} critical · ${I.resolved} resolved</div></div>
      <div class="kpi"><div class="k">Device availability</div><div class="v">${V.availability}%</div><div class="s">${V.available} of ${V.total}</div></div>
      <div class="kpi"><div class="k">Data used</div><div class="v">${DT.totalGb} GB</div><div class="s">${DT.perDeviceMb} MB / device</div></div>
    </div>

    <h2>Trends</h2>
    <div class="charts">
      <div class="chart"><div class="ct">Devices reporting</div>${svgLineStr(d.series.reporting, "#059669")}</div>
      <div class="chart"><div class="ct">Incidents per ${period === "weekly" ? "day" : "bucket"}</div>${svgBarsStr(d.series.incidents, d.series.labels, "#EF4444")}</div>
      <div class="chart"><div class="ct">Alarms raised</div>${svgBarsStr(d.series.alarms, d.series.labels, "#F59E0B")}</div>
      <div class="chart"><div class="ct">Data volume (GB)</div>${svgLineStr(d.series.dataGb, "#7C3AED")}</div>
    </div>

    <h2>SLA compliance</h2>
    <table><tr><th style="${bd}">Service level</th><th style="${bd}">Target</th><th style="${bd}">Measured</th><th style="${bd}">Status</th></tr>${sla}</table>
    <p style="font-size:11px;color:#64748b">MTTA = Mean Time To Acknowledge (raised → acknowledged). Monitoring (NOC) and security acknowledge independently, so each is reported separately. MTTR = Mean Time To Resolve (raised → closed).</p>

    <h2>Alarm full lifecycle log</h2>
    ${lifecycle || "<p>No alarms in this period.</p>"}
  </div>
</body></html>`;
}

function buildDocHtml(d, period) {
  const K = d.kpis, I = d.incidents, V = d.devices, DT = d.data, AL = d.alarms, N = d.notif;
  const row = (a, b) => `<tr><td style="padding:4px 10px;border:1px solid #ccc">${a}</td><td style="padding:4px 10px;border:1px solid #ccc">${b}</td></tr>`;
  const sla = d.slaRows.map((r) => `<tr><td style="border:1px solid #ccc;padding:4px 10px">${r.name}</td><td style="border:1px solid #ccc;padding:4px 10px">${r.target}</td><td style="border:1px solid #ccc;padding:4px 10px">${r.value}</td><td style="border:1px solid #ccc;padding:4px 10px">${r.met ? "Met" : "Breached"}</td></tr>`).join("");
  const brand = d.branding || {};
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
  const bd = "border:1px solid #ccc;padding:4px 8px";

  // Full lifecycle per alarm — a titled block with a step table + photos.
  const lifecycle = d.alarmLog.slice(0, 300).map((a) => {
    const steps = [`<tr><td style="${bd}"><b>Raised</b></td><td style="${bd}"></td><td style="${bd}">${fmtEAT(a.created_at)}</td><td style="${bd}">${esc((a.alarm_type || "").replace(/_/g, " "))}</td></tr>`];
    if (a.ackMonitoring) steps.push(`<tr><td style="${bd}"><b>Ack · Monitoring (NOC)</b></td><td style="${bd}">${esc(a.ackMonitoring.by)}</td><td style="${bd}">${fmtEAT(a.ackMonitoring.at)}</td><td style="${bd}">${esc(a.ackMonitoring.note || a.ackMonitoring.finding)}</td></tr>`);
    if (a.ackSecurity) steps.push(`<tr><td style="${bd}"><b>Responded · Security</b></td><td style="${bd}">${esc(a.ackSecurity.by)}</td><td style="${bd}">${fmtEAT(a.ackSecurity.at)}</td><td style="${bd}">${esc(a.ackSecurity.note || a.ackSecurity.finding)}</td></tr>`);
    if (a.closed_at) steps.push(`<tr><td style="${bd}"><b>Closed${a.outcome ? " · " + esc(a.outcome) : ""}</b></td><td style="${bd}">${esc(a.closed_by)}</td><td style="${bd}">${fmtEAT(a.closed_at)}</td><td style="${bd}">${esc(a.note)}</td></tr>`);
    const photos = (Array.isArray(a.photos) ? a.photos : []).map((p) => (typeof p === "string" ? p : (p?.url || p?.src || p?.dataUrl || ""))).filter(Boolean);
    const imgs = photos.length ? `<p style="margin:4px 0">${photos.slice(0, 8).map((s) => `<img src="${s}" style="height:120px;margin:2px;border:1px solid #ccc">`).join("")}</p>` : "";
    return `<h3 style="margin:14px 0 4px">${esc(a.name)} <span style="color:${SEV[a.priority] || "#555"}">(${esc(a.priority)})</span></h3>
      <p style="margin:0 0 4px;color:#555">${esc(a.id)} · ${esc(a.site || "—")}${a.device_id ? " · " + esc(a.device_id) : ""} · status ${esc(a.status)}</p>
      <table style="border-collapse:collapse;width:100%"><tr><th style="${bd}">Stage</th><th style="${bd}">By</th><th style="${bd}">When</th><th style="${bd}">Finding / note</th></tr>${steps.join("")}</table>${imgs}`;
  }).join("");

  // Real Word watermark: a washed-out picture placed in the page HEADER via VML,
  // centred relative to the margin, so it repeats behind text on EVERY page —
  // this is how Word itself renders a picture watermark (gain/blacklevel fade it).
  const hasWm = !!(brand.watermark && brand.logoDataUrl);
  const wmHeader = hasWm ? `
    <div style='mso-element:header' id="h1"><p class="MsoHeader" style="text-align:center">
      <!--[if gte vml 1]><v:shape id="AGWatermark" o:spid="_x0000_s2049" type="#_x0000_t75"
        style='position:absolute;margin-left:0;margin-top:0;width:400pt;height:200pt;z-index:-251658752;
        mso-position-horizontal:center;mso-position-horizontal-relative:margin;
        mso-position-vertical:center;mso-position-vertical-relative:margin' o:allowincell="f">
        <v:imagedata src="${brand.logoDataUrl}" o:title="watermark" gain="19661f" blacklevel="22938f"/>
      </v:shape><![endif]-->
    </p></div>` : "";
  const header = brand.logoDataUrl
    ? `<table style="width:100%"><tr><td style="width:70px"><img src="${brand.logoDataUrl}" style="height:56px"></td><td><h1 style="margin:0">${esc(brand.companyName || "AssetGuard")} — ${period[0].toUpperCase() + period.slice(1)} Report</h1></td></tr></table>`
    : `<h1>${esc(brand.companyName || "AssetGuard")} — ${period[0].toUpperCase() + period.slice(1)} Report</h1>`;

  return `<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
  <head><meta charset="utf-8">
  <style>
    @page Section1 { size: 595.3pt 841.9pt; margin: 1in 1in 1in 1in; mso-header: h1; }
    div.Section1 { page: Section1; }
    body { font-family: Arial, sans-serif; color: #0F274A; }
  </style></head>
  <body>
  <div class="Section1">
  ${header}
  <p>${d.range} · compared against ${d.prevRange}</p>
  <h2>Summary</h2>
  <table style="border-collapse:collapse">
    ${row("Platform uptime", K.uptime + "% (prev " + K.uptimePrev + "%)")}
    ${row("Incidents", I.total + " (" + I.critical + " critical, " + I.resolved + " resolved)")}
    ${row("MTTA — Monitoring (NOC)", (I.mttaMonitoringMin ?? "—") + " min")}
    ${row("MTTA — Security company", (I.mttaSecurityMin ?? "—") + " min")}
    ${row("MTTR", (I.mttrMin ?? "—") + " min")}
    ${row("Device availability", V.availability + "% (" + V.available + " of " + V.total + ")")}
    ${row("Data used", DT.totalGb + " GB · " + DT.ingestMsgs.toLocaleString() + " messages")}
    ${row("Alarms", AL.raised + " raised, " + AL.closed + " closed, " + AL.falsePositive + " false")}
    ${row("Notifications", N.sent + " sent, " + N.delivered + " delivered, " + N.failed + " failed")}
  </table>
  <h2>SLA compliance</h2>
  <table style="border-collapse:collapse"><tr><th style="border:1px solid #ccc;padding:4px 10px">Service level</th><th style="border:1px solid #ccc;padding:4px 10px">Target</th><th style="border:1px solid #ccc;padding:4px 10px">Measured</th><th style="border:1px solid #ccc;padding:4px 10px">Status</th></tr>${sla}</table>
  <h2>Alarm full lifecycle log</h2>
  ${lifecycle || "<p>No alarms in this period.</p>"}
  ${wmHeader}
  </div>
  </body></html>`;
}
