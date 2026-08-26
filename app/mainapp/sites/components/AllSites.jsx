// app/mainapp/sites/components/AllSites.jsx
// The "All sites" listing — mirrors the prototype (assetguard_web_all_sites_v5):
// header + Add Site, dominant search + Region/Status filters, sticky-header
// scrollable table with exact status pills, and a View action per row.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./sites.module.css";
import ImportSites from "./ImportSites.jsx";
import { useFacets } from "../../lib/useFacets.js";

const REGIONS = ["Nairobi", "Coast", "Western", "Rift Valley", "Eastern", "North Eastern"];
const STATUSES = ["Live", "Testing", "Maintenance", "SMPMS", "Pending", "Offline", "Inactive"];

// Exact pill palette from the prototype.
const PILL = {
  live:        { bg: "#D1FAE5", fg: "#065F46", dot: "#10B981", label: "Live" },
  testing:     { bg: "#FEF3C7", fg: "#92400E", dot: "#F59E0B", label: "Testing" },
  maintenance: { bg: "#E0F2FE", fg: "#075985", dot: "#0EA5E9", label: "Maintenance" },
  smpms:       { bg: "#FCE7F3", fg: "#9D174D", dot: "#EC4899", label: "SMPMS" },
  pending:     { bg: "#F1F5F9", fg: "#475569", dot: "#64748B", label: "Pending" },
  offline:     { bg: "#FEE2E2", fg: "#991B1B", dot: "#EF4444", label: "Offline" },
  inactive:    { bg: "#EDE9FE", fg: "#5B21B6", dot: "#8B5CF6", label: "Inactive" },
};

function StatusPill({ status }) {
  const key = String(status || "").toLowerCase();
  const p = PILL[key] || { bg: "#F1F5F9", fg: "#475569", dot: "#64748B", label: status || "—" };
  return (
    <span className={styles.pill} style={{ background: p.bg, color: p.fg }}>
      <span className={styles.dot} style={{ background: p.dot }} />
      {p.label}
    </span>
  );
}

export default function AllSites() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [region, setRegion] = useState("all");
  const facets = useFacets();
  const regionOpts = (facets.regions && facets.regions.length) ? facets.regions : REGIONS;
  const [status, setStatus] = useState("all");
  const [showImport, setShowImport] = useState(false);
  const debounce = useRef(null);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (region !== "all") params.set("region", region);
    if (status !== "all") params.set("status", status);
    try {
      const r = await fetch(`/api/mainapp/sites?${params.toString()}`);
      const d = r.ok ? await r.json() : { sites: [] };
      setSites(d.sites || []);
    } catch {
      setSites([]);
    } finally {
      setLoading(false);
    }
  }

  // Selects filter immediately; search is debounced.
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [region, status]);
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(load, 250);
    return () => debounce.current && clearTimeout(debounce.current);
    // eslint-disable-next-line
  }, [q]);

  const count = sites.length;

  return (
    <div className={styles.page}>
      {/* Header */}
      <div className={styles.head}>
        <div>
          <div className={styles.title}>All sites</div>
          <div className={styles.sub}>Manage all registered locations and their operational status.</div>
        </div>
        <div className={styles.headActions}>
          <button className={styles.importBtn} onClick={() => setShowImport(true)}>
            <i className="ti ti-file-import" aria-hidden="true" />
            Import sites
          </button>
          <button className={styles.addBtn} onClick={() => router.push("/mainapp/sites/add")}>
            <i className="ti ti-plus" aria-hidden="true" />
            Add Site
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={styles.filters}>
        <div className={styles.searchWrap}>
          <i className={`ti ti-search ${styles.searchIcon}`} aria-hidden="true" />
          <input
            className={styles.search}
            type="text"
            placeholder="Search sites..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select className={styles.select} value={region} onChange={(e) => setRegion(e.target.value)}>
          <option value="all">All Regions</option>
          {regionOpts.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All Statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableWrap}>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Site name</th>
                <th>Region</th>
                <th>Location</th>
                <th>Devices</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.id}>
                  <td>
                    <div className={styles.siteName}>{s.name}</div>
                    <div className={styles.siteCode}>{s.code}</div>
                  </td>
                  <td>{s.region || "—"}</td>
                  <td>{s.location || "—"}</td>
                  <td>{s.devices}</td>
                  <td><StatusPill status={s.status} /></td>
                  <td>
                    <button
                      className={styles.viewBtn}
                      onClick={() => router.push(`/mainapp/sites/${s.id}`)}
                    >
                      View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && count === 0 && (
          <div className={styles.empty}>No sites match your filters</div>
        )}
        {loading && <div className={styles.empty}>Loading sites…</div>}
      </div>

      {showImport && (
        <ImportSites
          onClose={() => setShowImport(false)}
          onImported={() => { setShowImport(false); load(); }}
        />
      )}
    </div>
  );
}
