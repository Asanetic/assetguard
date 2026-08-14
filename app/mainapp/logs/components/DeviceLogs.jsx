// app/mainapp/logs/components/DeviceLogs.jsx
// Device logs — a device's heartbeats (routine reporting). Pick a device and a
// date range to see the state of the device every day (one row per day), then
// expand any day to analyse its individual heartbeats. Reads /api/mainapp/logs.
"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./deviceLogs.module.css";

const TZ = "Africa/Nairobi";
const pad = (n) => String(n).padStart(2, "0");
const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

function fmtDay(d) {
  try { return new Date(`${d}T12:00:00`).toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }); }
  catch { return d; }
}
function fmtTime(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleTimeString("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }); }
  catch { return "—"; }
}
function fmtGap(s) {
  if (s == null) return "—";
  s = Math.round(s);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
// Device state for the day, from the longest reporting gap + battery.
function dayHealth(d) {
  const g = d.max_gap_s || 0;
  let key = "healthy", label = "Healthy";
  if (d.beats <= 1) { key = "sparse"; label = "Single report"; }
  else if (g > 3 * 3600) { key = "offline"; label = "Long gaps"; }
  else if (g > 30 * 60) { key = "watch"; label = "Some gaps"; }
  const low = d.batt_min != null && d.batt_min <= 20;
  return { key, label, low };
}

export default function DeviceLogs() {
  const [devices, setDevices] = useState([]);
  const [device, setDevice] = useState("");        // device_id
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(isoDate(new Date(today.getTime() - 13 * 86400000)));
  const [to, setTo] = useState(isoDate(today));

  const [data, setData] = useState(null);          // { device, days }
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const [open, setOpen] = useState({});            // day -> true
  const [detail, setDetail] = useState({});        // day -> { loading, beats, err }

  // devices for the picker
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/mainapp/devices", { cache: "no-store" });
        const d = await r.json();
        const list = Array.isArray(d.devices) ? d.devices : [];
        setDevices(list);
        if (list.length) setDevice(list[0].device_id || list[0].imei || "");
      } catch {}
    })();
  }, []);

  async function load() {
    if (!device) return;
    setLoading(true); setErr(""); setOpen({}); setDetail({});
    try {
      const q = new URLSearchParams({ device, from, to });
      const r = await fetch(`/api/mainapp/logs?${q}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Failed to load"); setData(null); return; }
      setData(j);
    } catch { setErr("Network error"); setData(null); }
    finally { setLoading(false); }
  }
  useEffect(() => { if (device) load(); /* eslint-disable-next-line */ }, [device, from, to]);

  async function toggleDay(day) {
    const willOpen = !open[day];
    setOpen((o) => ({ ...o, [day]: willOpen }));
    if (willOpen && !detail[day]) {
      setDetail((s) => ({ ...s, [day]: { loading: true, beats: [] } }));
      try {
        const q = new URLSearchParams({ device, date: day });
        const r = await fetch(`/api/mainapp/logs?${q}`, { cache: "no-store" });
        const j = await r.json();
        setDetail((s) => ({ ...s, [day]: { loading: false, beats: j.beats || [], err: r.ok ? "" : (j.error || "Failed") } }));
      } catch {
        setDetail((s) => ({ ...s, [day]: { loading: false, beats: [], err: "Network error" } }));
      }
    }
  }

  function preset(days) {
    const t = new Date();
    setTo(isoDate(t));
    setFrom(isoDate(new Date(t.getTime() - (days - 1) * 86400000)));
  }

  const days = data?.days || [];
  const dev = data?.device || null;

  // range KPIs
  const kpi = useMemo(() => {
    const beats = days.reduce((a, d) => a + (d.beats || 0), 0);
    const withData = days.length;
    const worst = days.reduce((a, d) => Math.max(a, d.max_gap_s || 0), 0);
    const alarms = days.reduce((a, d) => a + (d.alarm_beats || 0), 0);
    const latest = days[0] || null; // newest first
    const avg = withData ? Math.round(beats / withData) : 0;
    return { beats, withData, worst, alarms, avg, batt: latest?.batt_end ?? null };
  }, [days]);

  const maxBeats = Math.max(1, ...days.map((d) => d.beats || 0));

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Device logs</div>
          <div className={styles.sub}>Heartbeats — each device’s routine reporting. See the state of the device every day, then open a day to analyse its individual reports.</div>
        </div>
      </div>

      {/* controls */}
      <div className={styles.controls}>
        <div className={styles.ctlField}>
          <label className={styles.ctlLab}>Device</label>
          <select className={styles.select} value={device} onChange={(e) => setDevice(e.target.value)}>
            {devices.length === 0 && <option value="">No devices</option>}
            {devices.map((x) => (
              <option key={x.id || x.imei} value={x.device_id || x.imei}>
                {x.device_id || x.imei}{x.site ? ` · ${x.site}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className={styles.ctlField}>
          <label className={styles.ctlLab}>From</label>
          <input className={styles.input} type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className={styles.ctlField}>
          <label className={styles.ctlLab}>To</label>
          <input className={styles.input} type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className={styles.presets}>
          <button onClick={() => preset(7)}>7d</button>
          <button onClick={() => preset(14)}>14d</button>
          <button onClick={() => preset(30)}>30d</button>
        </div>
      </div>

      {/* device summary */}
      {dev && (
        <div className={styles.devBar}>
          <span className={styles.devName}><i className="ti ti-cpu" /> {dev.device_id || dev.imei}</span>
          {dev.site && <span className={styles.devMeta}><i className="ti ti-map-pin" /> {dev.site}{dev.region ? ` · ${dev.region}` : ""}</span>}
          {dev.imei && <span className={styles.devMeta}>IMEI {dev.imei}</span>}
          {dev.status && <span className={`${styles.devStatus} ${styles["st_" + String(dev.status).toLowerCase()] || ""}`}>{dev.status}</span>}
          <span className={styles.devMeta}>Last seen {fmtTime(dev.last_seen)}{dev.last_seen ? " EAT" : ""}</span>
        </div>
      )}

      {/* range KPIs */}
      <div className={styles.kpis}>
        <Kpi n={kpi.beats.toLocaleString()} k="Heartbeats in range" />
        <Kpi n={kpi.withData} k="Days with data" />
        <Kpi n={kpi.avg.toLocaleString()} k="Avg beats / day" />
        <Kpi n={fmtGap(kpi.worst)} k="Worst gap" warn={kpi.worst > 3 * 3600} />
        <Kpi n={kpi.batt != null ? `${kpi.batt}%` : "—"} k="Latest battery" warn={kpi.batt != null && kpi.batt <= 20} />
        <Kpi n={kpi.alarms.toLocaleString()} k="Alarm reports" warn={kpi.alarms > 0} />
      </div>

      {/* beats-per-day mini chart */}
      {days.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardHead}>Heartbeats per day<span className={styles.since}>{fmtDay(from)} → {fmtDay(to)}</span></div>
          <div className={styles.spark}>
            {[...days].reverse().map((d) => {
              const h = dayHealth(d);
              return (
                <div key={d.day} className={styles.sparkCol} title={`${fmtDay(d.day)} · ${d.beats} beats · worst gap ${fmtGap(d.max_gap_s)}`}
                     onClick={() => { setOpen((o) => ({ ...o, [d.day]: true })); toggleDay(d.day); }}>
                  <div className={styles.sparkWrap}>
                    <div className={`${styles.sparkBar} ${styles["hb_" + h.key]}`} style={{ height: `${Math.round(((d.beats || 0) / maxBeats) * 100)}%` }} />
                  </div>
                  <div className={styles.sparkLbl}>{d.day.slice(8)}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* per-day table */}
      <div className={styles.card}>
        <div className={styles.cardHead}>State by day<span className={styles.since}>newest first · click a day to see its heartbeats</span></div>

        {loading && <div className={styles.muted}>Loading…</div>}
        {err && !loading && <div className={styles.err}>{err}</div>}
        {!loading && !err && days.length === 0 && <div className={styles.muted}>No heartbeats for this device in the selected range.</div>}

        {days.map((d) => {
          const h = dayHealth(d);
          const isOpen = !!open[d.day];
          const det = detail[d.day];
          return (
            <div key={d.day} className={styles.dayBlock}>
              <button className={styles.dayRow} onClick={() => toggleDay(d.day)}>
                <span className={styles.dayCell}>
                  <i className={`ti ti-chevron-right ${styles.chev} ${isOpen ? styles.chevOpen : ""}`} />
                  <span className={styles.dayName}>{fmtDay(d.day)}</span>
                </span>
                <span className={`${styles.health} ${styles["hpill_" + h.key]}`}>
                  <span className={styles.hdot} />{h.label}{h.low ? " · low batt" : ""}
                </span>
                <span className={styles.metric}><b>{d.beats.toLocaleString()}</b><em>beats</em></span>
                <span className={styles.metric}><b>{fmtTime(d.first_at)}–{fmtTime(d.last_at)}</b><em>first → last</em></span>
                <span className={styles.metric}><b>{fmtGap(d.max_gap_s)}</b><em>worst gap</em></span>
                <span className={styles.metric}>
                  <span className={styles.cov}><span className={styles.covFill} style={{ width: `${Math.round((d.active_hours / 24) * 100)}%` }} /></span>
                  <em>{d.active_hours}/24 h</em>
                </span>
                <span className={styles.metric}><b>{d.batt_start != null ? `${d.batt_start}%` : "—"} → {d.batt_end != null ? `${d.batt_end}%` : "—"}</b><em>battery{d.batt_min != null ? ` · min ${d.batt_min}%` : ""}</em></span>
                <span className={styles.metric}><b>{d.avg_signal != null ? d.avg_signal : "—"}</b><em>avg signal</em></span>
                <span className={styles.metric}><b className={d.alarm_beats ? styles.alarmN : ""}>{d.alarm_beats}</b><em>alarms</em></span>
              </button>

              {isOpen && (
                <div className={styles.detail}>
                  {det?.loading && <div className={styles.muted}>Loading heartbeats…</div>}
                  {det?.err && <div className={styles.err}>{det.err}</div>}
                  {det && !det.loading && !det.err && (
                    det.beats.length === 0 ? <div className={styles.muted}>No heartbeats.</div> : (
                      <div className={styles.tblWrap}>
                        <table className={styles.tbl}>
                          <thead><tr>
                            {["TIME (EAT)", "GAP", "BATT", "SIG", "FIX", "SPEED", "TEMP", "POSITION", "STATUS", ""].map((x) => <th key={x}>{x}</th>)}
                          </tr></thead>
                          <tbody>
                            {det.beats.map((b, i) => (
                              <tr key={i} className={b.has_alarm ? styles.alarmRow : ""}>
                                <td className={styles.mono}>{fmtTime(b.at)}</td>
                                <td className={styles.mono}>{i === 0 ? "—" : fmtGap(b.gap_s)}</td>
                                <td>{b.battery != null ? `${b.battery}%` : "—"}</td>
                                <td>{b.signal != null ? b.signal : "—"}</td>
                                <td>{b.fix === "A" ? "GPS" : (b.fix === "V" ? "no-fix" : (b.fix || "—"))}</td>
                                <td>{b.speed != null ? `${Math.round(b.speed)} km/h` : "—"}</td>
                                <td>{b.temperature != null ? `${b.temperature}°C` : "—"}</td>
                                <td className={styles.mono}>{b.lat != null && b.lng != null ? `${b.lat.toFixed(5)}, ${b.lng.toFixed(5)}` : "—"}</td>
                                <td className={styles.mono}>{b.motion_byte || "—"}</td>
                                <td>{b.has_alarm ? <span className={styles.alarmTag}>{b.alarms.join(", ") || "alarm"}</span> : ""}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ n, k, warn }) {
  return (
    <div className={`${styles.kpi} ${warn ? styles.kpiWarn : ""}`}>
      <div className={styles.kpiN}>{n}</div>
      <div className={styles.kpiK}>{k}</div>
    </div>
  );
}
