// app/mainapp/sites/[id]/components/ViewSite.jsx
// View site — the site landing/detail page, ported from the prototype's
// assetguard_web_view_site_v2 and given a REAL Google Map (via the shared maps
// loader). Header + status, a live map centred on the site, the Site details
// grid, and the Installed devices / Recent activity / Photos sections.
//
// Site data is real (GET /api/mainapp/sites/:id). Devices/activity/photos aren't
// wired to a backend yet, so those sections show honest empty states.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./viewsite.module.css";
import { fetchMapsConfig, loadGoogleMaps, sitePinIcon, createWaveOverlay } from "../../../lib/googleMaps.js";

// Status pill colours (prototype agStatusColour).
const STATUS = {
  live: ["#d1fae5", "#065f46", "#059669"],
  testing: ["#dbeafe", "#1e40af", "#2563eb"],
  maintenance: ["#fef3c7", "#92400e", "#d97706"],
  smpms: ["#ede9fe", "#5b21b6", "#7c3aed"],
  pending: ["#f1f5f9", "#475569", "#94a3b8"],
  offline: ["#fee2e2", "#991b1b", "#dc2626"],
  inactive: ["#f1f5f9", "#64748b", "#94a3b8"],
};
function statusColour(s) { return STATUS[String(s || "pending").toLowerCase()] || STATUS.pending; }

function fmtDate(v) {
  if (!v) return "—";
  try {
    const d = new Date(v);
    if (isNaN(d)) return String(v);
    return d.toLocaleDateString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", year: "numeric" });
  } catch { return String(v); }
}

function Detail({ label, value, sub }) {
  return (
    <div>
      <div className={styles.dl}>{label}</div>
      <div className={styles.dv}>{value || "—"}{sub ? <div className={styles.dvSub}>{sub}</div> : null}</div>
    </div>
  );
}

