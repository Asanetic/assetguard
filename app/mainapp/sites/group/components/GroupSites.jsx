// app/mainapp/sites/group/components/GroupSites.jsx
// Group sites — categorise, select and run batch operations on sites (prototype
// assetguard_web_group_sites_v3). Column transfers, status changes and delete
// hit the real batch API; device/field actions are queued (no backend yet);
// Export CSV downloads the selection.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./groupsites.module.css";
import { siteStatusColor } from "../../../lib/googleMaps.js";

const STATUSES = ["Live", "Testing", "Maintenance", "SMPMS", "Pending", "Offline", "Inactive"];
const DIST_REGIONS = ["Nairobi Metro", "Central", "Coast", "Rift Valley", "Western", "Eastern", "North Eastern", "Nyanza"];
const SEC_REGIONS = ["Nairobi North", "Nairobi South", "Coast", "Rift Valley", "Western", "Upper Eastern", "North Eastern"];
const CLUSTERS = ["Cluster A — Nairobi North", "Cluster B — Nairobi South", "Cluster C — Coast", "Cluster D — Rift", "Cluster E — Western", "Cluster F — Eastern", "Cluster G — North Eastern"];
const VENDORS = ["SMPMS East Africa", "SMPMS Coast Ltd", "SMPMS Rift Ltd", "SMPMS Nairobi"];
const SEC_COMPANIES = ["Falcon Guard Ltd", "Shield Response Co.", "Simba Security Group"];
const MON_COMPANIES = ["Sentinel Monitoring Ltd", "Watchtower Control Services", "Rift Control Centre"];

// Operation catalogue — grouped exactly like the prototype's "All operations".
const OP_GROUPS = [
  { group: "ORGANISE", items: [
    { key: "reg", label: "Transfer region", icon: "ti-arrows-exchange", tint: "#dbeafe", ink: "#2563eb", kind: "transfer", options: DIST_REGIONS },
    { key: "comp", label: "Transfer to another company", icon: "ti-building", tint: "#fef3c7", ink: "#b45309", kind: "simulate" },
    { key: "clus", label: "Transfer response cluster", icon: "ti-target-arrow", tint: "#ede9fe", ink: "#7c3aed", kind: "transfer", options: CLUSTERS },
  ] },
  { group: "TRANSFERS", items: [
    { key: "secreg", label: "Transfer security region", icon: "ti-shield-half", tint: "#e0f2fe", ink: "#0284c7", kind: "transfer", options: SEC_REGIONS },
    { key: "ven", label: "Transfer SMPMS vendor", icon: "ti-building-factory-2", tint: "#fce7f3", ink: "#db2777", kind: "transfer", options: VENDORS },
    { key: "secu", label: "Transfer security company", icon: "ti-shield-check", tint: "#fee2e2", ink: "#dc2626", kind: "transfer", options: SEC_COMPANIES },
    { key: "noc", label: "Transfer NOC team", icon: "ti-headset", tint: "#e0f2fe", ink: "#0369a1", kind: "transfer", options: MON_COMPANIES },
  ] },
  { group: "MONITORING & ALARMS", items: [
    { key: "status", label: "Change status", icon: "ti-toggle-right", tint: "#d1fae5", ink: "#059669", kind: "status", options: STATUSES },
    { key: "arm", label: "Arm monitoring", icon: "ti-lock", tint: "#d1fae5", ink: "#047857", kind: "simulate" },
    { key: "disarm", label: "Disarm monitoring", icon: "ti-lock-open", tint: "#fef3c7", ink: "#b45309", kind: "simulate" },
    { key: "mute", label: "Mute alarms for 2 hours", icon: "ti-volume-off", tint: "#f1f5f9", ink: "#64748b", kind: "simulate" },
    { key: "testalarm", label: "Send test alarm", icon: "ti-bell-ringing", tint: "#fee2e2", ink: "#dc2626", kind: "simulate" },
  ] },
  { group: "MAINTENANCE & FIELD", items: [
    { key: "maint", label: "Schedule maintenance window", icon: "ti-tool", tint: "#dbeafe", ink: "#2563eb", kind: "simulate" },
    { key: "tech", label: "Request technician visit (Accyss)", icon: "ti-user-check", tint: "#d1fae5", ink: "#059669", kind: "simulate" },
    { key: "sync", label: "Sync device configurations", icon: "ti-refresh", tint: "#ede9fe", ink: "#7c3aed", kind: "simulate" },
  ] },
  { group: "DATA & DANGER", items: [
    { key: "export", label: "Export selection to CSV", icon: "ti-download", tint: "#d1fae5", ink: "#059669", kind: "export" },
    { key: "pdf", label: "Generate PDF report", icon: "ti-file-text", tint: "#dbeafe", ink: "#2563eb", kind: "simulate" },
    { key: "delete", label: "Delete selected sites", icon: "ti-trash", tint: "#fee2e2", ink: "#dc2626", kind: "delete", danger: true },
  ] },
];
const OP_BY_KEY = {};
OP_GROUPS.forEach((g) => g.items.forEach((o) => { OP_BY_KEY[o.key] = o; }));
const OP_COUNT = Object.keys(OP_BY_KEY).length;

