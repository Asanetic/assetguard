// app/mainapp/sitemaps/components/SitesMap.jsx
// Sites map — a faithful port of the prototype's assetguard_web_map_v5: a
// retractable sites drawer beside a full-height Google Map. Pins come from the
// database, coloured by status (shared icon used across every map). Clicking a
// pin (or a drawer card) opens the navy-header popup with a "View Site" button.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./sitesmap.module.css";
import { fetchMapsConfig, loadGoogleMaps, createWaveOverlay, sitePinIcon, siteStatusColor } from "../../lib/googleMaps.js";

function pillStyle(s) { const c = siteStatusColor(s); return { background: c + "22", color: c }; }

const FILTERS = [
  ["all", "All"], ["live", "Live"], ["testing", "Testing"], ["offline", "Offline"],
  ["inactive", "Inactive"], ["maintenance", "Maintenance"], ["smpms", "SMPMS"], ["pending", "Pending"],
];
const LEGEND = ["Live", "Testing", "Offline", "Inactive", "Maintenance", "SMPMS", "Pending"];

function coordsOf(s) {
  const lat = s.lat != null ? Number(s.lat) : null;
  const lng = s.lng != null ? Number(s.lng) : null;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

export default function SitesMap() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mapErr, setMapErr] = useState("");
  const [popup, setPopup] = useState(null); // the site whose popup is open

  const mapRef = useRef(null);
  const gmap = useRef(null);
  const markers = useRef({});
  const mapsApi = useRef(null);
  const overlayRef = useRef(null);
  const waveRef = useRef(null);
  const popupEl = useRef(null);
  const popupSite = useRef(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/mainapp/sites", { cache: "no-store" });
        const data = await res.json();
        if (alive) setSites(Array.isArray(data.sites) ? data.sites : []);
      } catch { /* keep empty */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return sites.filter((s) => {
      if (filter !== "all" && String(s.status || "Pending").toLowerCase() !== filter) return false;
      if (!term) return true;
      return (`${s.name} ${s.code} ${s.county || ""} ${s.location || ""} ${s.region || ""} ${s.security_region || ""}`).toLowerCase().includes(term);
    });
  }, [sites, q, filter]);

  const counts = useMemo(() => {
    const c = {};
    sites.forEach((s) => { const k = String(s.status || "Pending"); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [sites]);

  // init map
  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchMapsConfig();
        if (!cfg.apiKey) { setMapErr("nokey"); return; }
        const maps = await loadGoogleMaps(cfg);
        if (cancelled || !mapRef.current) return;
        mapsApi.current = maps;
        const map = new maps.Map(mapRef.current, {
          center: cfg.defaultCenter, zoom: Number(cfg.defaultZoom) || 7,
          mapTypeId: cfg.mapType || "roadmap", gestureHandling: "greedy",
          streetViewControl: false, fullscreenControl: false,
          mapTypeControl: true,
          mapTypeControlOptions: { style: maps.MapTypeControlStyle.HORIZONTAL_BAR, position: maps.ControlPosition.TOP_LEFT },
          zoomControl: true, zoomControlOptions: { position: maps.ControlPosition.LEFT_BOTTOM },
        });
        gmap.current = map;

        // an OverlayView gives us the pixel projection to place the custom popup
        const ov = new maps.OverlayView();
        ov.onAdd = () => {}; ov.onRemove = () => {};
        ov.draw = () => { reposition(); };
        ov.setMap(map);
        overlayRef.current = ov;
        waveRef.current = createWaveOverlay(maps, map, styles.wave);
        ["bounds_changed", "center_changed", "zoom_changed", "drag"].forEach((ev) =>
          map.addListener(ev, () => reposition()));

        drawMarkers();
      } catch (err) { setMapErr(err.message || "Map failed to load."); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => { if (gmap.current) drawMarkers(); /* eslint-disable-next-line */ }, [filtered]);

  // resize the map when the drawer retracts
  useEffect(() => {
    if (!gmap.current || !mapsApi.current) return;
    const c = gmap.current.getCenter();
    const t = setTimeout(() => { mapsApi.current.event.trigger(gmap.current, "resize"); if (c) gmap.current.setCenter(c); reposition(); }, 260);
    return () => clearTimeout(t);
  }, [collapsed]);

  function drawMarkers() {
    const maps = mapsApi.current, map = gmap.current;
    if (!maps || !map) return;
    Object.values(markers.current).forEach((m) => m.setMap(null));
    markers.current = {};
    const bounds = new maps.LatLngBounds();
    const livePts = [];
    let any = false;
    filtered.forEach((s) => {
      const pos = coordsOf(s);
      if (!pos) return;
      any = true; bounds.extend(pos);
      const mk = new maps.Marker({ map, position: pos, title: s.name, icon: sitePinIcon(maps, s.status), optimized: false });
      mk.addListener("click", () => openPopup(s));
      markers.current[s.id] = mk;
      if (String(s.status || "").toLowerCase() === "live") livePts.push(pos);
    });
    if (waveRef.current) waveRef.current.setPoints(livePts);
    if (any) map.fitBounds(bounds, 64);
  }

  // ---- custom popup ----
  function reposition() {
    const s = popupSite.current, ov = overlayRef.current, el = popupEl.current, maps = mapsApi.current;
    if (!s || !ov || !el || !maps) return;
    const proj = ov.getProjection(); if (!proj) return;
    const pos = coordsOf(s); if (!pos) return;
    const pt = proj.fromLatLngToContainerPixel(new maps.LatLng(pos.lat, pos.lng));
    if (!pt) return;
    el.style.left = Math.round(pt.x) + "px";
    el.style.top = Math.round(pt.y - 24) + "px";
  }

  function openPopup(s) {
    setSelected(s.id);
    popupSite.current = s;
    setPopup(s);
    const map = gmap.current;
    const pos = coordsOf(s);
    if (map && pos) {
      map.panTo(pos);
      if (map.getZoom() < 12) map.setZoom(13);
    }
    // place it after the DOM node exists / camera settles
    setTimeout(reposition, 0);
    if (mapsApi.current && map) mapsApi.current.event.addListenerOnce(map, "idle", reposition);
  }
  function closePopup() { popupSite.current = null; setPopup(null); }

  function clickCard(s) {
    if (coordsOf(s) && gmap.current) openPopup(s); else setSelected(s.id);
  }

  const visibleCount = filtered.length;
  const popRegion = popup ? (popup.security_region || popup.dist_region || popup.region || "—") : "";
  const popLoc = popup ? (popup.location || popup.county || "—") : "";

  return (
    <div className={styles.page}>
      <div className={`${styles.grid} ${collapsed ? styles.gridCollapsed : ""}`}>
        {/* drawer */}
        <div className={styles.drawer}>
          <div className={styles.drawerHead}>
            <div className={styles.titleRow}>
              <span className={styles.title}>Sites</span>
              <span className={styles.countBadge}>{visibleCount}</span>
            </div>
            <div className={styles.search}>
              <i className="ti ti-search" />
              <input className={styles.searchInput} placeholder="Search sites" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className={styles.chips}>
              {FILTERS.map(([key, label]) => (
                <button key={key} type="button" className={`${styles.chip} ${filter === key ? styles.chipOn : ""}`} onClick={() => setFilter(key)}>{label}</button>
              ))}
            </div>
          </div>
          <div className={styles.list}>
            {loading ? <div className={styles.emptyList}>Loading…</div>
              : filtered.length ? filtered.map((s) => {
                const pos = coordsOf(s);
                return (
                  <div key={s.id} className={`${styles.card} ${selected === s.id ? styles.cardOn : ""}`} onClick={() => clickCard(s)}>
                    <div className={styles.cardTop}>
                      <span className={styles.cardName}>{s.name}</span>
                      <span className={styles.b} style={pillStyle(s.status)}>{s.status || "Pending"}</span>
                    </div>
                    <div className={styles.cardSub}>{(s.location || s.county || "—")}, {(s.security_region || s.dist_region || s.region || "—")} — {s.devices || 0} devices · {s.code}</div>
                    {!pos ? <div className={styles.noCoord}><i className="ti ti-map-pin-off" />No coordinates</div> : null}
                  </div>
                );
              }) : <div className={styles.emptyList}>No sites match.</div>}
          </div>
        </div>

        {/* map */}
        <div className={styles.mapWrap}>
          <div ref={mapRef} className={styles.mapReal} />

          {/* custom popup (navy header + rows + View Site) */}
          {popup ? (
            <div ref={popupEl} className={styles.popup}>
              <div className={styles.popHead}>
                <button type="button" className={styles.popX} onClick={closePopup} aria-label="Close"><i className="ti ti-x" /></button>
                <div className={styles.popName}>{popup.name}</div>
                <div className={styles.popCode}>{popup.code} · {popRegion}</div>
              </div>
              <div className={styles.popBody}>
                <div className={styles.popRow}><span className={styles.popLbl}>Location</span><span className={styles.popVal}>{popLoc}</span></div>
                <div className={styles.popRow}><span className={styles.popLbl}>Devices</span><span className={styles.popVal}>{popup.devices || 0} registered</span></div>
                <div className={styles.popRow}><span className={styles.popLbl}>Status</span><span className={styles.popVal} style={{ color: siteStatusColor(popup.status) }}>{popup.status || "Pending"}</span></div>
                <button type="button" className={styles.popView} onClick={() => router.push(`/mainapp/sites/${popup.id}`)}>View Site</button>
              </div>
              <div className={styles.popTail} />
            </div>
          ) : null}

          {!mapErr ? (
            <div className={styles.legend}>
              {LEGEND.filter((s) => counts[s]).map((s) => (
                <span key={s} className={styles.leg}><span className={styles.dot} style={{ background: siteStatusColor(s) }} />{counts[s]} {s}</span>
              ))}
            </div>
          ) : null}
          {mapErr === "nokey" ? (
            <div className={styles.mapOverlay}>
              <i className="ti ti-map-2" />
              <div>No Google Maps key found.<br />Set one in <a href="/mainapp/admin/maps">Admin → Google Maps</a> or add <code>GOOGLE_MAPS_API_KEY</code> to your .env.</div>
            </div>
          ) : mapErr ? (
            <div className={styles.mapOverlay}><i className="ti ti-alert-triangle" /><div>{mapErr}</div></div>
          ) : null}
        </div>
      </div>

      <button type="button" className={styles.handle} style={{ left: collapsed ? 0 : 320 }}
        onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Show sites" : "Hide sites"}>
        <i className={collapsed ? "ti ti-chevron-right" : "ti ti-chevron-left"} />
      </button>
    </div>
  );
}
