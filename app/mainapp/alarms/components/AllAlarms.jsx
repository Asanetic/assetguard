// app/mainapp/alarms/components/AllAlarms.jsx
// All Alarms — a faithful port of the prototype's alarms table: five severity
// summary cards (Critical / High / Medium / Low active + Closed) that also act as
// filters, a search + priority + status toolbar, and a table of every alarm with
// Acknowledge / View actions.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./allalarms.module.css";
import { alarmSeverityColor } from "../../lib/googleMaps.js";
import { ackView } from "../../lib/ackView.js";
import AckModal from "./AckModal.jsx";

const PRIORITIES = ["All priorities", "Critical", "High", "Medium", "Low"];
const STATUSES = ["All statuses", "Open", "Acknowledged", "Closed"];
const CLOSED_GREEN = "#059669";

// Absolute time in East Africa Time (Africa/Nairobi, UTC+3) — e.g. "13 Aug 2026 @ 12:00:23 pm".
function fmtStampEAT(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    const date = d.toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", year: "numeric" });
    const time = d.toLocaleTimeString("en-US", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true }).toLowerCase();
    return `${date} @ ${time}`;
  } catch { return "—"; }
}
function relTime(v) {
  if (!v) return "—";
  const t = new Date(v).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const dd = Math.round(h / 24); return dd === 1 ? "Yesterday" : `${dd} days ago`;
}

