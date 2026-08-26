// app/mainapp/sites/group/components/GroupSites.jsx
// Group sites — categorise, select and run batch operations on sites (prototype
// assetguard_web_group_sites_v3). Column transfers, status changes and delete
// hit the real batch API; device/field actions are queued (no backend yet);
// Export CSV downloads the selection.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./groupsites.module.css";
import { siteStatusColor } from "../../../lib/googleMaps.js";
import { useFacets } from "../../../lib/useFacets.js";

const STATUSES = ["Live", "Testing", "Maintenance", "SMPMS", "Pending", "Offline", "Inactive"];
// Operators may push only these; Inactive/Offline are derived from the devices.
const SITE_SETTABLE = ["Live", "Testing", "Maintenance"];
const MUTE_UNITS = ["minutes", "hours", "days"];
// Alarm types a manual test can simulate (must match TEST_TYPES in the batch route).
const TEST_ALARM_TYPES = [
  { key: "all", label: "All types (one by one)" },
  { key: "DISTURBANCE", label: "Disturbance" },
  { key: "GEOFENCE_EXIT", label: "Geofence Violation" },
  { key: "CRITICAL_MOTION", label: "Critical Motion" },
  { key: "CRITICAL_LOW_BATTERY", label: "Critical Low Battery" },
  { key: "LOW_BATTERY", label: "Low Battery" },
  { key: "HIGH_TEMPERATURE", label: "High Temperature" },
  { key: "DEVICE_OFFLINE", label: "Device Offline" },
];
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
    { key: "comp", label: "Transfer to another company", icon: "ti-building", tint: "#fef3c7", ink: "#b45309", kind: "company" },
    { key: "clus", label: "Transfer response cluster", icon: "ti-target-arrow", tint: "#ede9fe", ink: "#7c3aed", kind: "transfer", options: CLUSTERS },
  ] },
  { group: "TRANSFERS", items: [
    { key: "secreg", label: "Transfer security region", icon: "ti-shield-half", tint: "#e0f2fe", ink: "#0284c7", kind: "transfer", options: SEC_REGIONS },
    { key: "ven", label: "Transfer SMPMS vendor", icon: "ti-building-factory-2", tint: "#fce7f3", ink: "#db2777", kind: "transfer", options: VENDORS },
    { key: "secu", label: "Transfer security company", icon: "ti-shield-check", tint: "#fee2e2", ink: "#dc2626", kind: "transfer", options: SEC_COMPANIES },
    { key: "noc", label: "Transfer NOC team", icon: "ti-headset", tint: "#e0f2fe", ink: "#0369a1", kind: "transfer", options: MON_COMPANIES },
  ] },
  { group: "MONITORING & ALARMS", items: [
    { key: "status", label: "Change status", icon: "ti-toggle-right", tint: "#d1fae5", ink: "#059669", kind: "status", options: SITE_SETTABLE },
    { key: "arm", label: "Arm monitoring", icon: "ti-lock", tint: "#d1fae5", ink: "#047857", kind: "action" },
    { key: "disarm", label: "Disarm monitoring", icon: "ti-lock-open", tint: "#fef3c7", ink: "#b45309", kind: "action" },
    { key: "mute", label: "Mute alarms", icon: "ti-volume-off", tint: "#f1f5f9", ink: "#64748b", kind: "mute" },
    { key: "testalarm", label: "Send test alarm", icon: "ti-bell-ringing", tint: "#fee2e2", ink: "#dc2626", kind: "testalarm" },
  ] },
  { group: "MAINTENANCE & FIELD", items: [
    { key: "maint", label: "Schedule maintenance window", icon: "ti-tool", tint: "#dbeafe", ink: "#2563eb", kind: "maint" },
    { key: "tech", label: "Request technician visit (Accyss)", icon: "ti-user-check", tint: "#d1fae5", ink: "#059669", kind: "simulate" },
    { key: "sync", label: "Sync device configurations", icon: "ti-refresh", tint: "#ede9fe", ink: "#7c3aed", kind: "action" },
  ] },
  { group: "DATA & DANGER", items: [
    { key: "export", label: "Export selection to CSV", icon: "ti-download", tint: "#d1fae5", ink: "#059669", kind: "export" },
    { key: "pdf", label: "Generate PDF report", icon: "ti-file-text", tint: "#dbeafe", ink: "#2563eb", kind: "pdf" },
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
  const [companies, setCompanies] = useState([]); // client companies, for the transfer picker
  const facets = useFacets();                      // live entity option lists
  const toastTimer = useRef(null);

  // Transfer/company pickers pull from live facets (registry ∪ values in use), so
  // they always have every option in the system. Falls back to any static options.
  function optsFor(def) {
    const m = {
      reg: facets.regions, secreg: facets.securityRegions, clus: facets.clusters,
      ven: facets.vendors, secu: facets.securityCompanies, noc: facets.monitoringCompanies,
      comp: facets.clientCompanies,
    };
    const live = m[def.key];
    return (live && live.length ? live : (def.options || []));
  }

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

  // Client companies for "Transfer to another company".
  useEffect(() => {
    fetch("/api/mainapp/companies", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const names = (Array.isArray(d.companies) ? d.companies : [])
          .filter((c) => !Array.isArray(c.purposes) || c.purposes.includes("Client"))
          .map((c) => c.name).filter(Boolean);
        setCompanies([...new Set(names)].sort());
      })
      .catch(() => {});
  }, []);

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
    if (def.kind === "pdf") { generatePdf(); return; }
    if (def.kind === "delete") { doDelete(); return; }
    if (def.kind === "action") { runAction(def); return; }
    if (def.kind === "mute") { setPanel({ op: def, mute: { amount: 2, unit: "hours" } }); return; }
    if (def.kind === "company") {
      const opts = optsFor(def);
      if (!opts.length) { flash("No client companies found — add one under Companies first", true); return; }
      setPanel({ op: { ...def, options: opts }, value: opts[0] });
      return;
    }
    if (def.kind === "maint") {
      const pad = (n) => String(n).padStart(2, "0");
      const dt = new Date(); const round = new Date(dt.getTime() + 5 * 60000);
      const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
      setPanel({ op: def, maint: { start: fmt(round), end: fmt(new Date(round.getTime() + 2 * 3600000)) } });
      return;
    }
    if (def.kind === "testalarm") { openTestPanel(def); return; }
    if (def.kind === "simulate") {
      flash(`${def.label} queued for ${selCount} site${selCount === 1 ? "" : "s"}`);
      return;
    }
    // transfer → live facet options; status → its static SITE_SETTABLE list
    const opts = def.kind === "status" ? (def.options || []) : optsFor(def);
    setPanel({ op: { ...def, options: opts }, value: opts[0] || "" });
  }

  // Direct (no-value) batch action: arm / disarm / sync.
  async function runAction(def) {
    if (!selCount) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mainapp/sites/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], op: def.key }),
      });
      const d = await res.json();
      setBusy(false);
      if (!res.ok) { flash(d.error || "Operation failed", true); return; }
      flash(`${def.label} — ${d.affected} site${d.affected === 1 ? "" : "s"}`);
      await load();
    } catch { setBusy(false); flash("Network error", true); }
  }

  // Open the Send-test-alarm panel; load device options when exactly one site is selected.
  async function openTestPanel(def) {
    const test = { deviceId: "all", type: "all", devices: [] };
    if (selCount === 1) {
      try {
        const res = await fetch(`/api/mainapp/devices?site_id=${selectedSites[0].id}`, { cache: "no-store" });
        const d = await res.json();
        test.devices = (Array.isArray(d.devices) ? d.devices : []).map((x) => ({ id: x.id, label: x.device_id || x.imei || `#${x.id}` }));
      } catch { /* fall back to All */ }
    }
    setPanel({ op: def, test });
  }

  async function applyPanel() {
    if (!panel) return;
    const { op, value, mute, maint, test } = panel;
    setBusy(true);
    try {
      let payload, summary;
      if (mute) {
        payload = { ids: [...selected], op: op.key, value: { amount: Number(mute.amount) || 0, unit: mute.unit } };
        summary = Number(mute.amount) > 0 ? `Muted for ${mute.amount} ${mute.unit}` : "Unmuted";
      } else if (maint) {
        payload = { ids: [...selected], op: op.key, value: { start: maint.start ? new Date(maint.start).toISOString() : null, end: maint.end ? new Date(maint.end).toISOString() : null } };
        summary = maint.start && maint.end ? "Maintenance window scheduled" : "Maintenance window cleared";
      } else if (test) {
        payload = { ids: [...selected], op: op.key, value: { deviceId: test.deviceId, type: test.type } };
        const tl = TEST_ALARM_TYPES.find((t) => t.key === test.type)?.label || "alarm";
        summary = `Test ${tl}`;
      } else {
        payload = { ids: [...selected], op: op.key, value };
        summary = `${op.label} → ${value}`;
      }
      const res = await fetch("/api/mainapp/sites/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) { flash(d.error || "Operation failed", true); setBusy(false); return; }
      setPanel(null); setBusy(false);
      const unit = test ? "" : ` site${d.affected === 1 ? "" : "s"}`;
      flash(test ? `${summary} — ${d.affected} raised` : `${summary} on ${d.affected}${unit}`);
      await load();
    } catch { flash("Network error", true); setBusy(false); }
  }

  // Build a printable per-site report and open the browser's print dialog (save as PDF).
  async function generatePdf() {
    if (!selCount) return;
    flash("Building report…");
    const esc = (v) => String(v ?? "—").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const blocks = [];
    for (const s of selectedSites) {
      let devs = [];
      try { const r = await fetch(`/api/mainapp/devices?site_id=${s.id}`, { cache: "no-store" }); const d = await r.json(); devs = Array.isArray(d.devices) ? d.devices : []; } catch {}
      const rows = devs.length ? devs.map((x) => {
        const cfg = x.config || {};
        const batt = cfg.battery_percent != null ? `${cfg.battery_percent}%` : "—";
        const seen = x.last_seen ? new Date(x.last_seen).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }) + " EAT" : "—";
        return `<tr><td>${esc(x.device_id || x.imei)}</td><td>${esc(x.status || "—")}</td><td>${esc(batt)}</td><td>${esc(seen)}</td></tr>`;
      }).join("") : `<tr><td colspan="4" style="color:#94a3b8">No devices</td></tr>`;
      blocks.push(`
        <section style="margin:0 0 22px;page-break-inside:avoid">
          <h2 style="margin:0 0 2px;font-size:16px">${esc(s.name)} <span style="color:#64748b;font-weight:600">${esc(s.code)}</span></h2>
          <div style="color:#64748b;font-size:12px;margin-bottom:8px">${esc(s.region)} · ${esc(s.county)} · Status: <b>${esc(s.status)}</b>${s.armed === false ? " · <b style='color:#b45309'>Disarmed</b>" : ""}${s.muted ? " · <b>Muted</b>" : ""}</div>
          <table style="width:100%;border-collapse:collapse;font-size:12px">
            <thead><tr style="background:#f1f5f9;text-align:left"><th style="padding:6px">Device</th><th style="padding:6px">Status</th><th style="padding:6px">Battery</th><th style="padding:6px">Last seen</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </section>`);
    }
    const when = new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }) + " EAT";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>AssetGuard — Sites report</title>
      <style>body{font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#0f274a;margin:28px}td,th{border-bottom:1px solid #e2e8f0}h1{font-size:20px;margin:0 0 4px}</style></head>
      <body><h1>AssetGuard — Sites report</h1><div style="color:#64748b;font-size:12px;margin-bottom:20px">${selCount} site${selCount === 1 ? "" : "s"} · generated ${when}</div>${blocks.join("")}
      <script>window.onload=function(){setTimeout(function(){window.print();},250);}</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { flash("Allow pop-ups to generate the report", true); return; }
    w.document.open(); w.document.write(html); w.document.close();
    flash(`Report ready for ${selCount} site${selCount === 1 ? "" : "s"} — save as PDF from the print dialog`);
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
                    <td>
                      <span className={styles.pill} style={pillStyle(s.status)}>{s.status || "Pending"}</span>
                      {s.armed === false && (
                        <span className={styles.pill} style={{ background: "#fef3c7", color: "#b45309", marginLeft: 5 }} title="Monitoring disarmed">
                          <i className="ti ti-lock-open" /> Disarmed
                        </span>
                      )}
                      {s.muted && (
                        <span className={styles.pill} style={{ background: "#f1f5f9", color: "#64748b", marginLeft: 5 }} title="Alarms muted (downgraded to Low)">
                          <i className="ti ti-volume-off" /> Muted
                        </span>
                      )}
                    </td>
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
            {panel.maint ? (
              <>
                <label className={styles.lab}>MAINTENANCE WINDOW (EAT)</label>
                <div style={{ display: "flex", gap: 8, flexDirection: "column" }}>
                  <div>
                    <div className={styles.panelSub} style={{ marginBottom: 2 }}>Start</div>
                    <input type="datetime-local" className={styles.panelSelect} value={panel.maint.start}
                      onChange={(e) => setPanel((p) => ({ ...p, maint: { ...p.maint, start: e.target.value } }))} />
                  </div>
                  <div>
                    <div className={styles.panelSub} style={{ marginBottom: 2 }}>End</div>
                    <input type="datetime-local" className={styles.panelSelect} value={panel.maint.end}
                      onChange={(e) => setPanel((p) => ({ ...p, maint: { ...p.maint, end: e.target.value } }))} />
                  </div>
                </div>
                <div className={styles.panelSub} style={{ marginTop: 8 }}>
                  The site enters Maintenance for this window (its alarms become test alarms) and returns to normal after it ends. Clear both to cancel.
                </div>
              </>
            ) : panel.test ? (
              <>
                <label className={styles.lab}>DEVICE</label>
                {panel.test.devices.length ? (
                  <select className={styles.panelSelect} value={panel.test.deviceId}
                    onChange={(e) => setPanel((p) => ({ ...p, test: { ...p.test, deviceId: e.target.value } }))}>
                    <option value="all">All devices at this site</option>
                    {panel.test.devices.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
                  </select>
                ) : (
                  <div className={styles.panelSub}>All devices at the {selCount} selected site{selCount === 1 ? "" : "s"} (select a single site to target one device).</div>
                )}
                <label className={styles.lab} style={{ marginTop: 10 }}>ALARM TYPE</label>
                <select className={styles.panelSelect} value={panel.test.type}
                  onChange={(e) => setPanel((p) => ({ ...p, test: { ...p.test, type: e.target.value } }))}>
                  {TEST_ALARM_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
                </select>
                <div className={styles.panelSub} style={{ marginTop: 8 }}>
                  Test alarms are logged as “… – test” at Low severity and go only to the NOC + field technicians.
                </div>
              </>
            ) : panel.mute ? (
              <>
                <label className={styles.lab}>MUTE DURATION</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    type="number" min={0} className={styles.panelSelect} style={{ flex: "0 0 90px" }}
                    value={panel.mute.amount}
                    onChange={(e) => setPanel((p) => ({ ...p, mute: { ...p.mute, amount: e.target.value } }))}
                  />
                  <select
                    className={styles.panelSelect} style={{ flex: 1 }}
                    value={panel.mute.unit}
                    onChange={(e) => setPanel((p) => ({ ...p, mute: { ...p.mute, unit: e.target.value } }))}
                  >
                    {MUTE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className={styles.panelSub} style={{ marginTop: 8 }}>
                  While muted, this site's alarms are downgraded to Low (recorded, no critical paging). Set 0 to unmute.
                </div>
              </>
            ) : (
              <>
                <label className={styles.lab}>NEW VALUE</label>
                <select className={styles.panelSelect} value={panel.value} onChange={(e) => setPanel((p) => ({ ...p, value: e.target.value }))}>
                  {(panel.op.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </>
            )}
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
