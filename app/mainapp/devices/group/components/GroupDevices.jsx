// app/mainapp/devices/group/components/GroupDevices.jsx
// Group devices — categorise, select and run batch operations on devices
// (prototype assetguard_web_group_devices_v5). Change status, reassign site,
// update firmware and decommission hit the real batch API; assignment /
// monitoring / field actions are queued (toast); Export CSV downloads the
// selection.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./groupdevices.module.css";
import { deviceStatusColor } from "../../../lib/googleMaps.js";

const STATUSES = ["Live", "Offline", "Testing", "Inactive", "Maintenance"];
const CATEGORIES = [["site", "Site"], ["region", "Region"], ["st", "Status"], ["bat", "Battery level"], ["fw", "Firmware version"]];
const CAT_LABEL = { site: "SITE", region: "REGION", st: "STATUS", bat: "BATTERY LEVEL", fw: "FIRMWARE VERSION" };
const ALL_LABEL = { site: "All sites", region: "All regions", st: "All statuses", bat: "All battery levels", fw: "All firmware versions" };
const DATA_PLANS = ["1GB monthly", "2GB monthly", "5GB monthly", "10GB monthly"];
const SIM_PROVIDERS = ["Safaricom", "Airtel", "Telkom"];
const INTERVALS = ["30 seconds", "1 minute", "5 minutes", "15 minutes", "1 hour"];
const MOTION = Array.from({ length: 100 }, (_, i) => String(i + 1));
const FIRMWARES = ["v2.4.1", "v2.3.8", "v2.2.5"];

// "All operations" — grouped exactly like the prototype.
const OP_GROUPS = [
  { group: "ASSIGNMENTS", items: [
    { key: "dbp", label: "Assign data bundle plan", icon: "ti-antenna-bars-5", tint: "#e0f2fe", ink: "#0284c7", kind: "pick", options: DATA_PLANS },
    { key: "simp", label: "Assign SIM provider", icon: "ti-sim", tint: "#fce7f3", ink: "#be185d", kind: "pick", options: SIM_PROVIDERS },
  ] },
  { group: "MONITORING & ALERTS", items: [
    { key: "status", label: "Change status", icon: "ti-toggle-right", tint: "#d1fae5", ink: "#047857", kind: "status", options: STATUSES },
    { key: "mot", label: "Set motion sensitivity (1–100)", icon: "ti-adjustments", tint: "#ede9fe", ink: "#7c3aed", kind: "pick", options: MOTION },
    { key: "int", label: "Set upload interval", icon: "ti-clock", tint: "#e0f2fe", ink: "#0284c7", kind: "pick", options: INTERVALS },
    { key: "arm", label: "Arm monitoring", icon: "ti-lock", tint: "#d1fae5", ink: "#047857", kind: "simulate" },
    { key: "dis", label: "Disarm monitoring", icon: "ti-lock-open", tint: "#fef3c7", ink: "#b45309", kind: "simulate" },
    { key: "mute", label: "Mute alerts for 2 hours", icon: "ti-bell-off", tint: "#f1f5f9", ink: "#475569", kind: "simulate" },
    { key: "ping", label: "Send test ping", icon: "ti-antenna-bars-5", tint: "#fee2e2", ink: "#dc2626", kind: "simulate" },
  ] },
  { group: "MAINTENANCE & FIELD", items: [
    { key: "resite", label: "Reassign to another site", icon: "ti-arrows-exchange", tint: "#dbe7fe", ink: "#2e6cf5", kind: "resite" },
    { key: "fw", label: "Update firmware", icon: "ti-refresh", tint: "#dbe7fe", ink: "#2e6cf5", kind: "firmware", options: FIRMWARES },
    { key: "sync", label: "Sync device configuration", icon: "ti-settings", tint: "#ede9fe", ink: "#7c3aed", kind: "simulate" },
    { key: "svc", label: "Schedule service visit", icon: "ti-tool", tint: "#e0f2fe", ink: "#0284c7", kind: "simulate" },
    { key: "simr", label: "Flag SIM for replacement", icon: "ti-sim", tint: "#fef3c7", ink: "#b45309", kind: "simulate" },
  ] },
  { group: "DATA & DANGER", items: [
    { key: "csv", label: "Export selection to CSV", icon: "ti-download", tint: "#d1fae5", ink: "#047857", kind: "export" },
    { key: "pdf", label: "Generate PDF report", icon: "ti-file-text", tint: "#dbe7fe", ink: "#2e6cf5", kind: "simulate" },
    { key: "del", label: "Decommission selected", icon: "ti-trash", tint: "#fee2e2", ink: "#dc2626", kind: "delete", danger: true },
  ] },
];
const OP_BY_KEY = {};
OP_GROUPS.forEach((g) => g.items.forEach((o) => { OP_BY_KEY[o.key] = o; }));
const OP_COUNT = Object.keys(OP_BY_KEY).length;

