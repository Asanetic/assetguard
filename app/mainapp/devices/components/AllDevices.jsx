// app/mainapp/devices/components/AllDevices.jsx
// The "All devices" listing — a faithful port of the prototype
// (assetguard_web_all_trackers_v3): header + Import/Add, dominant search with
// All sites / All statuses / All orientations filters, and a sticky-header table
// (Device ID · Site · IMEI · Battery · Data left · Last seen · Status · Actions)
// with per-row View + Track. Data is live from /api/mainapp/devices.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./devices.module.css";
import ImportDevices from "./ImportDevices.jsx";

const STATUSES = ["Live", "Offline", "Testing", "Inactive", "Maintenance"];
const ORIENTATIONS = ["Vertical", "Horizontal"];
const ST_COLOR = { live: "#10B981", offline: "#EF4444", testing: "#F59E0B", inactive: "#8B5CF6", maintenance: "#0EA5E9" };

function statusColor(s) { return ST_COLOR[String(s || "").toLowerCase()] || "#64748B"; }
function battColor(b) { return Number(b) < 20 ? "#DC2626" : "#059669"; }

function relTime(v) {
  if (!v) return "—";
  const t = new Date(v).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const dd = Math.round(h / 24); return `${dd} day${dd > 1 ? "s" : ""} ago`;
}

function StatusPill({ status }) {
  const c = statusColor(status);
  return (
    <span className={styles.pill} style={{ background: c + "1A", color: c }}>
      <span className={styles.dot} style={{ background: c }} />{status || "—"}
    </span>
  );
}

export default function AllDevices() {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [site, setSite] = useState("");
  const [status, setStatus] = useState("");
  const [orientation, setOrientation] = useState("");
  const [showImport, setShowImport] = useState(false);
  const [toast, setToast] = useState("");
  const addRef = useRef(null);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/mainapp/devices", { cache: "no-store" });
      const d = r.ok ? await r.json() : { devices: [] };
      setDevices(Array.isArray(d.devices) ? d.devices : []);
    } catch { setDevices([]); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  // distinct sites present, for the "All sites" dropdown
  const siteOptions = useMemo(() => {
    const seen = new Map();
    devices.forEach((d) => { if (d.site_code && !seen.has(d.site_code)) seen.set(d.site_code, d.site || d.site_code); });
    return Array.from(seen, ([code, name]) => ({ code, name }));
  }, [devices]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return devices.filter((d) => {
      if (site && d.site_code !== site) return false;
      if (status && String(d.status) !== status) return false;
      if (orientation && String(d.orientation) !== orientation) return false;
      if (!term) return true;
      return (`${d.device_id} ${d.imei || ""} ${d.site || ""} ${d.site_code || ""}`).toLowerCase().includes(term);
    });
  }, [devices, q, site, status, orientation]);

  const activeSites = useMemo(() => new Set(devices.map((d) => d.site_code).filter(Boolean)).size, [devices]);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.head}>
        <div>
          <div className={styles.title}>All devices</div>
          <div className={styles.sub}>{devices.length} device{devices.length === 1 ? "" : "s"} across {activeSites} active site{activeSites === 1 ? "" : "s"}</div>
        </div>
        <div className={styles.headActions}>
          <button className={styles.importBtn} onClick={() => setShowImport(true)}>
            <i className="ti ti-file-import" aria-hidden="true" />Import devices
          </button>
          <button className={styles.addBtn} onClick={() => { window.location.href = "/mainapp/devices/add"; }}>
            <i className="ti ti-plus" aria-hidden="true" />Add device
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <i className={`ti ti-search ${styles.searchIcon}`} aria-hidden="true" />
          <input className={styles.search} type="text" placeholder="Search devices..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={styles.select} value={site} onChange={(e) => setSite(e.target.value)}>
          <option value="">All sites</option>
          {siteOptions.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
        </select>
        <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className={styles.select} value={orientation} onChange={(e) => setOrientation(e.target.value)}>
          <option value="">All orientations</option>
          {ORIENTATIONS.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Device ID</th><th>Site</th><th>IMEI</th><th>Battery</th>
                <th>Data left</th><th>Last seen</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>
                    <div className={styles.siteName}>{d.device_id}</div>
                    <div className={styles.ori}><span className={styles.oriTag}>{String(d.orientation || "").charAt(0).toUpperCase() || "—"}</span>{d.orientation || "—"}</div>
                  </td>
                  <td>
                    <div>{d.site || "—"}</div>
                    <div className={styles.siteCode}>{d.site_code || "—"}</div>
                  </td>
                  <td className={styles.imei}>{d.imei}</td>
                  <td className={styles.batt} style={{ color: battColor(d.battery) }}>{d.battery != null ? `${d.battery}%` : "—"}</td>
                  <td className={styles.data}>{d.data_left || "—"}</td>
                  <td className={styles.seen}>{relTime(d.last_seen)}</td>
                  <td><StatusPill status={d.status} /></td>
                  <td style={{ textAlign: "right" }}>
                    <div className={styles.actions}>
                      <button className={styles.viewBtn} onClick={() => { window.location.href = `/mainapp/devices/view?device=${encodeURIComponent(d.device_id)}`; }}>View</button>
                      <button className={styles.trackBtn} onClick={() => { window.location.href = `/mainapp/track?device=${encodeURIComponent(d.device_id)}`; }}>Track</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && filtered.length === 0 && <div className={styles.empty}>No devices match your filters</div>}
        {loading && <div className={styles.empty}>Loading devices…</div>}
      </div>

      {showImport && (
        <ImportDevices onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); load(); }} />
      )}
      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
