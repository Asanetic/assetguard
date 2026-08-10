// app/mainapp/admin/audit/components/AuditLogs.jsx
// Audit logs — a faithful React port of the prototype's auditLogsWeb /
// auditLogsWebMount, backed by the real /api/mainapp/audit endpoint.
//
// The trail is append-only: this screen reads it (newest first), lets you search
// and filter by category, and exports the current view to a real CSV file. It
// seeds with the same five prototype entries so it renders instantly, then
// replaces them with whatever the backend returns.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./audit.module.css";

// Category dot colours — exactly the prototype's AUDIT_CATCOLORS.
const CAT_COLORS = {
  Users: "#2E6CF5", Sites: "#10B981", Devices: "#F59E0B",
  Alarms: "#EF4444", System: "#64748B", Companies: "#8B5CF6",
};
const CATEGORIES = ["Users", "Sites", "Devices", "Alarms", "Companies", "System"];

// Shown immediately; replaced by the API response on load.
const SEED = [
  { ts: "2026-07-15 09:41:22", user: "Jane Wanjiku", role: "Administrator", action: "User approved", cat: "Users", detail: "Approved REG-2043 Mercy Achieng and assigned Field Responder", ip: "196.201.14.32" },
  { ts: "2026-07-15 09:12:04", user: "Grace Wambui", role: "Super Admin", action: "Site deleted", cat: "Sites", detail: "Deleted site THK-WH-006 Thika Warehouse (0 devices)", ip: "196.201.14.9" },
  { ts: "2026-07-15 08:55:47", user: "Kevin Ouma", role: "NOC", action: "Alarm closed", cat: "Alarms", detail: "Closed ALM-3391 perimeter breach at Nairobi Headquarters", ip: "41.90.7.220" },
  { ts: "2026-07-15 08:40:10", user: "James Mwangi", role: "Administrator", action: "Device added", cat: "Devices", detail: "Registered device 004_NakuruDepot_V (IMEI 352093…34580)", ip: "196.201.14.32" },
  { ts: "2026-07-14 17:22:33", user: "Alice Njeri", role: "Company Manager", action: "Role changed", cat: "Users", detail: "Changed Nancy Wairimu from NOC to suspended", ip: "196.201.14.51" },
];

function initials(name) {
  return String(name || "")
    .split(" ").map((w) => w.charAt(0)).slice(0, 2).join("").toUpperCase();
}

function Avatar({ name, size = 30 }) {
  return (
    <span className={styles.avatar} style={{ width: size, height: size, fontSize: size * 0.34 }}>
      {initials(name)}
    </span>
  );
}

// Escape a value for CSV (wrap in quotes, double internal quotes).
function csvCell(v) {
  const s = String(v ?? "");
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState(SEED);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  function flashToast(t) {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2000);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/mainapp/audit", { cache: "no-store" });
        if (!res.ok) throw new Error("bad status");
        const data = await res.json();
        if (alive && Array.isArray(data.logs)) { setLogs(data.logs); setOffline(false); }
      } catch {
        // Keep the seed rows so the screen still matches the prototype offline.
        if (alive) setOffline(true);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return logs.filter((a) =>
      (cat === "all" || a.cat === cat) &&
      (a.user + a.action + a.detail).toLowerCase().indexOf(term) > -1);
  }, [logs, q, cat]);

  function exportCsv() {
    const header = ["Timestamp", "User", "Role", "Action", "Category", "Detail", "IP"];
    const lines = [header.join(",")].concat(
      filtered.map((a) => [a.ts, a.user, a.role, a.action, a.cat, a.detail, a.ip].map(csvCell).join(","))
    );
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "assetguard-audit-log.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    flashToast("Audit log exported to CSV");
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Audit logs</div>
          <div className={styles.sub}>Complete, timestamped trail of system activity</div>
        </div>
        <div className={styles.headActions}>
          <button type="button" className={styles.exportBtn} onClick={exportCsv}>
            <i className="ti ti-download" />Export CSV
          </button>
        </div>
      </div>

      {offline ? (
        <div className={styles.note}>
          Showing sample entries — the audit API isn’t reachable. Run db/audit_logs.sql and make sure you’re signed in as an admin.
        </div>
      ) : null}

      <div className={styles.filters}>
        <div className={styles.search}>
          <i className="ti ti-search" />
          <input className={styles.searchInput} placeholder="Search by user, action or detail..."
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className={styles.catSelect} value={cat} onChange={(e) => setCat(e.target.value)}>
          <option value="all">All categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>{["TIMESTAMP", "USER", "ACTION", "DETAIL", "IP"].map((h) => <th key={h}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtered.map((a, i) => {
                const c = CAT_COLORS[a.cat] || "#64748b";
                return (
                  <tr key={i}>
                    <td className={styles.ts}>{a.ts}</td>
                    <td>
                      <div className={styles.userCell}>
                        <Avatar name={a.user} size={30} />
                        <div>
                          <div className={styles.userName}>{a.user}</div>
                          <div className={styles.userRole}>{a.role}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={styles.action} style={{ color: c }}>
                        <span className={styles.dot} style={{ background: c }} />{a.action}
                      </span>
                      <div className={styles.actionCat}>{a.cat}</div>
                    </td>
                    <td className={styles.detail}>{a.detail}</td>
                    <td className={styles.ip}>{a.ip}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {loading ? <div className={styles.loading}>Loading…</div> : (!filtered.length ? <div className={styles.empty}>No entries match</div> : null)}
      </div>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
