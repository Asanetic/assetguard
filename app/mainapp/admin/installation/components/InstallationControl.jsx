// app/mainapp/admin/installation/components/InstallationControl.jsx
// The admin "Installation" view — installs AND maintenance.
//
//   • a live map of where every technician is (click a marker for the name),
//   • "In progress" — every job being worked right now (up to ~15 at once), with
//     its stage and, per tracker, on / GPS fix / satellites,
//   • "Completed" — the permanent history, searchable (technician, date range,
//     type, outcome) and paginated, because this grows into the thousands.
//
// The live part is polled; the completed search is fetched on demand.
"use client";

import { useEffect, useRef, useState } from "react";
import {
  fetchMapsConfig, loadGoogleMaps, sitePinIcon,
} from "../../../lib/googleMaps.js";

/* ---------------- step labels ---------------- */
const STEP_ORDER = ["Location", "Device", "MaintenanceWork", "BeforePhotos", "Checks", "Confirmation", "Settle", "Test", "AfterPhotos", "Done"];
const STEP_LABEL = {
  Location: "At location", Device: "Checking devices", MaintenanceWork: "Doing the work",
  BeforePhotos: "Before photos", Checks: "Checklist", Confirmation: "Confirming",
  Settle: "Settling (3:30)", Test: "Shake test", AfterPhotos: "After photos", Done: "Finishing up",
};
function stepMeta(step) {
  if (!step) return { label: "Starting…", idx: 0, total: STEP_ORDER.length };
  const idx = STEP_ORDER.indexOf(step);
  return { label: STEP_LABEL[step] || step, idx: idx < 0 ? 0 : idx, total: STEP_ORDER.length };
}

/* ---------------- job type ---------------- */
function jobTypeMeta(t) {
  return t === "maintain"
    ? { label: "Maintenance", color: "#0369a1", bg: "#e0f2fe", pin: "maintenance" }
    : { label: "Installation", color: "#2e6cf5", bg: "#eaf1ff", pin: "testing" };
}

