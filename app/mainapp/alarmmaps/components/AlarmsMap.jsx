// app/mainapp/alarmmaps/components/AlarmsMap.jsx
// Asset Alarms landing — a faithful port of the prototype's alarms map: a left
// alarm panel (Asset Alarms · open badge · severity filter chips · search · alarm
// cards) beside a full-height Google Map. Pins are coloured by severity; OPEN
// (unacknowledged) alarms emit pulsing waves in their severity colour. Clicking a
// pin opens the severity-headed popup with Acknowledge + Open.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./alarmsmap.module.css";
import { fetchMapsConfig, loadGoogleMaps, createWaveOverlay, alarmPinIcon, alarmSeverityColor, ALARM_SEVERITIES } from "../../lib/googleMaps.js";
import { ackView } from "../../lib/ackView.js";
import AckModal from "../../alarms/components/AckModal.jsx";

const FILTERS = ["All", "Critical", "High", "Medium", "Low"];

function coordsOf(a) {
  const lat = a.lat != null ? Number(a.lat) : null;
  const lng = a.lng != null ? Number(a.lng) : null;
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}
function fmtEAT(v) {
  if (!v) return "";
  try { return new Date(v).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " EAT"; }
  catch { return ""; }
}
function relTime(v) {
  if (!v) return "—";
  const t = new Date(v).getTime();
  if (!Number.isFinite(t)) return "—";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const dd = Math.round(h / 24); return `${dd} day${dd > 1 ? "s" : ""} ago`;
}