const ST_COLORS = { live: "#10B981", offline: "#EF4444", testing: "#F59E0B", inactive: "#8B5CF6", maintenance: "#0EA5E9" };
const stColor = (s) => ST_COLORS[String(s || "").toLowerCase()] || "#64748B";
const SEV = { Critical: "#EF4444", High: "#F59E0B", Medium: "#2E6CF5", Low: "#94A3B8" };
const sevColor = (p) => SEV[p] || "#94A3B8";
function relAgo(v) {
  if (!v) return "never";
  const s = Math.max(0, (Date.now() - new Date(v).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}
function fmtEATshort(v) {
  if (!v) return "";
  try { return new Date(v).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) + " EAT"; }
  catch { return ""; }
}
const rowCard = { display: "flex", alignItems: "center", gap: 11, width: "100%", textAlign: "left", background: "#fff", border: "1px solid #eef2f7", borderRadius: 10, padding: "10px 13px", cursor: "pointer", fontFamily: "inherit" };

export default function ViewSite({ id }) {
  const router = useRouter();
  const [site, setSite] = useState(null);
  const [devices, setDevices] = useState([]);
  const [activity, setActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mapState, setMapState] = useState({ status: "idle", msg: "" }); // idle|ok|nokey|noloc|error
  const mapRef = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/mainapp/sites/${id}`, { cache: "no-store" });
        if (res.status === 404) { if (alive) { setNotFound(true); setLoading(false); } return; }
        const data = await res.json();
        if (alive) {
          setSite(data.site || null);
          setDevices(Array.isArray(data.devices) ? data.devices : []);
          setActivity(Array.isArray(data.activity) ? data.activity : []);
          setLoading(false);
        }
      } catch { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [id]);

  // Coordinates: prefer the numeric columns, fall back to details.coordinates.
  const coords = (() => {
    if (!site) return null;
    let lat = site.lat != null ? Number(site.lat) : null;
    let lng = site.lng != null ? Number(site.lng) : null;
    if ((lat == null || lng == null || isNaN(lat) || isNaN(lng)) && site.details?.coordinates) {
      const p = String(site.details.coordinates).split(",");
      if (p.length === 2) { lat = Number(p[0]); lng = Number(p[1]); }
    }
    return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
  })();

  // Load the real map once the site (and coords) are known.
  useEffect(() => {
    if (!site) return;
    if (!coords) { setMapState({ status: "noloc", msg: "No coordinates recorded for this site." }); return; }
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchMapsConfig();
        if (!cfg.apiKey) { if (!cancelled) setMapState({ status: "nokey", msg: "nokey" }); return; }
        const maps = await loadGoogleMaps(cfg);
        if (cancelled || !mapRef.current) return;
        const map = new maps.Map(mapRef.current, {
          center: coords, zoom: 15,
          mapTypeId: cfg.mapType || "roadmap", streetViewControl: false, fullscreenControl: true,
          mapTypeControl: true,
          // Map / Satellite toggle to the TOP-RIGHT so it never overlaps the
          // coordinates chip (bottom-left).
          mapTypeControlOptions: { style: maps.MapTypeControlStyle.HORIZONTAL_BAR, position: maps.ControlPosition.TOP_RIGHT },
          // +/- zoom buttons, bottom-right (clear of the coordinates chip).
          zoomControl: true,
          zoomControlOptions: { position: maps.ControlPosition.RIGHT_BOTTOM },
        });
        new maps.Marker({ position: coords, map, title: site.name, icon: sitePinIcon(maps, site.status) });
        // Live site → transmitting waves pulsing around the marker.
        if (String(site.status || "").toLowerCase() === "live") {
          try {
            const wave = createWaveOverlay(maps, map, styles.wave);
            wave.setPoints([{ lat: coords.lat, lng: coords.lng, color: "#10b981" }]);
          } catch {}
        }
        // ensure it renders at the right size after mount
        maps.event.trigger(map, "resize");
        map.setCenter(coords);
        setMapState({ status: "ok", msg: "" });
      } catch (err) {
        if (!cancelled) setMapState({ status: "error", msg: err.message || "Map failed to load." });
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site]);

  if (loading) return <div className={styles.page}><div className={styles.loading}>Loading site…</div></div>;
  if (notFound || !site) return (
    <div className={styles.page}>
      <div className={styles.head}>
        <button className={styles.back} onClick={() => router.push("/mainapp/sites")} aria-label="Back"><i className="ti ti-arrow-left" /></button>
        <div className={styles.title}>Site not found</div>
      </div>
      <div className={styles.empty}>That site doesn’t exist or was removed.</div>
    </div>
  );

  const d = site.details || {};
  const sc = statusColour(site.status);
  const region = site.region || site.security_region || d.securityRegion || "—";
  const location = site.location || site.county || d.county || "—";
  const company = d.company || {};
  const manager = company.manager || {};

  return (
    <div className={styles.page}>
      {/* header */}
      <div className={styles.head}>
        <button className={styles.back} onClick={() => router.push("/mainapp/sites")} aria-label="Back to all sites">
          <i className="ti ti-arrow-left" />
        </button>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.title}>{site.name}</span>
            <span className={styles.statusPill} style={{ background: sc[0], color: sc[1] }}>
              <span className={styles.dot} style={{ background: sc[2] }} />{site.status || "Pending"}
            </span>
          </div>
          <div className={styles.sub}>{site.code} · {region} region · {location}</div>
        </div>
        <div className={styles.headActions}>
          <button className={styles.editBtn} onClick={() => router.push(`/mainapp/sites/add?edit=${site.id}`)}>
            <i className="ti ti-pencil" />Edit site
          </button>
        </div>
      </div>

      {/* map — one stable element the loader draws into; the placeholder overlays until it's ready */}
      <div className={styles.mapBox}>
        <div ref={mapRef} className={styles.mapReal} />
        {mapState.status !== "ok" ? (
          <>
            <svg className={styles.mapSvg} viewBox="0 0 900 300" preserveAspectRatio="none" aria-hidden="true">
              <rect width="900" height="300" fill="#eaf1e6" />
              <path d="M0 110 C200 90 430 130 900 100" stroke="#fff" strokeWidth="5" fill="none" />
              <path d="M220 0 C260 110 300 220 280 300" stroke="#fff" strokeWidth="4" fill="none" />
              <path d="M0 230 C300 205 600 250 900 220" stroke="#f1e9d2" strokeWidth="4" fill="none" />
            </svg>
            <div className={styles.pin}><i className="ti ti-map-pin" /></div>
          </>
        ) : null}
        {coords ? (
          <span className={styles.coordBadge}>
            <i className="ti ti-current-location" />{coords.lat.toFixed(4)}, {coords.lng.toFixed(4)}
          </span>
        ) : null}
        {mapState.status === "nokey" ? (
          <div className={styles.mapMsg}>Set a Google Maps key in <a href="/mainapp/admin/maps">Admin → Google Maps</a> to see a live map.</div>
        ) : mapState.status === "noloc" ? (
          <div className={styles.mapMsg}>No coordinates recorded for this site.</div>
        ) : mapState.status === "error" ? (
          <div className={styles.mapMsg}>{mapState.msg}</div>
        ) : null}
      </div>

      {/* site details */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.chip} style={{ background: "#dbe7fe", color: "#2e6cf5" }}><i className="ti ti-info-circle" /></span>
          Site details
        </div>
        <div className={styles.dgrid}>
          <Detail label="SITE ID" value={site.code} />
          <Detail label="COUNTRY" value={site.country || d.country || "Kenya"} />
          <Detail label="DISTRIBUTION REGION" value={site.dist_region || d.distRegion} />
          <Detail label="SECURITY REGION" value={site.security_region || d.securityRegion} />
          <Detail label="COUNTY" value={site.county || d.county} />
          <Detail label="RESPONSE CLUSTER" value={site.response_cluster || d.responseCluster} />
          <Detail label="COMPANY" value={company.name || "Symphony Technologies Limited"} />
          <Detail label="MANAGER" value={manager.name} sub={manager.phones ? (Array.isArray(manager.phones) ? manager.phones[0] : manager.phones) : null} />
          <Detail label="SECURITY COMPANY" value={site.security_company || d.securityCompany?.company} />
          <Detail label="MONITORING COMPANY" value={site.monitoring_company || d.noc?.monitoringCompany} />
          <Detail label="SMPMS VENDOR" value={site.smpms_vendor} />
          <Detail label="DEVICES" value={String(site.devices ?? 0)} />
          <Detail label="STATUS" value={site.status || "Pending"} />
          <Detail label="REGISTERED" value={fmtDate(site.created_at)} />
        </div>
      </div>

      {/* installed devices */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.chip} style={{ background: "#fef3c7", color: "#b45309" }}><i className="ti ti-cpu" /></span>
          Installed devices <span className={styles.count}>{devices.length}</span>
          <button className={styles.link} onClick={() => router.push("/mainapp/devices")}>View all devices</button>
        </div>
        {devices.length === 0 ? (
          <div className={styles.empty}>No devices registered to this site yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {devices.map((d) => {
              const c = stColor(d.status);
              const batt = d.battery;
              const bColor = batt == null ? "#94a3b8" : batt <= 10 ? "#ef4444" : batt <= 20 ? "#f59e0b" : "#10b981";
              return (
                <button key={d.id} style={rowCard} onClick={() => router.push(`/mainapp/devices/view?device=${encodeURIComponent(d.device_id || d.imei)}`)}>
                  <span style={{ width: 10, height: 10, borderRadius: 3, background: c, flex: "none" }} />
                  <span style={{ fontWeight: 800, color: "#0f274a" }}>{d.device_id || d.imei}</span>
                  <span style={{ color: c, fontSize: 12, fontWeight: 700 }}>{d.status || "—"}</span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 16, alignItems: "center", color: "#64748b", fontSize: 12.5, whiteSpace: "nowrap" }}>
                    <span style={{ color: bColor, fontWeight: 700 }}><i className="ti ti-battery-2" style={{ marginRight: 3 }} />{batt != null ? `${batt}%` : "—"}</span>
                    <span>seen {relAgo(d.last_seen)}</span>
                    <i className="ti ti-chevron-right" style={{ color: "#cbd5e1" }} />
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* recent activity */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.chip} style={{ background: "#e0f2fe", color: "#0284c7" }}><i className="ti ti-history" /></span>
          Recent activity
          <button className={styles.link} onClick={() => router.push("/mainapp/alarms")}>All alarms</button>
        </div>
        {activity.length === 0 ? (
          <div className={styles.empty}>No recent activity recorded for this site yet.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {activity.map((a) => {
              const c = sevColor(a.priority);
              const closed = String(a.status || "").toLowerCase() === "closed";
              return (
                <button key={a.id} style={rowCard} onClick={() => router.push(`/mainapp/alarms/${encodeURIComponent(a.id)}`)}>
                  <span style={{ width: 30, height: 30, borderRadius: 8, background: `${c}1a`, color: c, display: "grid", placeItems: "center", flex: "none" }}><i className="ti ti-alert-triangle" style={{ fontSize: 15 }} /></span>
                  <span style={{ minWidth: 0 }}>
                    <span style={{ display: "block", fontWeight: 700, color: "#0f274a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.name}</span>
                    <span style={{ display: "block", fontSize: 11.5, color: "#94a3b8" }}>{a.device_id || ""} · {fmtEATshort(a.created_at)}</span>
                  </span>
                  <span style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center", flex: "none" }}>
                    <span style={{ fontSize: 11, fontWeight: 800, color: c }}>{a.priority}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: closed ? "#047857" : "#b45309", background: closed ? "#d1fae5" : "#fef3c7", borderRadius: 999, padding: "2px 9px" }}>{closed ? "Closed" : (a.status || "Open")}</span>
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* photos — installation photos of the site's devices */}
      {(() => {
        const shots = [];
        for (const d of devices) {
          const p = d.config?.install_photo;
          if (p) shots.push({ id: d.id, label: d.device_id || d.imei, src: /^data:|^https?:/.test(String(p)) ? p : null, name: String(p) });
        }
        const sitePhotos = Array.isArray(site.details?.photos) ? site.details.photos : [];
        for (let i = 0; i < sitePhotos.length; i++) { const p = sitePhotos[i]; shots.push({ id: `s${i}`, label: "Site photo", src: /^data:|^https?:/.test(String(p)) ? p : null, name: String(p) }); }
        return (
          <div className={styles.sec}>
            <div className={styles.sech}>
              <span className={styles.chip} style={{ background: "#ede9fe", color: "#7c3aed" }}><i className="ti ti-photo" /></span>
              Site photos <span className={styles.count}>{shots.length}</span>
            </div>
            {shots.length === 0 ? (
              <div className={styles.empty}>No photos uploaded yet.</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
                {shots.map((s) => (
                  <div key={s.id} style={{ border: "1px solid #eef2f7", borderRadius: 12, overflow: "hidden", background: "#fff" }}>
                    <div style={{ aspectRatio: "4/3", background: "#f1f5f9", display: "grid", placeItems: "center", overflow: "hidden" }}>
                      {s.src ? <img src={s.src} alt={s.label} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                             : <i className="ti ti-camera" style={{ fontSize: 30, color: "#cbd5e1" }} />}
                    </div>
                    <div style={{ padding: "8px 10px", fontSize: 12 }}>
                      <div style={{ fontWeight: 700, color: "#0f274a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.label}</div>
                      <div style={{ color: "#94a3b8", fontSize: 11, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{s.src ? "" : s.name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })()}
    </div>
  );
}
