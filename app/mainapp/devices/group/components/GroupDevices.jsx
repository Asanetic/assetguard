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
import { useFacets } from "../../../lib/useFacets.js";

const STATUSES = ["Live", "Offline", "Testing", "Inactive", "Maintenance"];
const MUTE_UNITS = ["minutes", "hours", "days"];
const CATEGORIES = [["site", "Site"], ["region", "Region"], ["st", "Status"], ["bat", "Battery level"], ["fw", "Firmware version"]];
const CAT_LABEL = { site: "SITE", region: "REGION", st: "STATUS", bat: "BATTERY LEVEL", fw: "FIRMWARE VERSION" };
const ALL_LABEL = { site: "All sites", region: "All regions", st: "All statuses", bat: "All battery levels", fw: "All firmware versions" };
const DATA_PLANS = ["1GB monthly", "2GB monthly", "5GB monthly", "10GB monthly"];
const SIM_PROVIDERS = ["Safaricom", "Airtel", "Telkom"];
const INTERVALS = ["30 seconds", "1 minute", "5 minutes", "15 minutes", "1 hour"];
// Reporting cadence (GL-28 `update,N`): 3–60 seconds. Value = seconds, label = human.
const UPLOAD_SECS = [["3", "3 seconds"], ["5", "5 seconds"], ["10", "10 seconds"], ["15", "15 seconds"], ["20", "20 seconds"], ["30", "30 seconds"], ["45", "45 seconds"], ["60", "60 seconds (1 min)"]];
// GS sensitivity: 1..50 only. Lower value = MORE sensitive. Show the hint in the label.
const MOTION = Array.from({ length: 50 }, (_, i) => { const n = i + 1; return [String(n), `${n}${n === 1 ? " (most sensitive)" : n === 50 ? " (least sensitive)" : ""}`]; });
const UPT_MINS = [["6", "6 min"], ["10", "10 min"], ["15", "15 min"], ["30", "30 min"], ["60", "1 hour"], ["120", "2 hours"], ["360", "6 hours"], ["720", "12 hours"], ["1440", "24 hours (default)"]];
const FIRMWARES = ["v2.4.1", "v2.3.8", "v2.2.5"];

// Queue status → rollout STAGE (label + colour + which stat bucket + which pill).
//   pending/paused -> pending wake-up · sent -> downloading · acked -> applying
//   confirmed -> confirmed · failed -> failed
const STAGE = {
  pending:   { row: "Pending — waiting for wake-up", dot: "#9ca3af", group: "pending",     color: "#6b7280", filter: "pending" },
  paused:    { row: "Paused",                        dot: "#9ca3af", group: "pending",     color: "#6b7280", filter: "pending" },
  sent:      { row: "Downloading…",                  dot: "#0284c7", group: "downloading", color: "#0284c7", filter: "downloading" },
  acked:     { row: "Applying…",                     dot: "#d97706", group: "applying",    color: "#d97706", filter: "downloading" },
  confirmed: { row: "Confirmed",                     dot: "#059669", group: "confirmed",   color: "#059669", filter: "confirmed" },
  failed:    { row: "Failed",                        dot: "#dc2626", group: "failed",      color: "#dc2626", filter: "failed" },
  canceled:  { row: "Canceled",                      dot: "#9ca3af", group: "canceled",    color: "#9ca3af", filter: "pending" },
};
function stageOf(s) { return STAGE[s] || STAGE.pending; }
const ROLLOUT_PILLS = [["all", "All"], ["pending", "Pending"], ["downloading", "Downloading"], ["confirmed", "Confirmed"], ["failed", "Failed"]];