function pillStyle(s) { const c = deviceStatusColor(s); return { background: c + "1A", color: c }; }
function battBracket(b) { return Number(b) < 20 ? "Low" : (Number(b) < 60 ? "Medium" : "Good"); }
function battColor(b) { return Number(b) < 20 ? "#DC2626" : "#059669"; }
function csvCell(v) { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

export default function GroupDevices() {
  const [devices, setDevices] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState("site");
  const [val, setVal] = useState("");
  const [selected, setSelected] = useState(() => new Set());
  const [opsOpen, setOpsOpen] = useState(false);
  const [panel, setPanel] = useState(null); // { op, value }
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const toastTimer = useRef(null);

  function flash(msg, bad) {
    setToast({ msg, bad });
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2600);
  }

  async function load() {
    try {
      const [dr, sr] = await Promise.all([
        fetch("/api/mainapp/devices", { cache: "no-store" }),
        fetch("/api/mainapp/sites", { cache: "no-store" }),
      ]);
      const dd = dr.ok ? await dr.json() : { devices: [] };
      const sd = sr.ok ? await sr.json() : { sites: [] };
      setDevices(Array.isArray(dd.devices) ? dd.devices : []);
      setSites(Array.isArray(sd.sites) ? sd.sites : []);
    } catch { /* keep */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function catValue(d) {
    if (cat === "site") return d.site_code || "";
    if (cat === "region") return d.region || "—";
    if (cat === "st") return String(d.status || "");
    if (cat === "bat") return battBracket(d.battery);
    if (cat === "fw") return d.firmware || "—";
    return "";
  }
  const siteName = useMemo(() => {
    const m = {}; devices.forEach((d) => { if (d.site_code) m[d.site_code] = d.site; }); return m;
  }, [devices]);

  const values = useMemo(() => {
    const set = new Set();
    devices.forEach((d) => set.add(catValue(d)));
    return Array.from(set).sort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, cat]);

  const filtered = useMemo(() => devices.filter((d) => !val || catValue(d) === val),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [devices, cat, val]);

  const shownIds = filtered.map((d) => d.id);
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => selected.has(id));

  function toggle(id) { setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleAll() {
    setSelected((prev) => {
      const n = new Set(prev);
      if (allShownSelected) shownIds.forEach((id) => n.delete(id)); else shownIds.forEach((id) => n.add(id));
      return n;
    });
  }
  const selectedDevices = devices.filter((d) => selected.has(d.id));
  const selCount = selectedDevices.length;

  function changeCat(c) { setCat(c); setVal(""); }

  function runOp(op) {
    setOpsOpen(false);
    const def = typeof op === "string" ? OP_BY_KEY[op] : op;
    if (!def || !selCount) return;
    if (def.kind === "export") { exportCsv(); return; }
    if (def.kind === "delete") { doDelete(); return; }
    if (def.kind === "simulate") { flash(`${def.label} queued for ${selCount} device${selCount === 1 ? "" : "s"}`); return; }
    if (def.kind === "resite") { setPanel({ op: def, value: sites[0]?.code || "" }); return; }
    setPanel({ op: def, value: (def.options && def.options[0]) || "" });
  }

  async function applyPanel() {
    if (!panel) return;
    const { op, value } = panel;
    // Only status / firmware / reassign persist; the rest are queued client-side.
    const realOp = op.kind === "status" ? "status" : op.kind === "firmware" ? "fw" : op.kind === "resite" ? "resite" : null;
    if (!realOp) {
      setPanel(null);
      flash(`${op.label} → ${op.key === "resite" ? (siteName[value] || value) : value} on ${selCount} device${selCount === 1 ? "" : "s"}`);
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/mainapp/devices/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], op: realOp, value }),
      });
      const d = await res.json();
      if (!res.ok) { flash(d.error || "Operation failed", true); setBusy(false); return; }
      setPanel(null); setBusy(false);
      const shown = realOp === "resite" ? (siteName[value] || value) : value;
      flash(`${op.label} → ${shown} on ${d.affected} device${d.affected === 1 ? "" : "s"}`);
      await load();
    } catch { flash("Network error", true); setBusy(false); }
  }

  async function doDelete() {
    if (!selCount) return;
    if (typeof window !== "undefined" && !window.confirm(`Decommission ${selCount} selected device${selCount === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mainapp/devices/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], op: "del" }),
      });
      const d = await res.json();
      if (!res.ok) { flash(d.error || "Decommission failed", true); setBusy(false); return; }
      setSelected(new Set()); setBusy(false);
      flash(`Decommissioned ${d.affected} device${d.affected === 1 ? "" : "s"}`);
      await load();
    } catch { flash("Network error", true); setBusy(false); }
  }

  function exportCsv() {
    const header = ["Device ID", "Site", "Site ID", "IMEI", "SIM", "Orientation", "Battery", "Firmware", "Status"];
    const lines = [header.join(",")].concat(selectedDevices.map((d) =>
      [d.device_id, d.site, d.site_code, d.imei, d.sim, d.orientation, d.battery != null ? `${d.battery}%` : "", d.firmware, d.status]
        .map(csvCell).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "assetguard-devices-selection.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    flash(`Exported ${selCount} device${selCount === 1 ? "" : "s"} to CSV`);
  }

  const panelOptions = panel
    ? (panel.op.kind === "resite" ? sites.map((s) => [s.code, `${s.name}`]) : (panel.op.options || []).map((o) => [o, o]))
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Group devices</div>
          <div className={styles.sub}>Categorise, select and run batch operations on devices</div>
        </div>
        <span className={styles.total}>{devices.length} devices total</span>
      </div>

      {/* categorise by */}
      <div className={styles.catRow}>
        <div className={styles.catField}>
          <span className={styles.catLbl}>CATEGORISE BY</span>
          <select className={styles.select} style={{ width: 200 }} value={cat} onChange={(e) => changeCat(e.target.value)}>
            {CATEGORIES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </div>
        <div className={styles.catField}>
          <span className={styles.catLbl}>{CAT_LABEL[cat]}</span>
          <select className={styles.select} style={{ width: 240 }} value={val} onChange={(e) => setVal(e.target.value)}>
            <option value="">{ALL_LABEL[cat]}</option>
            {values.map((v) => <option key={v} value={v}>{cat === "site" ? (siteName[v] || v) : v}</option>)}
          </select>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.selBar}>
          <input type="checkbox" className={styles.chk} checked={allShownSelected} onChange={toggleAll} aria-label="Select all" />
          <span className={styles.selBarLabel}>Select all</span>
          <span className={styles.selBarSub}>{filtered.length} shown</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.chkCell}></th>
                <th>DEVICE</th><th>SITE</th><th>BATTERY</th><th>FIRMWARE</th><th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td className={styles.emptyRow} colSpan={6}>Loading…</td></tr>
                : filtered.length ? filtered.map((d) => (
                  <tr key={d.id} className={selected.has(d.id) ? styles.on : ""}>
                    <td className={styles.chkCell}>
                      <input type="checkbox" className={styles.chk} checked={selected.has(d.id)} onChange={() => toggle(d.id)} />
                    </td>
                    <td>
                      <span className={styles.siteName}>{d.device_id}</span>
                      <span className={styles.oriTag}>{String(d.orientation || "").charAt(0).toUpperCase() || "—"}</span>
                    </td>
                    <td>{d.site || "—"}</td>
                    <td className={styles.batt} style={{ color: battColor(d.battery) }}>{d.battery != null ? `${d.battery}%` : "—"}</td>
                    <td className={styles.fw}>{d.firmware || "—"}</td>
                    <td><span className={styles.pill} style={pillStyle(d.status)}>{d.status}</span></td>
                  </tr>
                )) : <tr><td className={styles.emptyRow} colSpan={6}>No devices in this category</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* bottom action bar */}
      {selCount > 0 && (
        <div className={styles.bar}>
          <span className={styles.barCount}>{selCount} selected</span>
          <button className={styles.barBtn} onClick={() => runOp("resite")}><i className="ti ti-arrows-exchange" />Reassign site</button>
          <button className={styles.barBtn} onClick={() => runOp("status")}><i className="ti ti-toggle-right" />Change status</button>
          <button className={styles.barBtn} onClick={() => runOp("fw")}><i className="ti ti-refresh" />Update firmware</button>
          <button className={`${styles.barBtn} ${styles.barMore}`} onClick={() => setOpsOpen(true)}><i className="ti ti-layout-grid" />All operations ({OP_COUNT})</button>
          <span className={styles.barSpacer} />
          <button className={`${styles.barBtn} ${styles.barDanger}`} onClick={doDelete}><i className="ti ti-trash" />Decommission</button>
        </div>
      )}

      {/* All operations popup */}
      {opsOpen && (
        <>
          <div className={styles.scrim} onClick={() => setOpsOpen(false)} />
          <div className={styles.popup} style={{ right: 18, bottom: 66 }}>
            <div className={styles.popHead}>
              <span className={styles.popTitle}>All operations</span>
              <span className={styles.popApplies}>applies to {selCount} selected</span>
              <button className={styles.popX} onClick={() => setOpsOpen(false)}><i className="ti ti-x" /></button>
            </div>
            <div className={styles.popBody}>
              {OP_GROUPS.map((g) => (
                <div key={g.group}>
                  <div className={styles.opGroup}>{g.group}</div>
                  <div className={styles.opGrid}>
                    {g.items.map((o) => (
                      <button key={o.key} className={`${styles.op} ${o.danger ? styles.opDanger : ""} ${g.items.length % 2 === 1 && o === g.items[g.items.length - 1] ? styles.opWide : ""}`} onClick={() => runOp(o)}>
                        <span className={styles.opIcon} style={{ background: o.tint, color: o.ink }}><i className={`ti ${o.icon}`} /></span>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* value picker */}
      {panel && (
        <div className={styles.panelScrim} onClick={(e) => { if (e.target === e.currentTarget) setPanel(null); }}>
          <div className={styles.panel}>
            <div className={styles.panelTitle}>{panel.op.label}</div>
            <div className={styles.panelSub}>Applies to {selCount} selected device{selCount === 1 ? "" : "s"}.</div>
            <label className={styles.lab}>{panel.op.kind === "resite" ? "REASSIGN TO" : "NEW VALUE"}</label>
            <select className={styles.panelSelect} value={panel.value} onChange={(e) => setPanel((p) => ({ ...p, value: e.target.value }))}>
              {panelOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <div className={styles.panelActions}>
              <button className={styles.btnGhost} onClick={() => setPanel(null)} disabled={busy}>Cancel</button>
              <button className={styles.btnPrimary} onClick={applyPanel} disabled={busy}>{busy ? "Applying…" : `Apply to ${selCount}`}</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`${styles.toast} ${toast.bad ? styles.toastBad : ""}`}>{toast.msg}</div>}
    </div>
  );
}