export default function AlarmsMap() {
  const router = useRouter();
  const params = useSearchParams();
  const focusId = params.get("focus");        // ?focus=<alarm id> from "View on map"
  const didFocus = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [alarms, setAlarms] = useState([]);
  const [viewer, setViewer] = useState({});
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("All");
  const [selected, setSelected] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mapErr, setMapErr] = useState("");
  const [popup, setPopup] = useState(null);
  const [toast, setToast] = useState("");

  const mapRef = useRef(null);
  const gmap = useRef(null);
  const mapsApi = useRef(null);
  const markers = useRef({});
  const overlayRef = useRef(null);
  const waveRef = useRef(null);
  const popupEl = useRef(null);
  const popupIdRef = useRef(null);
  const repositionRef = useRef(() => {});
  const closeRef = useRef(() => {});

  async function load() {
    try {
      const res = await fetch("/api/mainapp/alarms", { cache: "no-store" });
      const data = res.ok ? await res.json() : { alarms: [] };
      setAlarms(Array.isArray(data.alarms) ? data.alarms : []);
      setViewer(data.viewer || {});
    } catch { /* keep */ }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    return alarms.filter((a) => {
      if (filter !== "All" && a.priority !== filter) return false;
      if (!term) return true;
      return (`${a.name} ${a.device_id || ""} ${a.site || ""}`).toLowerCase().includes(term);
    });
  }, [alarms, q, filter]);

  // "open" from THIS viewer's side — an alarm the security side acked still reads
  // as open to a monitoring user who hasn't acked (and vice-versa).
  const openCount = useMemo(() => alarms.filter((a) => ackView(a, viewer).status === "Open").length, [alarms, viewer]);
  const legend = useMemo(() => {
    const c = { Critical: 0, High: 0, Medium: 0, Low: 0 };
    alarms.forEach((a) => { c[a.priority] = (c[a.priority] || 0) + 1; });
    return c;
  }, [alarms]);

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
        ["bounds_changed", "center_changed", "zoom_changed", "drag"].forEach((ev) => map.addListener(ev, () => repositionRef.current()));
        map.addListener("click", () => closeRef.current());

        drawMarkers(!focusId); // when focusing a specific alarm, don't fit-to-all (it fights the zoom)
        setMapReady(true);
      } catch (err) { setMapErr(err.message || "Map failed to load."); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  useEffect(() => { if (gmap.current) drawMarkers(); /* eslint-disable-next-line */ }, [filtered, alarms]);

  // "View on map" (?focus=<id>) — zoom to that alarm's coordinates and pop its
  // detail window, once the map + alarms are ready. Runs once.
  useEffect(() => {
    if (didFocus.current || !focusId || !mapReady || !gmap.current || !alarms.length) return;
    const a = alarms.find((x) => String(x.id) === String(focusId));
    if (!a) return;
    didFocus.current = true;
    const pos = coordsOf(a);
    if (!pos) { setSelected(a.id); return; }
    openPopup(a, { zoom: 18 });   // zoom right in + pop the detail window
    // re-assert once after the camera settles, in case anything nudged it
    const map = gmap.current, maps = mapsApi.current;
    if (maps) maps.event.addListenerOnce(map, "idle", () => { map.setZoom(18); map.panTo(pos); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, mapReady, alarms]);

  useEffect(() => {
    if (!gmap.current || !mapsApi.current) return;
    const c = gmap.current.getCenter();
    const t = setTimeout(() => { mapsApi.current.event.trigger(gmap.current, "resize"); if (c) gmap.current.setCenter(c); repositionRef.current(); }, 260);
    return () => clearTimeout(t);
  }, [collapsed]);

  function drawMarkers(fit) {
    const maps = mapsApi.current, map = gmap.current;
    if (!maps || !map) return;
    Object.values(markers.current).forEach((m) => m.setMap(null));
    markers.current = {};
    const bounds = new maps.LatLngBounds();
    const wavePts = [];
    let any = false;
    filtered.forEach((a) => {
      const pos = coordsOf(a);
      if (!pos) return;
      any = true; bounds.extend(pos);
      const mk = new maps.Marker({ map, position: pos, title: a.name, icon: alarmPinIcon(maps, a.priority), optimized: false, zIndex: a.priority === "Critical" ? 30 : 20 });
      mk.addListener("click", () => openPopup(a));
      markers.current[a.id] = mk;
      if (a.status === "Open") wavePts.push({ ...pos, color: alarmSeverityColor(a.priority) });
    });
    if (waveRef.current) waveRef.current.setPoints(wavePts);
    if (fit && any) map.fitBounds(bounds, 80);
  }

  // ---- popup ----
  function reposition() {
    const ov = overlayRef.current, el = popupEl.current, maps = mapsApi.current;
    const id = popupIdRef.current;
    if (!ov || !el || !maps || id == null) return;
    const a = alarms.find((x) => x.id === id); if (!a) return;
    const pos = coordsOf(a); if (!pos) return;
    const proj = ov.getProjection(); if (!proj) return;
    const pt = proj.fromLatLngToContainerPixel(new maps.LatLng(pos.lat, pos.lng));
    if (!pt) return;
    el.style.left = Math.round(pt.x) + "px";
    el.style.top = Math.round(pt.y - 26) + "px";
  }
  function openPopup(a, { zoom = 17 } = {}) {
    setSelected(a.id);
    popupIdRef.current = a.id;
    setPopup(a);
    const map = gmap.current, pos = coordsOf(a);
    if (map && pos) { map.setZoom(zoom); map.panTo(pos); }  // clicking a pin or card zooms right in
    setTimeout(reposition, 0);
    if (mapsApi.current && map) mapsApi.current.event.addListenerOnce(map, "idle", () => repositionRef.current());
  }
  function closePopup() { popupIdRef.current = null; setPopup(null); }

  function clickCard(a) {
    if (coordsOf(a) && gmap.current) openPopup(a); else setSelected(a.id);
  }

  const [ackId, setAckId] = useState(null); // alarm being acknowledged (opens the modal)
  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2400); }

  repositionRef.current = reposition;
  closeRef.current = closePopup;

  const popColor = popup ? alarmSeverityColor(popup.priority) : "#ef4444";

  return (
    <div className={styles.page}>
      <div className={`${styles.grid} ${collapsed ? styles.gridCollapsed : ""}`}>
        {/* alarm panel */}
        <div className={styles.panel}>
          <div className={styles.panelHead}>
            <div className={styles.titleRow}>
              <span className={styles.title}>Asset Alarms</span>
              <span className={styles.openBadge}>{openCount} open</span>
            </div>
            <div className={styles.search}>
              <i className="ti ti-search" />
              <input className={styles.searchInput} placeholder="Search alarms..." value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className={styles.chips}>
              {FILTERS.map((f) => (
                <button key={f} type="button" className={`${styles.chip} ${filter === f ? styles.chipOn : ""}`} onClick={() => setFilter(f)}>
                  {f}{f !== "All" && legend[f] ? ` · ${legend[f]}` : ""}
                </button>
              ))}
            </div>
          </div>
          <div className={styles.list}>
            {loading ? <div className={styles.emptyList}>Loading…</div>
              : filtered.length ? filtered.map((a) => {
                const c = alarmSeverityColor(a.priority);
                const av = ackView(a, viewer);   // per-side status for THIS viewer
                const isOpen = av.status === "Open";
                return (
                  <div key={a.id} className={`${styles.card} ${selected === a.id ? styles.cardOn : ""}`} onClick={() => clickCard(a)}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardName}>{a.name}</div>
                      <span className={`${styles.stPill} ${isOpen ? styles.stOpen : styles.stAck}`}>{av.status.toUpperCase()}</span>
                    </div>
                    <div className={styles.cardSub}>{a.device_id} — {a.site}</div>
                    <div className={styles.cardMeta}>
                      <span className={styles.sev} style={{ color: c }}><span className={styles.dot} style={{ background: c }} />{a.priority}</span>
                      <span className={styles.time} title={fmtEAT(a.created_at)}>{relTime(a.created_at)}</span>
                      <span className={styles.view}>View <i className="ti ti-chevron-right" /></span>
                    </div>
                  </div>
                );
              }) : <div className={styles.emptyList}>No {filter.toLowerCase()} alarms.</div>}
          </div>
        </div>

        {/* map */}
        <div className={styles.mapWrap}>
          <div ref={mapRef} className={styles.mapReal} />

          {popup ? (
            <div ref={popupEl} className={styles.popup}>
              <div className={styles.popCard}>
                <div className={styles.popHead} style={{ background: popColor }}>
                  <button type="button" className={styles.popX} onClick={closePopup} aria-label="Close">✕</button>
                  <div className={styles.popName}>{popup.name}</div>
                  <div className={styles.popDev}>{popup.device_id} · {popup.priority} priority</div>
                </div>
                <div className={styles.popBody}>
                  <div className={styles.popRow}><span className={styles.popLbl}>Site</span><span className={styles.popVal}>{popup.site}</span></div>
                  <div className={styles.popRow}><span className={styles.popLbl}>Time</span><span className={styles.popVal} title={fmtEAT(popup.created_at)}>{relTime(popup.created_at)}</span></div>
                  <div className={styles.popRow}><span className={styles.popLbl}>Serial</span><span className={styles.popSerial}>{popup.serial}</span></div>
                  <div className={styles.popActions}>
                    {ackView(popup, viewer).canAck && <button type="button" className={styles.popAck} onClick={() => setAckId(popup.id)}>Acknowledge</button>}
                    <button type="button" className={styles.popOpen} style={{ background: popColor }} onClick={() => router.push(`/mainapp/alarms/${encodeURIComponent(popup.id)}`)}>Open</button>
                  </div>
                </div>
              </div>
              <div className={styles.popTail} />
            </div>
          ) : null}

          {!mapErr ? (
            <div className={styles.legend}>
              {ALARM_SEVERITIES.filter((s) => legend[s]).map((s) => (
                <span key={s} className={styles.legChip}><span className={styles.dot} style={{ background: alarmSeverityColor(s) }} />{s} · {legend[s]}</span>
              ))}
            </div>
          ) : null}

          {mapErr === "nokey" ? (
            <div className={styles.mapOverlay}>
              <i className="ti ti-bell-ringing" />
              <div>No Google Maps key found.<br />Set one in <a href="/mainapp/admin/maps">Admin → Google Maps</a> or add <code>GOOGLE_MAPS_API_KEY</code> to your .env.</div>
            </div>
          ) : mapErr ? (
            <div className={styles.mapOverlay}><i className="ti ti-alert-triangle" /><div>{mapErr}</div></div>
          ) : null}
        </div>
      </div>

      <button type="button" className={styles.handle} style={{ left: collapsed ? 0 : 340 }}
        onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Show alarms" : "Hide alarms"}>
        <i className={collapsed ? "ti ti-chevron-right" : "ti ti-chevron-left"} />
      </button>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
      {ackId && <AckModal alarmId={ackId} onClose={() => setAckId(null)} onDone={() => { setAckId(null); flash("Alarm acknowledged"); closePopup(); load(); }} />}
    </div>
  );
}
