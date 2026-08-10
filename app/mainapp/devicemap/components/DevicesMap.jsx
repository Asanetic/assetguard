// app/mainapp/devicemap/components/DevicesMap.jsx
// Devices map — a faithful port of the prototype's devices-map view: a
// retractable devices drawer beside a full-height Google Map. Devices are
// grouped per site. A site with more than one device shows a single status-
// striped cluster chip with a count badge; clicking it EXPLODES the devices
// into a fanned ring around the pole (spread in screen pixels, so devices that
// share the exact same coordinates — mounted on the same pole — always separate
// at any zoom) with a navy "×" button to collapse. Clicking any individual pin
// opens the navy-header details popup (IMEI · Speed · Orientation · Last Seen ·
// Battery · Data bundle left).
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./devicesmap.module.css";
import {
  fetchMapsConfig, loadGoogleMaps, createWaveOverlay,
  devicePinIcon, deviceClusterIcon, collapsePinIcon, deviceStatusColor, DEVICE_STATUS_ORDER,
} from "../../lib/googleMaps.js";

const FAN_PX = 36;          // ring radius (screen px) when a same-pole cluster explodes
const FAN_GEO = 0.0004;     // fallback geographic offset if the projection isn't ready yet

const FILTERS = [["All", "All"], ["Live", "Live"], ["Offline", "Offline"], ["Testing", "Testing"], ["Inactive", "Inactive"], ["Maintenance", "Maintenance"]];

function pill(s) { const c = deviceStatusColor(s); return { background: c + "1A", color: c }; }
function battColor(b) { return Number(b) < 20 ? "#DC2626" : "#059669"; }