/* ---------------- time ---------------- */
const EAT = { timeZone: "Africa/Nairobi" };
function fmtTime(v) {
  if (!v) return "—";
  const t = new Date(v); if (isNaN(t)) return "—";
  return t.toLocaleString("en-GB", { ...EAT, day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " EAT";
}
function agoText(sec) {
  if (sec == null) return "—";
  const s = Math.max(0, Math.round(Number(sec)));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const d = Math.round(h / 24); return `${d} day${d > 1 ? "s" : ""} ago`;
}
function durationText(a, b) {
  if (!a || !b) return null;
  const ms = new Date(b).getTime() - new Date(a).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins} min`;
  const h = Math.floor(mins / 60), m = mins % 60;
  return m ? `${h} hr ${m} min` : `${h} hr`;
}

/* ---------------- technician marker + popup ---------------- */
const TECH_COLOR = "#4F46E5";
const USER_GLYPH =
  '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/>' +
  '<path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>';
function technicianIcon(maps) {
  const B = 42, gs = 20 / 24;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<circle cx="${B / 2}" cy="${B / 2}" r="${B / 2 - 3}" fill="${TECH_COLOR}" stroke="#fff" stroke-width="3"/>` +
    `<g transform="translate(${B / 2},${B / 2}) scale(${gs}) translate(-12,-12)" fill="none" stroke="#fff" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round">${USER_GLYPH}</g>` +
    `</svg>`;
  return { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new maps.Size(B, B), anchor: new maps.Point(B / 2, B / 2) };
}
function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
function technicianPopupHtml(t) {
  const name = escapeHtml(t.technician_name || "Technician");
  const jt = jobTypeMeta(t.job_type);
  const siteLine = t.site_name ? `At ${escapeHtml(t.site_name)}` : (t.job_type ? jt.label : "Not on a job right now");
  const stage = t.step ? stepMeta(t.step).label : (t.job_type ? jt.label : "");
  const battery = t.battery != null ? ` · battery ${t.battery}%` : "";
  return (
    `<div style="font-family:system-ui,Arial,sans-serif;min-width:150px;padding:2px 4px 4px">` +
      `<div style="font-weight:800;color:#0f274a;font-size:14px">${name}</div>` +
      `<div style="color:#64748b;font-size:12px;margin-top:2px">${siteLine}</div>` +
      (stage ? `<div style="color:${TECH_COLOR};font-size:12px;font-weight:700;margin-top:4px">${escapeHtml(stage)}</div>` : "") +
      `<div style="color:#94a3b8;font-size:11px;margin-top:4px">Updated ${escapeHtml(agoText(t.age_sec))}${battery}</div>` +
    `</div>`
  );
}

/* ---------------- styles ---------------- */
const S = {
  page: { padding: "18px 22px" },
  title: { fontSize: 22, fontWeight: 800, color: "#0f274a" },
  sub: { color: "#64748b", fontSize: 13, margin: "4px 0 14px", lineHeight: 1.5 },
  mapBox: { position: "relative", height: 420, borderRadius: 14, overflow: "hidden", border: "1px solid #e2e8f0", background: "#eef2f7" },
  mapReal: { position: "absolute", inset: 0 },
  mapNote: { position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: 13, textAlign: "center", padding: 24 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, boxShadow: "0 2px 10px rgba(15,39,74,.05)", overflow: "hidden" },
  cardHead: { display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid #eef2f7" },
  cardTitle: { fontSize: 14, fontWeight: 800, color: "#0f274a" },
  pill: { marginLeft: "auto", fontSize: 11, fontWeight: 800, color: "#2e6cf5", background: "#eaf1ff", borderRadius: 999, padding: "3px 10px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 12, padding: 14 },
  jobCard: { border: "1px solid #eef2f7", borderRadius: 12, padding: 12, background: "#fff" },
  who: { fontWeight: 700, color: "#0f274a", fontSize: 14 },
  site: { color: "#64748b", fontSize: 12.5 },
  stageBar: { height: 6, borderRadius: 999, background: "#eef2f7", margin: "8px 0 6px", overflow: "hidden" },
  stageFill: { height: "100%", borderRadius: 999 },
  stageLab: { fontSize: 12, fontWeight: 700 },
  devChips: { display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, fontWeight: 700, borderRadius: 8, padding: "4px 8px" },
  meta: { color: "#94a3b8", fontSize: 11.5, marginTop: 6 },
  empty: { color: "#94a3b8", fontSize: 13, padding: "22px 16px", textAlign: "center" },
  badge: (bg, fg) => ({ fontSize: 11, fontWeight: 800, color: fg, background: bg, borderRadius: 999, padding: "2px 9px" }),
  // filters
  filterBar: { display: "flex", flexWrap: "wrap", gap: 10, padding: "12px 16px", borderBottom: "1px solid #eef2f7", alignItems: "flex-end" },
  field: { display: "flex", flexDirection: "column", gap: 4 },
  flab: { fontSize: 10.5, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".04em" },
  input: { height: 36, padding: "0 10px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13, color: "#0f274a", fontFamily: "inherit", background: "#fff", boxSizing: "border-box" },
  // table
  table: { width: "100%", borderCollapse: "collapse", fontSize: 12.5 },
  th: { textAlign: "left", padding: "10px 12px", color: "#94a3b8", fontWeight: 800, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", borderBottom: "1px solid #eef2f7", whiteSpace: "nowrap" },
  td: { padding: "10px 12px", color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
  pager: { display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", justifyContent: "flex-end" },
  pbtn: (disabled) => ({ height: 34, padding: "0 14px", borderRadius: 9, border: "1px solid #e2e8f0", background: disabled ? "#f1f5f9" : "#fff", color: disabled ? "#cbd5e1" : "#0f274a", fontWeight: 700, fontSize: 13, cursor: disabled ? "default" : "pointer", fontFamily: "inherit" }),
};

function DeviceChip({ d }) {
  const id = d.device_id || d.imei || "device";
  let bg = "#f1f5f9", fg = "#64748b", icon = "ti-plug-off", text = "No data";
  if (d.on && d.has_fix) { bg = "#dcfce7"; fg = "#15803d"; icon = "ti-satellite"; text = d.satellites != null ? `Fix · ${d.satellites} sats` : "GPS fix"; }
  else if (d.on) { bg = "#fef3c7"; fg = "#b45309"; icon = "ti-loader"; text = d.satellites != null ? `Acquiring · ${d.satellites} sats` : "Acquiring fix"; }
  return (
    <span style={{ ...S.chip, background: bg, color: fg }} title={id}>
      <i className={`ti ${icon}`} style={{ fontSize: 13 }} />
      <span style={{ fontWeight: 800 }}>{id}</span>
      <span style={{ opacity: .85 }}>· {text}</span>
    </span>
  );
}

function JobCard({ s }) {
  const jt = jobTypeMeta(s.job_type);
  const sm = stepMeta(s.step);
  const pct = Math.round((sm.idx / (sm.total - 1)) * 100);
  return (
    <div style={S.jobCard}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <span style={S.badge(jt.bg, jt.color)}>{jt.label}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8" }}>{agoText(s.step_age_sec)}</span>
      </div>
      <div style={{ marginTop: 6 }}>
        <span style={S.who}>{s.technician_name || "Technician"}</span>
      </div>
      <div style={S.site}>{s.site_name || (s.site_id ? `Site ${s.site_id}` : "No site yet")}</div>
      <div style={S.stageBar}><div style={{ ...S.stageFill, width: `${pct}%`, background: jt.color }} /></div>
      <div style={{ ...S.stageLab, color: jt.color }}>{sm.label}</div>
      {s.devices && s.devices.length > 0 && (
        <div style={S.devChips}>
          {s.devices.map((d, i) => <DeviceChip key={(d.device_id || d.imei || i) + ":" + i} d={d} />)}
        </div>
      )}
      <div style={S.meta}>Started {fmtTime(s.opened_at)}</div>
    </div>
  );
}

export default function InstallationControl() {
  // live feed
  const [live, setLive] = useState({ technicians: [], active: [] });
  const [liveLoaded, setLiveLoaded] = useState(false);
  const [liveErr, setLiveErr] = useState("");
  const [mapErr, setMapErr] = useState("");

  // completed search
  const [qInput, setQInput] = useState("");
  const [q, setQ] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [type, setType] = useState("all");
  const [outcome, setOutcome] = useState("all");
  const [page, setPage] = useState(1);
  const pageSize = 25;
  const [completed, setCompleted] = useState({ rows: [], total: 0 });
  const [compLoading, setCompLoading] = useState(true);
  const [compErr, setCompErr] = useState("");

  const mapRef = useRef(null);
  const gmap = useRef(null);
  const mapsApi = useRef(null);
  const techMarkers = useRef(new Map());
  const siteMarkers = useRef(new Map());
  const infoWin = useRef(null);
  const fitDone = useRef(false);

  // ---- poll the live feed ----
  useEffect(() => {
    let ok = true;
    async function poll() {
      try {
        const r = await fetch("/api/mainapp/admin/installation", { cache: "no-store" });
        if (!r.ok) { if (ok) setLiveErr(r.status === 403 ? "Admins only" : "Could not load live feed"); return; }
        const d = await r.json();
        if (!ok) return;
        setLiveErr("");
        setLive({ technicians: d.technicians || [], active: d.active || [] });
        setLiveLoaded(true);
      } catch { if (ok) setLiveErr("Network error"); }
    }
    poll();
    const id = setInterval(poll, 8000);
    return () => { ok = false; clearInterval(id); };
  }, []);

  // ---- debounce the search box into q (and reset to page 1) ----
  useEffect(() => {
    const t = setTimeout(() => { setQ(qInput); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  // ---- fetch completed whenever a filter or the page changes ----
  useEffect(() => {
    let ok = true;
    setCompLoading(true);
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    if (type !== "all") params.set("type", type);
    if (outcome !== "all") params.set("outcome", outcome);
    params.set("page", String(page));
    params.set("pageSize", String(pageSize));
    (async () => {
      try {
        const r = await fetch(`/api/mainapp/admin/installation/completed?${params.toString()}`, { cache: "no-store" });
        if (!r.ok) { if (ok) setCompErr(r.status === 403 ? "Admins only" : "Could not load"); return; }
        const d = await r.json();
        if (!ok) return;
        setCompErr("");
        setCompleted({ rows: d.rows || [], total: d.total || 0 });
      } catch { if (ok) setCompErr("Network error"); }
      finally { if (ok) setCompLoading(false); }
    })();
    return () => { ok = false; };
  }, [q, from, to, type, outcome, page]);

  // ---- init the map once ----
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchMapsConfig();
        if (!cfg.apiKey) { setMapErr("nokey"); return; }
        const maps = await loadGoogleMaps(cfg);
        if (cancelled || !mapRef.current) return;
        mapsApi.current = maps;
        gmap.current = new maps.Map(mapRef.current, {
          center: cfg.defaultCenter || { lat: -1.286389, lng: 36.817223 },
          zoom: cfg.defaultZoom || 7,
          mapTypeId: cfg.mapType || "roadmap",
          gestureHandling: "greedy",
          disableDefaultUI: true, zoomControl: true, fullscreenControl: true,
        });
      } catch (e) { setMapErr(e?.message || "Map failed to load."); }
    })();
    return () => { cancelled = true; };
  }, []);

  // ---- sync markers on live change (reused, not rebuilt) ----
  useEffect(() => {
    const maps = mapsApi.current, map = gmap.current;
    if (!maps || !map) return;
    if (!infoWin.current) infoWin.current = new maps.InfoWindow();
    const bounds = new maps.LatLngBounds();
    let any = false;

    const seenSites = new Set();
    for (const s of live.active) {
      if (s.site_lat == null || s.site_lng == null) continue;
      const key = String(s.id);
      seenSites.add(key);
      const pos = { lat: Number(s.site_lat), lng: Number(s.site_lng) };
      let m = siteMarkers.current.get(key);
      if (!m) { m = new maps.Marker({ map, position: pos, zIndex: 3 }); siteMarkers.current.set(key, m); }
      else m.setPosition(pos);
      m.setIcon(sitePinIcon(maps, jobTypeMeta(s.job_type).pin));
      m.setTitle(`${s.site_name || "Site"} — ${jobTypeMeta(s.job_type).label} · ${stepMeta(s.step).label}`);
      bounds.extend(pos); any = true;
    }
    for (const [key, m] of siteMarkers.current) if (!seenSites.has(key)) { m.setMap(null); siteMarkers.current.delete(key); }

    const seenTechs = new Set();
    for (const t of live.technicians) {
      if (t.lat == null || t.lng == null) continue;
      const key = String(t.technician_id);
      seenTechs.add(key);
      const pos = { lat: Number(t.lat), lng: Number(t.lng) };
      let m = techMarkers.current.get(key);
      if (!m) {
        m = new maps.Marker({ map, position: pos, icon: technicianIcon(maps), zIndex: 6, optimized: false });
        m.addListener("click", () => {
          const td = m.__t; if (!td) return;
          infoWin.current.setContent(technicianPopupHtml(td));
          infoWin.current.open({ map, anchor: m });
        });
        techMarkers.current.set(key, m);
      } else m.setPosition(pos);
      m.__t = t;
      m.setTitle(t.technician_name || "Technician");
      bounds.extend(pos); any = true;
    }
    for (const [key, m] of techMarkers.current) if (!seenTechs.has(key)) { m.setMap(null); techMarkers.current.delete(key); }

    if (any && !fitDone.current) {
      try { map.fitBounds(bounds); if (live.technicians.length + live.active.length === 1) map.setZoom(15); } catch {}
      fitDone.current = true;
    }
  }, [live]);

  const techCount = live.technicians.length;
  const activeCount = live.active.length;
  const totalPages = Math.max(1, Math.ceil(completed.total / pageSize));

  function resetFilters() {
    setQInput(""); setQ(""); setFrom(""); setTo(""); setType("all"); setOutcome("all"); setPage(1);
  }

  return (
    <div style={S.page}>
      <div style={S.title}>Installations & Maintenance</div>
      <div style={S.sub}>
        Live view of field work — where technicians are, the installs and maintenance jobs in progress and the
        stage each is at, and the full searchable history of completed jobs. During a job, each tracker shows
        whether it is on, has a GPS fix, and how many satellites it sees.
      </div>

      {liveErr && <div style={{ ...S.badge("#fee2e2", "#b91c1c"), display: "inline-block", marginBottom: 12 }}>{liveErr}</div>}

      {/* Map */}
      <div style={S.mapBox}>
        <div ref={mapRef} style={S.mapReal} />
        {mapErr && (
          <div style={S.mapNote}>
            {mapErr === "nokey"
              ? "No Google Maps key is configured (Admin → Google Maps). The lists below still work."
              : mapErr}
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: 10, margin: "10px 0 18px", alignItems: "center", flexWrap: "wrap" }}>
        <span style={S.badge("#dcfce7", "#15803d")}>{techCount} technician{techCount === 1 ? "" : "s"} active</span>
        <span style={S.badge("#eaf1ff", "#2e6cf5")}>{activeCount} job{activeCount === 1 ? "" : "s"} in progress</span>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "#64748b" }}>
          <span style={{ display: "inline-block", width: 11, height: 11, borderRadius: 999, background: TECH_COLOR, border: "2px solid #fff", boxShadow: "0 0 0 1px #cbd5e1" }} />
          technician (click for name)
        </span>
      </div>

      {/* In progress — all of them at once */}
      <div style={{ ...S.card, marginBottom: 18 }}>
        <div style={S.cardHead}>
          <i className="ti ti-tool" style={{ color: "#2e6cf5", fontSize: 18 }} />
          <span style={S.cardTitle}>In progress</span>
          <span style={S.pill}>{activeCount}</span>
        </div>
        {!liveLoaded ? (
          <div style={S.empty}>Loading…</div>
        ) : activeCount === 0 ? (
          <div style={S.empty}>No installs or maintenance jobs are in progress right now.</div>
        ) : (
          <div style={S.grid}>
            {live.active.map((s) => <JobCard key={s.id} s={s} />)}
          </div>
        )}
      </div>

      {/* Completed — searchable history */}
      <div style={S.card}>
        <div style={S.cardHead}>
          <i className="ti ti-history" style={{ color: "#15803d", fontSize: 18 }} />
          <span style={S.cardTitle}>Completed jobs</span>
          <span style={S.pill}>{completed.total}</span>
        </div>

        <div style={S.filterBar}>
          <div style={{ ...S.field, flex: "1 1 200px" }}>
            <span style={S.flab}>Search</span>
            <input style={S.input} value={qInput} onChange={(e) => setQInput(e.target.value)} placeholder="Technician, site or device…" />
          </div>
          <div style={S.field}>
            <span style={S.flab}>From</span>
            <input type="date" style={S.input} value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
          </div>
          <div style={S.field}>
            <span style={S.flab}>To</span>
            <input type="date" style={S.input} value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>
          <div style={S.field}>
            <span style={S.flab}>Type</span>
            <select style={S.input} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="install">Installation</option>
              <option value="maintain">Maintenance</option>
            </select>
          </div>
          <div style={S.field}>
            <span style={S.flab}>Outcome</span>
            <select style={S.input} value={outcome} onChange={(e) => { setOutcome(e.target.value); setPage(1); }}>
              <option value="all">All</option>
              <option value="passed">Passed</option>
              <option value="abandoned">Abandoned</option>
            </select>
          </div>
          <button style={S.pbtn(false)} onClick={resetFilters}>Reset</button>
        </div>

        {compErr && <div style={{ ...S.empty, color: "#b91c1c" }}>{compErr}</div>}

        <div style={{ overflowX: "auto" }}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>When</th>
                <th style={S.th}>Technician</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Site</th>
                <th style={S.th}>Device</th>
                <th style={S.th}>Outcome</th>
                <th style={S.th}>Duration</th>
                <th style={S.th}>Tests</th>
              </tr>
            </thead>
            <tbody>
              {compLoading ? (
                <tr><td style={{ ...S.td, textAlign: "center", color: "#94a3b8" }} colSpan={8}>Loading…</td></tr>
              ) : completed.rows.length === 0 ? (
                <tr><td style={{ ...S.td, textAlign: "center", color: "#94a3b8" }} colSpan={8}>No jobs match these filters.</td></tr>
              ) : completed.rows.map((c) => {
                const jt = jobTypeMeta(c.job_type);
                const passed = String(c.outcome) !== "abandoned";
                const dur = durationText(c.started_at, c.finished_at);
                const tests = Array.isArray(c.tests) ? c.tests : [];
                const passes = tests.filter((t) => t && (t.result === "pass" || t.result === "passed")).length;
                return (
                  <tr key={c.id}>
                    <td style={{ ...S.td, whiteSpace: "nowrap" }}>{fmtTime(c.finished_at || c.created_at)}</td>
                    <td style={{ ...S.td, fontWeight: 600, color: "#0f274a" }}>{c.technician_name || "—"}</td>
                    <td style={S.td}><span style={S.badge(jt.bg, jt.color)}>{jt.label}</span></td>
                    <td style={S.td}>{c.site_name || (c.site_id ? `Site ${c.site_id}` : "—")}</td>
                    <td style={S.td}>{c.device_id || "—"}</td>
                    <td style={S.td}><span style={S.badge(passed ? "#dcfce7" : "#fee2e2", passed ? "#15803d" : "#b91c1c")}>{passed ? "Passed" : "Abandoned"}</span></td>
                    <td style={{ ...S.td, whiteSpace: "nowrap" }}>{dur || "—"}</td>
                    <td style={S.td}>{tests.length ? `${passes}/${tests.length}` : "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={S.pager}>
          <span style={{ color: "#94a3b8", fontSize: 12.5, marginRight: "auto" }}>
            {completed.total} job{completed.total === 1 ? "" : "s"}
          </span>
          <button style={S.pbtn(page <= 1)} disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
          <span style={{ fontSize: 13, color: "#0f274a", fontWeight: 700 }}>Page {page} of {totalPages}</span>
          <button style={S.pbtn(page >= totalPages)} disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next</button>
        </div>
      </div>
    </div>
  );
}
