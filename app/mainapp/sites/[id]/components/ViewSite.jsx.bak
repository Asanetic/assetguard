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
import { fetchMapsConfig, loadGoogleMaps, sitePinIcon } from "../../../lib/googleMaps.js";

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
    return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
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

export default function ViewSite({ id }) {
  const router = useRouter();
  const [site, setSite] = useState(null);
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
        if (alive) { setSite(data.site || null); setLoading(false); }
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
          mapTypeControlOptions: { style: maps.MapTypeControlStyle.HORIZONTAL_BAR, position: maps.ControlPosition.BOTTOM_LEFT },
        });
        new maps.Marker({ position: coords, map, title: site.name, icon: sitePinIcon(maps, site.status) });
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
          Installed devices <span className={styles.count}>{site.devices ?? 0}</span>
          <button className={styles.link} onClick={() => router.push("/mainapp/devices")}>View all devices</button>
        </div>
        <div className={styles.empty}>
          {site.devices ? `${site.devices} device(s) registered — the per-site device list appears here once the Devices module is connected.`
                         : "No devices registered to this site yet."}
        </div>
      </div>

      {/* recent activity */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.chip} style={{ background: "#e0f2fe", color: "#0284c7" }}><i className="ti ti-history" /></span>
          Recent activity
          <button className={styles.link} onClick={() => router.push("/mainapp/admin/audit")}>Open audit log</button>
        </div>
        <div className={styles.empty}>No recent activity recorded for this site yet.</div>
      </div>

      {/* photos */}
      <div className={styles.sec}>
        <div className={styles.sech}>
          <span className={styles.chip} style={{ background: "#ede9fe", color: "#7c3aed" }}><i className="ti ti-photo" /></span>
          Site photos
        </div>
        <div className={styles.empty}>No photos uploaded yet.</div>
      </div>
    </div>
  );
}