function coordsOf(d) {
  const lat = d.site_lat != null ? Number(d.site_lat) : null;
  const lng = d.site_lng != null ? Number(d.site_lng) : null;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function relTime(v) {
  if (!v) return "—";
  const t = new Date(v).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr${h > 1 ? "s" : ""} ago`;
  const dd = Math.round(h / 24); return `${dd} day${dd > 1 ? "s" : ""} ago`;
}
function speedOf(d) {
  if (d.speed != null && d.speed !== "") return `${d.speed} km/h`;
  return String(d.status) === "Live" ? "0 km/h" : "—";
}

export default function DevicesMap() {
  const router = useRouter();
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mapErr, setMapErr] = useState("");
  const [popup, setPopup] = useState(null);
  const [toast, setToast] = useState("");
  const [expanded, setExpanded] = useState(() => new Set()); // site codes currently exploded

  const mapRef = useRef(null);
  const gmap = useRef(null);
  const markers = useRef([]);
  const mapsApi = useRef(null);
  const overlayRef = useRef(null);
  const waveRef = useRef(null);
  const popupEl = useRef(null);
  const posRef = useRef({});          // device id -> current {lat,lng} on the map
  const popupIdRef = useRef(null);    // device id whose popup is open
  const pendingPopupRef = useRef(null);
  const drawRef = useRef(() => {});
  const repositionRef = useRef(() => {});
  const closeRef = useRef(() => {});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/mainapp/devices", { cache: "no-store" });
        const data = await res.json();
        if (alive) setDevices(Array.isArray(data.devices) ? data.devices : []);
      } catch { /* keep empty */ }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return devices.filter((d) => {
      if (filter !== "All" && String(d.status) !== filter) return false;
      if (!term) return true;
      return (`${d.device_id} ${d.imei || ""} ${d.site || ""} ${d.site_code || ""}`).toLowerCase().includes(term);
    });
  }, [devices, q, filter]);

  const counts = useMemo(() => {
    const c = {};
    devices.forEach((d) => { const k = String(d.status || "Live"); c[k] = (c[k] || 0) + 1; });
    return c;
  }, [devices]);

  // group the currently-visible, geocoded devices by site.
  const groups = useMemo(() => {
    const g = {};
    filtered.forEach((d) => { const p = coordsOf(d); if (!p) return; (g[d.site_code] = g[d.site_code] || []).push(d); });
    return g;
  }, [filtered]);

  function toggleExpand(code) {
    setExpanded((prev) => { const n = new Set(prev); n.has(code) ? n.delete(code) : n.add(code); return n; });
  }

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

        const ov = new maps.OverlayView();
        ov.onAdd = () => {}; ov.onRemove = () => {};
        ov.draw = () => { repositionRef.current(); };
        ov.setMap(map);
        overlayRef.current = ov;
        waveRef.current = createWaveOverlay(maps, map, styles.wave);

        ["center_changed", "drag"].forEach((ev) => map.addListener(ev, () => repositionRef.current()));
        // on zoom the pixel-fan changes: redraw the exploded pins and re-anchor the popup.
        map.addListener("zoom_changed", () => { drawRef.current(); repositionRef.current(); });
        map.addListener("click", () => closeRef.current());

        drawRef.current(true);
      } catch (err) { setMapErr(err.message || "Map failed to load."); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // redraw whenever the visible groups or the exploded set change; then flush any
  // pending popup (e.g. a drawer card that had to explode its cluster first).
  useEffect(() => {
    if (!gmap.current) return;
    drawMarkers();
    if (pendingPopupRef.current) {
      const id = pendingPopupRef.current; pendingPopupRef.current = null;
      const d = devices.find((x) => x.id === id);
      if (d) setTimeout(() => openPopup(d), 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups, expanded]);

  // resize the map when the drawer retracts
  useEffect(() => {
    if (!gmap.current || !mapsApi.current) return;
    const c = gmap.current.getCenter();
    const t = setTimeout(() => { mapsApi.current.event.trigger(gmap.current, "resize"); if (c) gmap.current.setCenter(c); repositionRef.current(); }, 260);
    return () => clearTimeout(t);
  }, [collapsed]);

  // fan positions for an exploded pole — spread in SCREEN pixels so identical
  // coordinates always separate, converted back to lat/lng at the current zoom.
  function fanPositions(center, n) {
    const maps = mapsApi.current, ov = overlayRef.current;
    const proj = ov && ov.getProjection();
    const out = [];
    if (proj) {
      const c = proj.fromLatLngToContainerPixel(new maps.LatLng(center.lat, center.lng));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        const pt = new maps.Point(c.x + Math.cos(a) * FAN_PX, c.y + Math.sin(a) * FAN_PX);
        const ll = proj.fromContainerPixelToLatLng(pt);
        out.push({ lat: ll.lat(), lng: ll.lng() });
      }
    } else {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 2 * Math.PI - Math.PI / 2;
        out.push({ lat: center.lat + Math.sin(a) * FAN_GEO * 0.7, lng: center.lng + Math.cos(a) * FAN_GEO });
      }
    }
    return out;
  }

  function drawMarkers(fit) {
    const maps = mapsApi.current, map = gmap.current;
    if (!maps || !map) return;
    markers.current.forEach((m) => m.setMap(null));
    markers.current = [];
    posRef.current = {};
    const bounds = new maps.LatLngBounds();
    const livePts = [];
    let any = false;

    Object.entries(groups).forEach(([code, list]) => {
      const center = coordsOf(list[0]);
      if (!center) return;
      any = true; bounds.extend(center);

      if (list.length === 1) {
        const d = list[0];
        posRef.current[d.id] = center;
        const mk = new maps.Marker({ map, position: center, title: d.device_id, icon: devicePinIcon(maps, d.status), optimized: false });
        mk.addListener("click", () => openPopup(d));
        markers.current.push(mk);
        if (String(d.status) === "Live") livePts.push(center);
      } else if (!expanded.has(code)) {
        // collapsed cluster — explode IN PLACE on click (no camera move), like the prototype
        const mk = new maps.Marker({ map, position: center, title: `${list.length} devices — click to expand`, icon: deviceClusterIcon(maps, list), optimized: false, zIndex: 20 });
        mk.addListener("click", () => toggleExpand(code));
        markers.current.push(mk);
        if (list.every((d) => String(d.status) === "Live")) livePts.push(center);
      } else {
        const fan = fanPositions(center, list.length);
        list.forEach((d, i) => {
          const pos = fan[i] || center;
          posRef.current[d.id] = pos;
          const mk = new maps.Marker({ map, position: pos, title: d.device_id, icon: devicePinIcon(maps, d.status), optimized: false, zIndex: 30 });
          mk.addListener("click", () => openPopup(d));
          markers.current.push(mk);
          if (String(d.status) === "Live") livePts.push(pos);
        });
        // navy "×" collapse control at the pole centre
        const cx = new maps.Marker({ map, position: center, title: "Collapse", icon: collapsePinIcon(maps), optimized: false, zIndex: 40 });
        cx.addListener("click", () => { closeRef.current(); toggleExpand(code); });
        markers.current.push(cx);
      }
    });
    if (waveRef.current) waveRef.current.setPoints(livePts);
    if (fit && any) map.fitBounds(bounds, 72);
  }

  // ---- custom popup ----
  function reposition() {
    const ov = overlayRef.current, el = popupEl.current, maps = mapsApi.current;
    const id = popupIdRef.current;
    if (!ov || !el || !maps || id == null) return;
    const p = posRef.current[id];
    if (!p) return;
    const proj = ov.getProjection(); if (!proj) return;
    const pt = proj.fromLatLngToContainerPixel(new maps.LatLng(p.lat, p.lng));
    if (!pt) return;
    el.style.left = Math.round(pt.x) + "px";
    el.style.top = Math.round(pt.y - 24) + "px";
  }

  function openPopup(d) {
    setSelected(d.id);
    popupIdRef.current = d.id;
    setPopup(d);
    setTimeout(reposition, 0);
    const map = gmap.current;
    if (mapsApi.current && map) mapsApi.current.event.addListenerOnce(map, "idle", () => repositionRef.current());
  }
  function closePopup() { popupIdRef.current = null; setPopup(null); }

  function clickCard(d) {
    const c = coordsOf(d), map = gmap.current;
    if (!c || !map) { setSelected(d.id); return; }
    map.panTo(c);
    const list = groups[d.site_code] || [];
    if (list.length > 1 && !expanded.has(d.site_code)) {
      // explode the pole first, then open this device's popup once redrawn
      pendingPopupRef.current = d.id;
      setExpanded((prev) => new Set(prev).add(d.site_code));
    } else {
      openPopup(d);
    }
  }

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  // keep the map-event callbacks pointed at the latest closures
  drawRef.current = drawMarkers;
  repositionRef.current = reposition;
  closeRef.current = closePopup;

  const visibleCount = filtered.length;
  const popSite = popup ? `${popup.site || "—"} · ${popup.site_code || ""}` : "";

  return (
    <div className={styles.page}>
      <div className={`${styles.grid} ${collapsed ? styles.gridCollapsed : ""}`}>
        {/* drawer */}
        <div className={styles.drawer}>
          <div className={styles.drawerHead}>
            <div className={styles.titleRow}>
              <span className={styles.title}>Devices</span>
              <span className={styles.countBadge}>{visibleCount}</span>
            </div>
            <div className={styles.search}>
              <i className="ti ti-search" />
              <input className={styles.searchInput} placeholder="Search devices" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className={styles.chips}>
              {FILTERS.map(([key, label]) => (
                <button key={key} type="button" className={`${styles.chip} ${filter === key ? styles.chipOn : ""}`} onClick={() => setFilter(key)}>{label}</button>
              ))}
            </div>
          </div>
          <div className={styles.list}>
            {loading ? <div className={styles.emptyList}>Loading…</div>
              : filtered.length ? filtered.map((d) => (
                <div key={d.id} className={`${styles.card} ${selected === d.id ? styles.cardOn : ""}`} onClick={() => clickCard(d)}>
                  <div className={styles.cardTop}>
                    <span className={styles.cardName}>{d.device_id}</span>
                    <span className={styles.ori} title={d.orientation}>{String(d.orientation || "").charAt(0).toUpperCase() || "—"}</span>
                    <span className={styles.b} style={pill(d.status)}>{d.status}</span>
                  </div>
                  <div className={styles.cardSite}>{d.site || "—"}</div>
                  <div className={styles.cardImei}>{d.imei}</div>
                  <div className={styles.meters}>
                    <span className={styles.meter} style={{ background: battColor(d.battery) + "14", color: battColor(d.battery) }}>
                      <i className="ti ti-battery-2" />{d.battery}%
                    </span>
                    <span className={styles.meter} style={{ background: "#f1f5f9", color: "#475569" }}>
                      <i className="ti ti-antenna-bars-5" />{d.data_left || "—"}
                    </span>
                  </div>
                </div>
              )) : <div className={styles.emptyList}>No devices match.</div>}
          </div>
        </div>

        {/* map */}
        <div className={styles.mapWrap}>
          <div ref={mapRef} className={styles.mapReal} />

          {popup ? (
            <div ref={popupEl} className={styles.popup}>
              <div className={styles.popHead}>
                <button type="button" className={styles.popX} onClick={closePopup} aria-label="Close"><i className="ti ti-x" /></button>
                <div className={styles.popName}>{popup.device_id}</div>
                <div className={styles.popSite}>{popSite}</div>
              </div>
              <div className={styles.popBody}>
                <div className={styles.popRow}><span className={styles.popLbl}>IMEI</span><span className={styles.popVal}>{popup.imei}</span></div>
                <div className={styles.popRow}><span className={styles.popLbl}>Speed</span><span className={styles.popVal}>{speedOf(popup)}</span></div>
                <div className={styles.popRow}><span className={styles.popLbl}>Orientation</span><span className={styles.popVal}>{popup.orientation || "—"}</span></div>
                <div className={styles.popRow}><span className={styles.popLbl}>Last Seen</span><span className={styles.popVal}>{relTime(popup.last_seen)}</span></div>
                <div className={styles.popRow}><span className={styles.popLbl}>Battery</span><span className={styles.popVal} style={{ color: battColor(popup.battery) }}>{popup.battery}%</span></div>
                <div className={styles.popRow}><span className={styles.popLbl}>Data bundle left</span><span className={styles.popVal} style={{ color: "#475569" }}>{popup.data_left || "—"}</span></div>
                <div className={styles.popActions}>
                  <button type="button" className={styles.popView} onClick={() => flash("Device detail page is coming soon.")}>View</button>
                  <button type="button" className={styles.popTrack} onClick={() => router.push(`/mainapp/track?device=${encodeURIComponent(popup.device_id)}`)}>Track Device</button>
                </div>
              </div>
              <div className={styles.popTail} />
            </div>
          ) : null}

          {!mapErr ? (
            <div className={styles.legend}>
              {DEVICE_STATUS_ORDER.filter((s) => counts[s]).map((s) => (
                <span key={s} className={styles.leg}><span className={styles.dot} style={{ background: deviceStatusColor(s) }} />{counts[s]} {s}</span>
              ))}
            </div>
          ) : null}
          {mapErr === "nokey" ? (
            <div className={styles.mapOverlay}>
              <i className="ti ti-cpu" />
              <div>No Google Maps key found.<br />Set one in <a href="/mainapp/admin/maps">Admin → Google Maps</a> or add <code>GOOGLE_MAPS_API_KEY</code> to your .env.</div>
            </div>
          ) : mapErr ? (
            <div className={styles.mapOverlay}><i className="ti ti-alert-triangle" /><div>{mapErr}</div></div>
          ) : null}
        </div>
      </div>

      <button type="button" className={styles.handle} style={{ left: collapsed ? 0 : 320 }}
        onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Show devices" : "Hide devices"}>
        <i className={collapsed ? "ti ti-chevron-right" : "ti ti-chevron-left"} />
      </button>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