function pillStyle(s) { const c = siteStatusColor(s); return { background: c + "22", color: c }; }
function csvCell(v) { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; }

export default function GroupSites() {
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
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
      const res = await fetch("/api/mainapp/sites", { cache: "no-store" });
      const data = await res.json();
      setSites(Array.isArray(data.sites) ? data.sites : []);
    } catch { /* keep */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const regions = useMemo(() => {
    const s = new Set();
    sites.forEach((x) => { if (x.region) s.add(x.region); });
    return Array.from(s).sort();
  }, [sites]);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sites.filter((s) => {
      if (regionFilter !== "all" && s.region !== regionFilter) return false;
      if (statusFilter !== "all" && String(s.status || "Pending") !== statusFilter) return false;
      if (!term) return true;
      return (`${s.name} ${s.code} ${s.county || ""} ${s.region || ""} ${s.security_region || ""} ${s.response_cluster || ""}`).toLowerCase().includes(term);
    });
  }, [sites, q, regionFilter, statusFilter]);

  const shownIds = filtered.map((s) => s.id);
  const allShownSelected = shownIds.length > 0 && shownIds.every((id) => selected.has(id));

  function toggle(id) {
    setSelected((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }
  function toggleAll() {
    setSelected((prev) => {
      const n = new Set(prev);
      if (allShownSelected) shownIds.forEach((id) => n.delete(id));
      else shownIds.forEach((id) => n.add(id));
      return n;
    });
  }
  const selectedSites = sites.filter((s) => selected.has(s.id));
  const selCount = selectedSites.length;

  // ---- run an operation ----
  function runOp(op) {
    setOpsOpen(false);
    const def = typeof op === "string" ? OP_BY_KEY[op] : op;
    if (!def || !selCount) return;
    if (def.kind === "export") { exportCsv(); return; }
    if (def.kind === "delete") { doDelete(); return; }
    if (def.kind === "simulate") {
      flash(`${def.label} queued for ${selCount} site${selCount === 1 ? "" : "s"}`);
      return;
    }
    // transfer / status → open the value picker
    setPanel({ op: def, value: (def.options && def.options[0]) || "" });
  }

  async function applyPanel() {
    if (!panel) return;
    const { op, value } = panel;
    setBusy(true);
    try {
      const res = await fetch("/api/mainapp/sites/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], op: op.key, value }),
      });
      const d = await res.json();
      if (!res.ok) { flash(d.error || "Operation failed", true); setBusy(false); return; }
      setPanel(null); setBusy(false);
      flash(`${op.label} → ${value} on ${d.affected} site${d.affected === 1 ? "" : "s"}`);
      await load();
    } catch { flash("Network error", true); setBusy(false); }
  }

  async function doDelete() {
    if (!selCount) return;
    if (typeof window !== "undefined" && !window.confirm(`Delete ${selCount} selected site${selCount === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mainapp/sites/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], op: "delete" }),
      });
      const d = await res.json();
      if (!res.ok) { flash(d.error || "Delete failed", true); setBusy(false); return; }
      setSelected(new Set()); setBusy(false);
      flash(`Deleted ${d.affected} site${d.affected === 1 ? "" : "s"}`);
      await load();
    } catch { flash("Network error", true); setBusy(false); }
  }

  function exportCsv() {
    const header = ["Site ID", "Name", "County", "Region", "Security Region", "Cluster", "Vendor", "Security Company", "Monitoring Company", "Status"];
    const lines = [header.join(",")].concat(selectedSites.map((s) =>
      [s.code, s.name, s.county, s.region, s.security_region, s.response_cluster, s.smpms_vendor, s.security_company, s.monitoring_company, s.status]
        .map(csvCell).join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "assetguard-sites-selection.csv";
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    flash(`Exported ${selCount} site${selCount === 1 ? "" : "s"} to CSV`);
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Group sites</div>
          <div className={styles.sub}>Categorise, select and run batch operations — admin only</div>
        </div>
        <span className={styles.total}>{sites.length} sites total</span>
      </div>

      <div className={styles.filters}>
        <div className={styles.search}>
          <i className="ti ti-search" />
          <input className={styles.searchInput} placeholder="Search sites..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={styles.select} value={regionFilter} onChange={(e) => setRegionFilter(e.target.value)}>
          <option value="all">All regions</option>
          {regions.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className={styles.select} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className={styles.card}>
        <div className={styles.selBar}>
          <input type="checkbox" className={styles.chk} checked={allShownSelected} onChange={toggleAll} aria-label="Select all" />
          <span className={styles.selBarLabel}>Select all</span>
          <span className={styles.selBarSub}>{filtered.length} sites shown</span>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.chkCell}></th>
                {["SITE", "COUNTY", "REGION", "SECURITY REGION", "CLUSTER", "VENDOR", "SECURITY CO", "STATUS"].map((h) => <th key={h}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td className={styles.emptyRow} colSpan={9}>Loading…</td></tr>
                : filtered.length ? filtered.map((s) => (
                  <tr key={s.id} className={selected.has(s.id) ? styles.on : ""}>
                    <td className={styles.chkCell}>
                      <input type="checkbox" className={styles.chk} checked={selected.has(s.id)} onChange={() => toggle(s.id)} />
                    </td>
                    <td><span className={styles.siteName}>{s.name}</span><span className={styles.siteCode}>{s.code}</span></td>
                    <td>{s.county || "—"}</td>
                    <td>{s.region || "—"}</td>
                    <td>{s.security_region || "—"}</td>
                    <td>{s.response_cluster || "—"}</td>
                    <td>{s.smpms_vendor || "—"}</td>
                    <td>{s.security_company || "—"}</td>
                    <td><span className={styles.pill} style={pillStyle(s.status)}>{s.status || "Pending"}</span></td>
                  </tr>
                )) : <tr><td className={styles.emptyRow} colSpan={9}>No sites match.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* bottom action bar */}
      {selCount > 0 && (
        <div className={styles.bar}>
          <span className={styles.barCount}>{selCount} selected</span>
          <button className={styles.barBtn} onClick={() => runOp("reg")}><i className="ti ti-arrows-exchange" />Transfer region</button>
          <button className={styles.barBtn} onClick={() => runOp("status")}><i className="ti ti-toggle-right" />Change status</button>
          <button className={styles.barBtn} onClick={exportCsv}><i className="ti ti-download" />Export CSV</button>
          <button className={`${styles.barBtn} ${styles.barMore}`} onClick={() => setOpsOpen(true)}><i className="ti ti-apps" />All operations ({OP_COUNT})</button>
          <span className={styles.barSpacer} />
          <button className={`${styles.barBtn} ${styles.barDanger}`} onClick={doDelete}><i className="ti ti-trash" />Delete</button>
        </div>
      )}

      {/* All operations popup */}
      {opsOpen && (
        <>
          <div className={styles.scrim} onClick={() => setOpsOpen(false)} />
          <div className={styles.popup} style={{ right: 18, bottom: 66 }}>
            <div className={styles.popHead}>
              <span className={styles.popTitle}>All operations</span>
              <span className={styles.popApplies}>applies to {selCount} selected site{selCount === 1 ? "" : "s"}</span>
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
            <div className={styles.panelSub}>Applies to {selCount} selected site{selCount === 1 ? "" : "s"}.</div>
            <label className={styles.lab}>NEW VALUE</label>
            <select className={styles.panelSelect} value={panel.value} onChange={(e) => setPanel((p) => ({ ...p, value: e.target.value }))}>
              {(panel.op.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
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