export default function AllAlarms() {
  const [alarms, setAlarms] = useState([]);
  const [viewer, setViewer] = useState({});
  const [counts, setCounts] = useState({ bySeverity: {}, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [priority, setPriority] = useState("All priorities");
  const [status, setStatus] = useState("All statuses");
  const [statFilter, setStatFilter] = useState(null);
  const [view, setView] = useState("real");   // "real" | "test"
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  async function load() {
    try {
      const res = await fetch("/api/mainapp/alarms?scope=all&test=all", { cache: "no-store" });
      const d = res.ok ? await res.json() : { alarms: [], counts: {} };
      setAlarms(Array.isArray(d.alarms) ? d.alarms : []);
      setViewer(d.viewer || {});
      setCounts(d.counts || { bySeverity: {}, closed: 0 });
    } catch { /* keep */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function flash(msg) { setToast(msg); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 2400); }

  const isTest = (a) => a.source === "test";
  const testCount = useMemo(() => alarms.filter(isTest).length, [alarms]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return alarms.filter((a) => {
      // Real view hides test/drill alarms; Test view shows only them.
      if (view === "test" ? !isTest(a) : isTest(a)) return false;
      if (priority !== "All priorities" && a.priority !== priority) return false;
      // Filter on the per-side status the viewer actually sees (so a monitoring
      // user filtering "Open" still gets alarms the security side already acked).
      if (status !== "All statuses" && ackView(a, viewer).status !== status) return false;
      if (!term) return true;
      return (`${a.name} ${a.device_id} ${a.site} ${a.serial} ${a.id}`).toLowerCase().includes(term);
    });
  }, [alarms, q, priority, status, viewer, view]);

  const STAT_CARDS = [
    { key: "Critical", color: alarmSeverityColor("Critical"), n: counts.bySeverity?.Critical || 0, hint: "active" },
    { key: "High", color: alarmSeverityColor("High"), n: counts.bySeverity?.High || 0, hint: "active" },
    { key: "Medium", color: alarmSeverityColor("Medium"), n: counts.bySeverity?.Medium || 0, hint: "active" },
    { key: "Low", color: alarmSeverityColor("Low"), n: counts.bySeverity?.Low || 0, hint: "active" },
    { key: "Closed", color: CLOSED_GREEN, n: counts.closed || 0, hint: "not counted in any category", green: true },
  ];

  function clickStat(key) {
    if (statFilter === key) {
      setStatFilter(null); setPriority("All priorities"); setStatus("All statuses"); return;
    }
    setStatFilter(key);
    if (key === "Closed") { setStatus("Closed"); setPriority("All priorities"); }
    else { setPriority(key); setStatus("All statuses"); }
  }

  const [ackId, setAckId] = useState(null);   // alarm being acknowledged (opens the modal)

  function pillClass(st) { return st === "Open" ? styles.pillOpen : st === "Acknowledged" ? styles.pillAck : styles.pillClosed; }
  function sevColor(a) { return a.status === "Closed" ? CLOSED_GREEN : alarmSeverityColor(a.priority); }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.title}>All Alarms</div>
        <div className={styles.sub}>Every alarm across your sites — open, acknowledged and closed</div>
      </div>

      <div className={styles.stats}>
        {STAT_CARDS.map((c) => (
          <div key={c.key} className={`${styles.stat} ${statFilter === c.key ? styles.statOn : ""}`} onClick={() => clickStat(c.key)}>
            <div className={styles.statTop}>
              <span className={styles.statDot} style={{ background: c.color }} />
              <span className={styles.statLabel} style={{ color: c.green ? CLOSED_GREEN : "#64748b" }}>{c.key.toUpperCase()}</span>
            </div>
            <div className={styles.statNum} style={{ color: c.green ? CLOSED_GREEN : "#0f274a" }}>{c.n}</div>
            <div className={styles.statHint}>{c.hint}</div>
          </div>
        ))}
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.search}>
            <i className="ti ti-search" />
            <input className={styles.searchInput} placeholder="Search alarms, devices, sites, serials..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className={styles.select} value={priority} onChange={(e) => { setPriority(e.target.value); setStatFilter(null); }}>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select className={styles.select} value={status} onChange={(e) => { setStatus(e.target.value); setStatFilter(null); }}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {/* Real / Test (drill) view toggle */}
          <div style={{ display: "inline-flex", gap: 4, background: "#F1F5F9", padding: 4, borderRadius: 999, marginLeft: "auto" }}>
            {[["real", "Real"], ["test", "Test"]].map(([k, l]) => (
              <button key={k} onClick={() => setView(k)}
                style={{ border: 0, cursor: "pointer", borderRadius: 999, padding: "6px 14px", fontSize: 12.5, fontWeight: 700,
                         background: view === k ? "#fff" : "transparent", color: view === k ? "#0F274A" : "#64748b",
                         boxShadow: view === k ? "0 1px 3px rgba(15,23,42,.12)" : "none" }}>
                {l}{k === "test" && testCount > 0 ? ` (${testCount})` : ""}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>{["ALARM", "DEVICE — SITE", "PRIORITY", "STATUS", "TIME", "ACTIONS"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {loading ? <tr><td className={styles.empty} colSpan={6}>Loading…</td></tr>
                : filtered.length ? filtered.map((a) => {
                  const col = sevColor(a);
                  const av = ackView(a, viewer);   // per-side status + whether THIS viewer can still ack
                  return (
                    <tr key={a.id}>
                      <td>
                        <div className={styles.alName}>{a.name}</div>
                        <div className={styles.alMeta}>{a.id} · SN {a.serial}</div>
                      </td>
                      <td>
                        <div className={styles.devName}>{a.device_id}</div>
                        <div className={styles.devSite}>{a.site}</div>
                      </td>
                      <td><span className={styles.sev} style={{ color: col }}><span className={styles.dot} style={{ background: col }} />{a.priority}</span></td>
                      <td><span className={`${styles.pill} ${pillClass(av.status)}`}>{av.status.toUpperCase()}</span></td>
                      <td className={styles.time}>
                        <div className={styles.timeStamp}>{fmtStampEAT(a.created_at)}</div>
                        <div className={styles.timeAgo}>{relTime(a.created_at)}</div>
                      </td>
                      <td>
                        <div className={styles.acts}>
                          {av.canAck && <button type="button" className={styles.ackBtn} onClick={() => setAckId(a.id)}>Acknowledge</button>}
                          <a className={styles.viewBtn} href={`/mainapp/alarms/${encodeURIComponent(a.id)}`}>View</a>
                        </div>
                      </td>
                    </tr>
                  );
                }) : <tr><td className={styles.empty} colSpan={6}>No alarms match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
      {ackId && <AckModal alarmId={ackId} onClose={() => setAckId(null)} onDone={() => { setAckId(null); flash("Alarm acknowledged"); load(); }} />}
    </div>
  );
}