// Generic status badge for the full command-queue table.
const QSTAT = {
  pending:   { l: "Pending",   c: "#6b7280", b: "#f1f5f9" },
  sent:      { l: "Sent",      c: "#0284c7", b: "#e0f2fe" },
  acked:     { l: "Applying",  c: "#b45309", b: "#fef3c7" },
  confirmed: { l: "Confirmed", c: "#047857", b: "#d1fae5" },
  failed:    { l: "Failed",    c: "#dc2626", b: "#fee2e2" },
  paused:    { l: "Paused",    c: "#475569", b: "#e2e8f0" },
  canceled:  { l: "Canceled",  c: "#94a3b8", b: "#f1f5f9" },
};
function qstat(s) { return QSTAT[s] || { l: s || "—", c: "#6b7280", b: "#f1f5f9" }; }
function ago(t) {
  if (!t) return "—";
  const s = (Date.now() - new Date(t).getTime()) / 1000;
  if (s < 60) return `${Math.max(0, Math.floor(s))}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

// "All operations" — grouped exactly like the prototype.
const OP_GROUPS = [
  { group: "ASSIGNMENTS", items: [
    { key: "dbp", label: "Assign data bundle plan", icon: "ti-antenna-bars-5", tint: "#e0f2fe", ink: "#0284c7", kind: "databundle" },
    { key: "simp", label: "Assign SIM provider", icon: "ti-device-sim", tint: "#fce7f3", ink: "#be185d", kind: "assign", options: SIM_PROVIDERS },
    { key: "dreset", label: "Reset data bundle", icon: "ti-database-cog", tint: "#fef3c7", ink: "#b45309", kind: "resetdata" },
  ] },
  { group: "MONITORING & ALERTS", items: [
    { key: "status", label: "Change status", icon: "ti-toggle-right", tint: "#d1fae5", ink: "#047857", kind: "status", options: STATUSES },
    { key: "arm", label: "Arm monitoring", icon: "ti-lock", tint: "#d1fae5", ink: "#047857", kind: "action" },
    { key: "dis", label: "Disarm monitoring", icon: "ti-lock-open", tint: "#fef3c7", ink: "#b45309", kind: "action" },
    { key: "mute", label: "Mute alerts", icon: "ti-bell-off", tint: "#f1f5f9", ink: "#475569", kind: "mute" },
    { key: "ping", label: "Send test ping", icon: "ti-antenna-bars-5", tint: "#fee2e2", ink: "#dc2626", kind: "ping" },
  ] },
  { group: "REMOTE COMMANDS (HQ)", items: [
    { key: "cfw", label: "Firmware update (OTA)", icon: "ti-download", tint: "#dbe7fe", ink: "#2e6cf5", kind: "firmwareq" },
    { key: "cupt", label: "Set wake interval (sleep)", icon: "ti-zzz", tint: "#e0e7ff", ink: "#4f46e5", kind: "upt", options: UPT_MINS },
    { key: "cmot", label: "Set motion sensitivity (1–50, lower = more sensitive)", icon: "ti-adjustments-alt", tint: "#ede9fe", ink: "#7c3aed", kind: "sensitivity", options: MOTION },
    { key: "cint", label: "Set moving interval (3s–60s)", icon: "ti-clock-play", tint: "#e0f2fe", ink: "#0284c7", kind: "interval", options: UPLOAD_SECS },
    { key: "cip", label: "Set server IP + port", icon: "ti-server-2", tint: "#f1f5f9", ink: "#475569", kind: "text", op: "ip", ph: "245.56.78.9,1234" },
    { key: "capn", label: "Set APN", icon: "ti-world-cog", tint: "#d1fae5", ink: "#047857", kind: "text", op: "apn", ph: "ctnet  or  ctnet,user,pass" },
    { key: "crst", label: "Restart device", icon: "ti-reload", tint: "#fef3c7", ink: "#b45309", kind: "cmd", op: "reset" },
    { key: "crfs", label: "Restore factory settings", icon: "ti-rotate-2", tint: "#ffedd5", ink: "#c2410c", kind: "cmd", op: "rfs", danger: true },
    { key: "cpwr", label: "Power off (deactivate)", icon: "ti-power", tint: "#fee2e2", ink: "#dc2626", kind: "cmd", op: "poweroff", danger: true },
  ] },
  { group: "MAINTENANCE & FIELD", items: [
    { key: "resite", label: "Reassign to another site", icon: "ti-arrows-exchange", tint: "#dbe7fe", ink: "#2e6cf5", kind: "resite" },
    { key: "sync", label: "Sync device configuration (except IMEI)", icon: "ti-settings", tint: "#ede9fe", ink: "#7c3aed", kind: "synccfg" },
    // Schedule service visit — UI kept for future field/Accyss integration; no logic yet.
    { key: "svc", label: "Schedule service visit", icon: "ti-tool", tint: "#e0f2fe", ink: "#0284c7", kind: "disabled" },
  ] },
  { group: "DATA & DANGER", items: [
    { key: "csv", label: "Export selection to CSV", icon: "ti-download", tint: "#d1fae5", ink: "#047857", kind: "export" },
    { key: "pdf", label: "Generate PDF report", icon: "ti-file-text", tint: "#dbe7fe", ink: "#2e6cf5", kind: "pdf" },
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
  const facets = useFacets();   // live entity option lists (data plans, SIM providers, …)
  const toastTimer = useRef(null);
  // Firmware rollout status
  const [roOpen, setRoOpen] = useState(false);
  const [roCode, setRoCode] = useState(null);
  const [roTotal, setRoTotal] = useState(0);
  const [roFilter, setRoFilter] = useState("all");
  const [jobs, setJobs] = useState([]);
  const jobsTimer = useRef(null);
  const roCodeRef = useRef(null);
  // Full command queue (all devices)
  const [queueOpen, setQueueOpen] = useState(false);
  const [queueJobs, setQueueJobs] = useState([]);
  const [queueStatus, setQueueStatus] = useState("active"); // active | all
  const [queueKind, setQueueKind] = useState("all");        // all | firmware | command
  const queueTimer = useRef(null);
  const queueStatusRef = useRef("active");
  // Batch history (past rollouts / command batches)
  const [batchesOpen, setBatchesOpen] = useState(false);
  const [batches, setBatches] = useState([]);

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
    if (def.kind === "pdf") { generatePdf(); return; }
    if (def.kind === "delete") { doDelete(); return; }
    if (def.kind === "firmwareq") { doFirmware(); return; }
    if (def.kind === "action") { runDeviceBatch(def.key, undefined, def.label); return; }        // arm / dis
    if (def.kind === "resetdata") {
      if (typeof window !== "undefined" && !window.confirm(`Reset the data-bundle counter for ${selCount} device${selCount === 1 ? "" : "s"}? Usage starts from zero now.`)) return;
      runDeviceBatch("dreset", undefined, "Data bundle reset"); return;
    }
    if (def.kind === "disabled") { flash(`${def.label} isn't available yet`); return; }          // UI kept, no logic
    if (def.kind === "mute") { setPanel({ op: def, mute: { amount: 2, unit: "hours" } }); return; }
    if (def.kind === "databundle") { setPanel({ op: def, bundle: { amount: 50, unit: "MB", period: "annually" } }); return; }
    if (def.kind === "ping") { doPing(); return; }
    if (def.kind === "simulate") { flash(`${def.label} queued for ${selCount} device${selCount === 1 ? "" : "s"}`); return; }
    if (def.kind === "resite") { setPanel({ op: def, value: sites[0]?.code || "" }); return; }
    // Parameterless HQ command (RESET / RFS / pwroff) — confirm, then queue.
    if (def.kind === "cmd") {
      if (typeof window !== "undefined" && !window.confirm(
        `${def.label} on ${selCount} device${selCount === 1 ? "" : "s"}?\n\n` +
        `It is queued and sent to each device on its next wake.` +
        (def.danger ? `\n\nThis is a ${def.op === "poweroff" ? "power-OFF" : "destructive"} command.` : ""))) return;
      enqueueCommand(def.op, null, def.label);
      return;
    }
    if (def.kind === "synccfg") { doSync(); return; }
    if (def.kind === "text") { setPanel({ op: def, value: "" }); return; }
    // Options may be plain strings (pick/status) or [value,label] pairs (interval/upt/
    // sensitivity) — default to the first option's VALUE either way.
    // Assignments pull from live facets (values already in use ∪ defaults).
    if (def.kind === "assign") {
      const live = def.key === "dbp" ? facets.dataPlans : def.key === "simp" ? facets.simProviders : null;
      const opts = (live && live.length) ? live : (def.options || []);
      setPanel({ op: { ...def, options: opts }, value: opts[0] || "" });
      return;
    }
    const first = def.options && def.options[0];
    setPanel({ op: def, value: (Array.isArray(first) ? first[0] : first) || "" });
  }

  // ---- firmware rollout ---------------------------------------------------
  async function pollRollout(code) {
    const c = code || roCodeRef.current;
    if (!c) return;
    try {
      const res = await fetch(`/api/mainapp/devices/commands?batch_id=${encodeURIComponent(c)}`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setJobs(Array.isArray(d.jobs) ? d.jobs : []); }
    } catch { /* keep last */ }
  }
  function startRolloutPolling(code) {
    roCodeRef.current = code; setRoCode(code);
    if (jobsTimer.current) clearInterval(jobsTimer.current);
    pollRollout(code);
    jobsTimer.current = setInterval(() => pollRollout(), 5000);
  }
  useEffect(() => () => { if (jobsTimer.current) clearInterval(jobsTimer.current); }, []);

  async function doFirmware() {
    if (!selCount) return;
    if (typeof window !== "undefined" && !window.confirm(
      `Start a firmware rollout for ${selCount} device${selCount === 1 ? "" : "s"}?\n\n` +
      `Nothing is pushed now — each device downloads at its next check-in (sleep can be up to 24h) ` +
      `and only when it has no critical alarm. You'll see progress here.`)) return;
    setBusy(true);
    try {
      const ids = [...selected];
      const res = await fetch("/api/mainapp/devices/commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, op: "firmware" }),
      });
      const d = await res.json();
      if (!res.ok) { flash(d.error || "Could not start rollout", true); setBusy(false); return; }
      setBusy(false);
      setRoTotal(d.queued || ids.length); setRoFilter("all");
      startRolloutPolling(d.batchId); setRoOpen(true);
    } catch { flash("Network error", true); setBusy(false); }
  }

  async function enqueueCommand(op, value, label) {
    setBusy(true);
    try {
      const ids = [...selected];
      const res = await fetch("/api/mainapp/devices/commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, op, value }),
      });
      const d = await res.json();
      if (!res.ok) { flash(d.error || "Could not queue command", true); setBusy(false); return false; }
      setBusy(false);
      flash(`${label} queued on ${d.queued} device${d.queued === 1 ? "" : "s"} — applies on next wake`);
      return true;
    } catch { flash("Network error", true); setBusy(false); return false; }
  }

  // Direct device batch write (arm / dis / simr, or a value op like dbp/simp/mute).
  async function runDeviceBatch(op, value, label) {
    if (!selCount) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mainapp/devices/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], op, ...(value !== undefined ? { value } : {}) }),
      });
      const d = await res.json();
      setBusy(false);
      if (!res.ok) { flash(d.error || "Operation failed", true); return false; }
      flash(`${label || op} — ${d.affected} device${d.affected === 1 ? "" : "s"}`);
      await load();
      return true;
    } catch { setBusy(false); flash("Network error", true); return false; }
  }

  // Connectivity ping — queues a harmless re-assert command; confirms on next report.
  async function doPing() {
    if (!selCount) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mainapp/devices/commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], op: "ping" }),
      });
      const d = await res.json();
      setBusy(false);
      if (!res.ok) { flash(d.error || "Ping failed", true); return; }
      flash(`Ping queued to ${d.queued} device${d.queued === 1 ? "" : "s"} — confirms on next report`);
      openQueue();
    } catch { setBusy(false); flash("Network error", true); }
  }

  // Printable per-device report → browser print dialog (save as PDF).
  function generatePdf() {
    if (!selCount) return;
    const esc = (v) => String(v ?? "—").replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const rows = selectedDevices.map((d) => {
      const cfg = d.config || {};
      const batt = cfg.battery_percent != null ? `${cfg.battery_percent}%` : "—";
      const seen = d.last_seen ? new Date(d.last_seen).toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }) + " EAT" : "—";
      const flags = [d.armed === false ? "Disarmed" : "", (d.mute_until && new Date(d.mute_until) > new Date()) ? "Muted" : "", cfg.sim_replace ? "SIM flagged" : ""].filter(Boolean).join(", ") || "—";
      return `<tr><td>${esc(d.device_id || d.imei)}</td><td>${esc(d.site || "—")}</td><td>${esc(d.status)}</td><td>${esc(batt)}</td><td>${esc(d.firmware || "—")}</td><td>${esc(seen)}</td><td>${esc(flags)}</td></tr>`;
    }).join("");
    const when = new Date().toLocaleString("en-GB", { timeZone: "Africa/Nairobi" }) + " EAT";
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>AssetGuard — Devices report</title>
      <style>body{font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#0f274a;margin:28px}table{width:100%;border-collapse:collapse;font-size:12px}td,th{border-bottom:1px solid #e2e8f0;padding:6px;text-align:left}thead tr{background:#f1f5f9}h1{font-size:20px;margin:0 0 4px}</style></head>
      <body><h1>AssetGuard — Devices report</h1><div style="color:#64748b;font-size:12px;margin-bottom:18px">${selCount} device${selCount === 1 ? "" : "s"} · generated ${when}</div>
      <table><thead><tr><th>Device</th><th>Site</th><th>Status</th><th>Battery</th><th>Firmware</th><th>Last seen</th><th>Flags</th></tr></thead><tbody>${rows}</tbody></table>
      <script>window.onload=function(){setTimeout(function(){window.print();},250);}</script></body></html>`;
    const w = window.open("", "_blank");
    if (!w) { flash("Allow pop-ups to generate the report", true); return; }
    w.document.open(); w.document.write(html); w.document.close();
    flash(`Report ready for ${selCount} device${selCount === 1 ? "" : "s"} — save as PDF from the print dialog`);
  }

  async function rolloutControl(op) {
    if (!roCodeRef.current) return;
    try {
      await fetch("/api/mainapp/devices/commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, batch_id: roCodeRef.current }),
      });
      pollRollout();
    } catch { flash("Network error", true); }
  }
  function closeRollout() { if (jobsTimer.current) clearInterval(jobsTimer.current); setRoOpen(false); }

  // Cancel the whole rollout from the firmware view. Cancels the batch's not-yet-
  // confirmed jobs in the DB, so the command queue (which polls the same table) stays
  // in sync — both views show them Canceled.
  // Sync configuration: push each selected device's stored config as real commands
  // (motion sensitivity, moving interval, wake interval) — everything except IMEI.
  async function doSync() {
    if (!selCount) return;
    if (typeof window !== "undefined" && !window.confirm(
      `Sync configuration to ${selCount} device${selCount === 1 ? "" : "s"}?\n\n` +
      `Each device's stored settings (motion sensitivity, moving interval, wake interval) ` +
      `are queued as commands and sent on its next wake. IMEI is not sent.`)) return;
    setBusy(true);
    try {
      const res = await fetch("/api/mainapp/devices/commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [...selected], op: "sync" }),
      });
      const d = await res.json();
      setBusy(false);
      if (!res.ok) { flash(d.error || "Sync failed", true); return; }
      flash(`Sync queued — ${d.queued} command${d.queued === 1 ? "" : "s"} across ${d.synced} device${d.synced === 1 ? "" : "s"}`);
      openQueue();
    } catch { flash("Network error", true); setBusy(false); }
  }

  async function cancelRollout() {
    const ids = (jobs || []).filter((j) => ["pending", "sent", "acked", "paused"].includes(j.status)).map((j) => j.id).filter(Boolean);
    if (!ids.length) { flash("Nothing to cancel"); return; }
    if (typeof window !== "undefined" && !window.confirm(`Cancel this rollout? ${ids.length} device${ids.length === 1 ? "" : "s"} not yet confirmed will be canceled.`)) return;
    await cancelQueueJobs(ids);
    pollRollout();
  }

  // ---- full command queue -------------------------------------------------
  async function pollQueue() {
    try {
      const res = await fetch(`/api/mainapp/devices/commands?scope=queue&status=${queueStatusRef.current}`, { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setQueueJobs(Array.isArray(d.jobs) ? d.jobs : []); }
    } catch { /* keep last */ }
  }
  function openQueue() {
    setQueueOpen(true);
    if (queueTimer.current) clearInterval(queueTimer.current);
    pollQueue();
    queueTimer.current = setInterval(pollQueue, 5000);
  }
  function closeQueue() { if (queueTimer.current) clearInterval(queueTimer.current); setQueueOpen(false); }
  function setQStatus(s) { queueStatusRef.current = s; setQueueStatus(s); pollQueue(); }
  async function cancelQueueJobs(jobIds) {
    if (!jobIds.length) return;
    try {
      await fetch("/api/mainapp/devices/commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op: "cancel", job_ids: jobIds }),
      });
      pollQueue();
      flash(`Canceled ${jobIds.length} command${jobIds.length === 1 ? "" : "s"}`);
    } catch { flash("Network error", true); }
  }
  useEffect(() => () => { if (queueTimer.current) clearInterval(queueTimer.current); }, []);

  // ---- batch history ------------------------------------------------------
  async function openBatches() {
    setBatchesOpen(true);
    try {
      const res = await fetch("/api/mainapp/devices/commands?scope=batches", { cache: "no-store" });
      if (res.ok) { const d = await res.json(); setBatches(Array.isArray(d.batches) ? d.batches : []); }
    } catch { /* keep */ }
  }
  function openBatch(b) {
    setBatchesOpen(false);
    setRoTotal(b.total || 0); setRoFilter("all");
    startRolloutPolling(b.batch_id); setRoOpen(true);
  }

  async function applyPanel() {
    if (!panel) return;
    const { op, value, mute, bundle } = panel;
    // Assign data bundle (amount + unit + period, 1MB..10GB).
    if (bundle) {
      setBusy(true);
      const ok = await runDeviceBatch("dbp", { amount: Number(bundle.amount) || 0, unit: bundle.unit, period: bundle.period }, `Data bundle ${bundle.amount} ${bundle.unit} ${bundle.period}`);
      setBusy(false); if (ok) setPanel(null);
      return;
    }
    // Mute alerts (with unit) → per-device mute in the registry.
    if (mute) {
      setBusy(true);
      const ok = await runDeviceBatch("mute", { amount: Number(mute.amount) || 0, unit: mute.unit },
        Number(mute.amount) > 0 ? `Muted for ${mute.amount} ${mute.unit}` : "Unmuted");
      setBusy(false); if (ok) setPanel(null);
      return;
    }
    // Assign data-bundle plan / SIM provider → persisted on the device.
    if (op.kind === "assign") {
      const ok = await runDeviceBatch(op.key, value, `${op.label} → ${value}`);
      if (ok) setPanel(null);
      return;
    }
    // Motion sensitivity is a real downlink command → goes to the device queue.
    if (op.kind === "sensitivity") {
      const ok = await enqueueCommand("sensitivity", value, `Motion sensitivity ${value}`);
      if (ok) setPanel(null);
      return;
    }
    if (op.kind === "interval") {
      const ok = await enqueueCommand("interval", value, `Upload interval ${value}s`);
      if (ok) setPanel(null);
      return;
    }
    if (op.kind === "upt") {
      const ok = await enqueueCommand("upt", value, `Wake interval ${value} min`);
      if (ok) setPanel(null);
      return;
    }
    if (op.kind === "text") {
      if (!String(value || "").trim()) { flash("Enter a value", true); return; }
      const ok = await enqueueCommand(op.op, value.trim(), op.label);
      if (ok) setPanel(null);
      return;
    }
    // Status / reassign persist to the registry; the rest are queued client-side.
    const realOp = op.kind === "status" ? "status" : op.kind === "resite" ? "resite" : null;
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
    ? (panel.op.kind === "resite" ? sites.map((s) => [s.code, `${s.name}`])
       : (panel.op.options || []).map((o) => (Array.isArray(o) ? o : [o, o])))
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Group devices</div>
          <div className={styles.sub}>Categorise, select and run batch operations on devices</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginLeft: "auto" }}>
          <button onClick={openBatches}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #BFDBFE", background: "#EFF6FF",
                     color: "#2563EB", borderRadius: 10, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <i className="ti ti-history" />Batch history
          </button>
          <button onClick={openQueue}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, border: "1px solid #C7D2FE", background: "#EEF2FF",
                     color: "#4F46E5", borderRadius: 10, padding: "9px 16px", fontSize: 13.5, fontWeight: 700, cursor: "pointer" }}>
            <i className="ti ti-list-check" />Command queue
          </button>
          <span style={{ fontSize: 12.5, color: "#64748b", fontWeight: 600, marginLeft: 2 }}>{devices.length} devices total</span>
        </div>
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
                    <td>
                      <span className={styles.pill} style={pillStyle(d.status)}>{d.status}</span>
                      {d.armed === false && (
                        <span className={styles.pill} style={{ background: "#fef3c7", color: "#b45309", marginLeft: 5 }} title="Monitoring disarmed"><i className="ti ti-lock-open" /> Disarmed</span>
                      )}
                      {d.mute_until && new Date(d.mute_until) > new Date() && (
                        <span className={styles.pill} style={{ background: "#f1f5f9", color: "#64748b", marginLeft: 5 }} title="Alerts muted (downgraded to Low)"><i className="ti ti-bell-off" /> Muted</span>
                      )}
                    </td>
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
          {roCode ? <button className={styles.barBtn} onClick={() => { startRolloutPolling(roCode); setRoOpen(true); }}><i className="ti ti-list-check" />Rollout {roCode}</button> : null}
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
                      <button key={o.key} className={`${styles.op} ${o.danger ? styles.opDanger : ""} ${g.items.length % 2 === 1 && o === g.items[g.items.length - 1] ? styles.opWide : ""}`} style={o.kind === "disabled" ? { opacity: 0.5 } : undefined} onClick={() => runOp(o)}>
                        <span className={styles.opIcon} style={{ background: o.tint, color: o.ink }}><i className={`ti ${o.icon}`} /></span>
                        {o.label}{o.kind === "disabled" ? " (soon)" : ""}
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
            {panel.bundle ? (
              <>
                <label className={styles.lab}>DATA BUNDLE</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" min={1} className={styles.panelSelect} style={{ flex: "0 0 90px" }}
                    value={panel.bundle.amount}
                    onChange={(e) => setPanel((p) => ({ ...p, bundle: { ...p.bundle, amount: e.target.value } }))} />
                  <select className={styles.panelSelect} style={{ flex: 1 }} value={panel.bundle.unit}
                    onChange={(e) => setPanel((p) => ({ ...p, bundle: { ...p.bundle, unit: e.target.value } }))}>
                    <option value="MB">MB</option><option value="GB">GB</option>
                  </select>
                </div>
                <label className={styles.lab} style={{ marginTop: 10 }}>PERIOD</label>
                <select className={styles.panelSelect} value={panel.bundle.period}
                  onChange={(e) => setPanel((p) => ({ ...p, bundle: { ...p.bundle, period: e.target.value } }))}>
                  <option value="monthly">Monthly</option><option value="annually">Annually</option>
                </select>
                <div className={styles.panelSub} style={{ marginTop: 8 }}>
                  Range 1 MB – 10 GB. Assigning starts the usage counter fresh. Renewal is manual (use “Reset data bundle”).
                </div>
              </>
            ) : panel.mute ? (
              <>
                <label className={styles.lab}>MUTE DURATION</label>
                <div style={{ display: "flex", gap: 8 }}>
                  <input type="number" min={0} className={styles.panelSelect} style={{ flex: "0 0 90px" }}
                    value={panel.mute.amount}
                    onChange={(e) => setPanel((p) => ({ ...p, mute: { ...p.mute, amount: e.target.value } }))} />
                  <select className={styles.panelSelect} style={{ flex: 1 }} value={panel.mute.unit}
                    onChange={(e) => setPanel((p) => ({ ...p, mute: { ...p.mute, unit: e.target.value } }))}>
                    {MUTE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className={styles.panelSub} style={{ marginTop: 8 }}>
                  Muted devices' alarms are downgraded to Low (recorded, no critical paging). Set 0 to unmute.
                </div>
              </>
            ) : (
              <>
                <label className={styles.lab}>{panel.op.kind === "resite" ? "REASSIGN TO" : panel.op.kind === "upt" ? "WAKE INTERVAL" : "NEW VALUE"}</label>
                {panel.op.kind === "text" ? (
                  <input className={styles.panelSelect} type="text" value={panel.value} placeholder={panel.op.ph || ""}
                         onChange={(e) => setPanel((p) => ({ ...p, value: e.target.value }))} autoComplete="off" />
                ) : (
                  <select className={styles.panelSelect} value={panel.value} onChange={(e) => setPanel((p) => ({ ...p, value: e.target.value }))}>
                    {panelOptions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                  </select>
                )}
              </>
            )}
            <div className={styles.panelActions}>
              <button className={styles.btnGhost} onClick={() => setPanel(null)} disabled={busy}>Cancel</button>
              <button className={styles.btnPrimary} onClick={applyPanel} disabled={busy}>{busy ? "Applying…" : `Apply to ${selCount}`}</button>
            </div>
          </div>
        </div>
      )}

      {/* firmware rollout status */}
      {roOpen && (() => {
        const g = jobs.reduce((a, j) => { const k = stageOf(j.status).group; a[k] = (a[k] || 0) + 1; return a; }, {});
        const total = roTotal || jobs.length || 0;
        const confirmed = g.confirmed || 0;
        const failed = g.failed || 0;
        const pending = (g.pending || 0);
        const downloading = g.downloading || 0;
        const applying = g.applying || 0;
        const pct = total ? Math.round((confirmed / total) * 100) : 0;
        const done = total > 0 && confirmed + failed >= total;
        const anyActive = jobs.some((j) => ["pending", "sent"].includes(j.status));
        const anyPaused = jobs.some((j) => j.status === "paused");
        const shown = jobs.filter((j) => roFilter === "all" ? true : stageOf(j.status).filter === roFilter);
        return (
          <div className={styles.roScrim} onClick={(e) => { if (e.target === e.currentTarget) closeRollout(); }}>
            <div className={styles.roModal}>
              <div className={styles.roHead}>
                <span className={`${styles.roHeadIcon} ${done ? "" : styles.spin}`}><i className="ti ti-refresh" /></span>
                <div className={styles.roHeadText}>
                  <div className={styles.roTitle}>Firmware rollout {roCode}</div>
                  <div className={styles.roSub}>{total} device{total === 1 ? "" : "s"} · all at once</div>
                </div>
                <button className={styles.roX} onClick={closeRollout} aria-label="Close"><i className="ti ti-x" /></button>
              </div>

              <div className={styles.roBody}>
                {pending > 0 ? (
                  <div className={styles.roBanner}>
                    <i className="ti ti-clock-pause" />
                    <span>Devices download at their next check-in. Sleep interval can be up to 24h, so this rollout runs in the background.</span>
                  </div>
                ) : null}

                <div className={styles.roCountRow}>
                  <div><span className={styles.roCountBig}>{confirmed} of {total}</span> <span className={styles.roCountSub}>confirmed</span></div>
                </div>

                <div className={styles.roTrack}><div className={styles.roFill} style={{ width: `${pct}%` }} /></div>

                <div className={styles.roStats}>
                  <span style={{ color: "#6b7280" }}>{pending} pending wake-up</span>
                  <span style={{ color: "#0284c7" }}>{downloading} downloading</span>
                  <span style={{ color: "#d97706" }}>{applying} applying</span>
                  <span style={{ color: "#059669" }}>{confirmed} confirmed</span>
                  <span style={{ color: "#dc2626" }}>{failed} failed</span>
                </div>

                <div className={styles.roPills}>
                  {ROLLOUT_PILLS.map(([k, l]) => (
                    <button key={k} className={`${styles.roPill} ${roFilter === k ? styles.roPillOn : ""}`} onClick={() => setRoFilter(k)}>{l}</button>
                  ))}
                </div>

                <div className={styles.roList}>
                  {shown.length ? shown.map((j) => {
                    const st = stageOf(j.status);
                    return (
                      <div key={j.id} className={styles.roRow}>
                        <span className={styles.roDot} style={{ background: st.dot }} />
                        <span className={styles.roDev}>{j.device_id_text || j.imei}</span>
                        <span className={styles.roRowStatus} style={{ color: st.color }}>{st.row}</span>
                      </div>
                    );
                  }) : <div className={styles.roEmpty}>No devices in this state.</div>}
                </div>
              </div>

              <div className={styles.roFoot}>
                <span className={styles.roFootNote} style={{ color: done ? "#059669" : "#64748b" }}>
                  {done
                    ? (failed ? `Rollout finished — ${confirmed} updated, ${failed} failed.` : `Rollout complete — all ${total} device${total === 1 ? "" : "s"} updated.`)
                    : "Staged on the server. Nothing is pushed; devices pull on wake."}
                </span>
                <div className={styles.roActions}>
                  {!done && anyPaused ? <button className={styles.roBtnGhost} onClick={() => rolloutControl("resume")}>Resume</button> : null}
                  {!done && anyActive ? <button className={styles.roBtnGhost} onClick={() => rolloutControl("pause")}>Pause</button> : null}
                  {jobs.some((j) => ["pending", "sent", "acked", "paused"].includes(j.status))
                    ? <button className={styles.roBtnGhost} style={{ color: "#dc2626", borderColor: "#fecaca" }} onClick={cancelRollout}>Cancel rollout</button> : null}
                  <button className={styles.roBtnPrimary} onClick={closeRollout}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* full command queue */}
      {queueOpen && (() => {
        const shown = queueJobs.filter((j) => queueKind === "all" ? true : queueKind === "firmware" ? j.kind === "firmware" : j.kind !== "firmware");
        const active = shown.filter((j) => ["pending", "sent", "acked", "paused"].includes(j.status));
        return (
          <div className={styles.roScrim} onClick={(e) => { if (e.target === e.currentTarget) closeQueue(); }}>
            <div className={styles.roModal} style={{ width: "min(860px, 96vw)" }}>
              <div className={styles.roHead}>
                <span className={styles.roHeadIcon}><i className="ti ti-list-check" /></span>
                <div className={styles.roHeadText}>
                  <div className={styles.roTitle}>Command queue</div>
                  <div className={styles.roSub}>{queueStatus === "active" ? "Active jobs across all devices" : "All jobs (last 14 days)"} · {shown.length} shown</div>
                </div>
                <button className={styles.roX} onClick={closeQueue} aria-label="Close"><i className="ti ti-x" /></button>
              </div>

              <div className={styles.roBody}>
                <div className={styles.roPills}>
                  <button className={`${styles.roPill} ${queueKind === "all" ? styles.roPillOn : ""}`} onClick={() => setQueueKind("all")}>All</button>
                  <button className={`${styles.roPill} ${queueKind === "firmware" ? styles.roPillOn : ""}`} onClick={() => setQueueKind("firmware")}>Firmware</button>
                  <button className={`${styles.roPill} ${queueKind === "command" ? styles.roPillOn : ""}`} onClick={() => setQueueKind("command")}>Commands</button>
                  <span style={{ flex: 1 }} />
                  <button className={`${styles.roPill} ${queueStatus === "active" ? styles.roPillOn : ""}`} onClick={() => setQStatus("active")}>Active</button>
                  <button className={`${styles.roPill} ${queueStatus === "all" ? styles.roPillOn : ""}`} onClick={() => setQStatus("all")}>All</button>
                </div>

                <div style={{ maxHeight: "50vh", overflow: "auto", border: "1px solid #EEF2F7", borderRadius: 10 }}>
                  <table className={styles.table} style={{ margin: 0 }}>
                    <thead>
                      <tr><th>DEVICE</th><th>SITE</th><th>COMMAND</th><th>ROLLOUT</th><th>STATUS</th><th>QUEUED</th><th></th></tr>
                    </thead>
                    <tbody>
                      {shown.length ? shown.map((j) => {
                        const q = qstat(j.status);
                        const cancelable = ["pending", "sent", "acked", "paused"].includes(j.status);
                        return (
                          <tr key={j.id}>
                            <td><span className={styles.siteName}>{j.device_id_text || j.imei}</span></td>
                            <td>{j.site || "—"}</td>
                            <td className={styles.fw}>{j.command}{j.kind === "firmware" ? "" : ""}</td>
                            <td className={styles.fw}>{j.kind === "firmware" ? (j.batch_id || "—") : "—"}</td>
                            <td><span style={{ background: q.b, color: q.c, fontWeight: 700, fontSize: 12, padding: "3px 10px", borderRadius: 999 }}>{q.l}</span></td>
                            <td style={{ color: "#64748b", fontSize: 12.5 }}>{ago(j.created_at)}</td>
                            <td style={{ textAlign: "right" }}>
                              {cancelable ? <button className={styles.roPill} style={{ padding: "4px 10px", color: "#dc2626", borderColor: "#fecaca" }} onClick={() => cancelQueueJobs([j.id])}>Cancel</button> : null}
                            </td>
                          </tr>
                        );
                      }) : <tr><td className={styles.emptyRow} colSpan={7}>No {queueStatus === "active" ? "active " : ""}commands in the queue.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className={styles.roFoot}>
                <span className={styles.roFootNote}>Updates every 5s · {active.length} active</span>
                <div className={styles.roActions}>
                  {active.length ? <button className={styles.roBtnGhost} style={{ color: "#dc2626", borderColor: "#fecaca" }} onClick={() => { if (typeof window === "undefined" || window.confirm(`Cancel all ${active.length} active command(s) shown?`)) cancelQueueJobs(active.map((j) => j.id)); }}>Cancel all shown</button> : null}
                  <button className={styles.roBtnPrimary} onClick={closeQueue}>Close</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* batch history */}
      {batchesOpen && (
        <div className={styles.roScrim} onClick={(e) => { if (e.target === e.currentTarget) setBatchesOpen(false); }}>
          <div className={styles.roModal} style={{ width: "min(860px, 96vw)" }}>
            <div className={styles.roHead}>
              <span className={styles.roHeadIcon}><i className="ti ti-history" /></span>
              <div className={styles.roHeadText}>
                <div className={styles.roTitle}>Batch history</div>
                <div className={styles.roSub}>Past firmware rollouts &amp; command batches (last 30 days) · {batches.length}</div>
              </div>
              <button className={styles.roX} onClick={() => setBatchesOpen(false)} aria-label="Close"><i className="ti ti-x" /></button>
            </div>
            <div className={styles.roBody}>
              <div style={{ maxHeight: "56vh", overflow: "auto", border: "1px solid #EEF2F7", borderRadius: 10 }}>
                <table className={styles.table} style={{ margin: 0 }}>
                  <thead>
                    <tr><th>BATCH</th><th>TYPE</th><th>COMMAND</th><th>WHEN</th><th>DEVICES</th><th>RESULT</th><th></th></tr>
                  </thead>
                  <tbody>
                    {batches.length ? batches.map((b) => {
                      const when = (() => { try { return new Date(b.created_at).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }); } catch { return "—"; } })();
                      const isFw = b.kind === "firmware";
                      const parts = [];
                      if (b.confirmed) parts.push(`${b.confirmed} confirmed`);
                      if (b.active) parts.push(`${b.active} active`);
                      if (b.failed) parts.push(`${b.failed} failed`);
                      if (b.canceled) parts.push(`${b.canceled} canceled`);
                      const resultColor = b.active ? "#0284c7" : b.failed ? (b.confirmed ? "#b45309" : "#dc2626") : "#047857";
                      return (
                        <tr key={b.batch_id} style={{ cursor: "pointer" }} onClick={() => openBatch(b)}>
                          <td><span className={styles.siteName}>{isFw ? (b.batch_id || "—") : "—"}</span></td>
                          <td>{isFw ? "Firmware" : "Command"}</td>
                          <td className={styles.fw}>{b.command}</td>
                          <td style={{ color: "#475569", fontSize: 12.5 }}>{when}</td>
                          <td>{b.total}</td>
                          <td style={{ color: resultColor, fontWeight: 700, fontSize: 12.5 }}>{parts.join(" · ") || "—"}</td>
                          <td style={{ textAlign: "right" }}><button className={styles.roPill} style={{ padding: "4px 10px" }} onClick={(e) => { e.stopPropagation(); openBatch(b); }}>View</button></td>
                        </tr>
                      );
                    }) : <tr><td className={styles.emptyRow} colSpan={7}>No batch operations yet.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className={styles.roFoot}>
              <span className={styles.roFootNote}>Click a batch to reopen its rollout / status.</span>
              <div className={styles.roActions}><button className={styles.roBtnPrimary} onClick={() => setBatchesOpen(false)}>Close</button></div>
            </div>
          </div>
        </div>
      )}

      {toast && <div className={`${styles.toast} ${toast.bad ? styles.toastBad : ""}`}>{toast.msg}</div>}
    </div>
  );
}
