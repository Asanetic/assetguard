// app/mainapp/playbackmap/components/PlaybackMap.jsx
// Route Playback — a faithful port of the prototype, on a real Google Map. Pick a
// device + date, and the vehicle animates along its stored GPS route: a grey
// dashed full path with a blue "traveled" overlay, start/stop/end dots, and a
// bottom transport bar (scrubber · time/distance/speed readout · play/pause ·
// reset/prev/next · 1×–5×). Data comes from /api/mainapp/playback.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "./playback.module.css";
import { fetchMapsConfig, loadGoogleMaps, playbackVehicleIcon, routeDotIcon } from "../../lib/googleMaps.js";

const WP_COLOR = { start: "#10B981", stop: "#F59E0B", end: "#EF4444" };
const SPEEDS = [1, 2, 3, 4, 5];
const TICK_MS = 200, STEP_SEC = 25; // prototype cadence: +25s of route time per 200ms at 1×

function pad(n) { return (n < 10 ? "0" : "") + n; }
function fmtClock(startSec, t) { const s = startSec + t; return `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor((s % 3600) / 60))}:${pad(Math.floor(s % 60))}`; }
function fmtHM(startSec, t) { const s = startSec + t; return `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor((s % 3600) / 60))}`; }

function haversine(a, b) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export default function PlaybackMap() {
  const params = useSearchParams();
  const qsDevice = params.get("device");
  const qsDate = params.get("date");

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(qsDevice || "001_NairobiHeadquarters_V");
  const [deviceQ, setDeviceQ] = useState(qsDevice || "001_NairobiHeadquarters_V");
  const [openDev, setOpenDev] = useState(false);
  const [date, setDate] = useState(qsDate || "2026-07-07");
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapErr, setMapErr] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [toast, setToast] = useState("");

  const mapRef = useRef(null);
  const gmap = useRef(null);
  const mapsApi = useRef(null);
  const fullLine = useRef(null);
  const travelLine = useRef(null);
  const vehicle = useRef(null);
  const wpMarkers = useRef([]);
  const devWrap = useRef(null);
  const tickRef = useRef(null);
  const stopToastRef = useRef(false);

  // load device list
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/mainapp/devices", { cache: "no-store" });
        const d = r.ok ? await r.json() : { devices: [] };
        setDevices((d.devices || []).map((x) => x.device_id).filter(Boolean));
      } catch { /* keep */ }
    })();
  }, []);

  // load route on device/date change
  useEffect(() => {
    let alive = true;
    setLoading(true); setPlaying(false); setT(0); stopToastRef.current = false;
    (async () => {
      try {
        const r = await fetch(`/api/mainapp/playback?device_id=${encodeURIComponent(deviceId)}&date=${date}`, { cache: "no-store" });
        const d = r.ok ? await r.json() : { route: null };
        if (alive) setRoute(d.route || null);
      } catch { if (alive) setRoute(null); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [deviceId, date]);

  useEffect(() => {
    function onDoc(e) { if (devWrap.current && !devWrap.current.contains(e.target)) setOpenDev(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const points = route?.points || [];
  const totalT = points.length ? points[points.length - 1].t : 0;
  const startSec = route?.start_sec ?? 25200;

  // cumulative distance (km) at each point, for the live distance readout
  const cum = useMemo(() => {
    const out = [0];
    for (let i = 1; i < points.length; i++) out[i] = out[i - 1] + haversine(points[i - 1], points[i]);
    return out;
  }, [points]);

  function interp(sec) {
    if (!points.length) return null;
    if (sec <= points[0].t) return { lat: points[0].lat, lng: points[0].lng, spd: points[0].spd, dist: 0 };
    for (let i = 0; i < points.length - 1; i++) {
      const a = points[i], b = points[i + 1];
      if (sec >= a.t && sec <= b.t) {
        const span = b.t - a.t, f = span ? (sec - a.t) / span : 0;
        return {
          lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f,
          spd: Math.round(a.spd + (b.spd - a.spd) * f),
          dist: cum[i] + (cum[i + 1] - cum[i]) * f,
        };
      }
    }
    const last = points[points.length - 1];
    return { lat: last.lat, lng: last.lng, spd: last.spd, dist: cum[cum.length - 1] };
  }
  function headingAt(sec) {
    const a = interp(Math.max(0, sec - 25)), b = interp(Math.min(totalT, sec + 25));
    if (!a || !b) return 0;
    const dLng = b.lng - a.lng, dLat = b.lat - a.lat;
    if (Math.abs(dLng) < 1e-6 && Math.abs(dLat) < 1e-6) return 0;
    return Math.atan2(dLng, dLat) * 180 / Math.PI; // bearing (0 = north)
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
        if (!gmap.current) {
          gmap.current = new maps.Map(mapRef.current, {
            center: cfg.defaultCenter, zoom: 13, mapTypeId: cfg.mapType || "roadmap",
            gestureHandling: "greedy", streetViewControl: false, fullscreenControl: false,
            mapTypeControl: false, zoomControl: true, zoomControlOptions: { position: maps.ControlPosition.LEFT_TOP },
          });
        }
        drawRoute();
      } catch (err) { setMapErr(err.message || "Map failed to load."); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, route]);

  function clearMap() {
    [fullLine, travelLine, vehicle].forEach((r) => { if (r.current) { r.current.setMap(null); r.current = null; } });
    wpMarkers.current.forEach((m) => m.setMap(null)); wpMarkers.current = [];
  }

  function drawRoute() {
    const maps = mapsApi.current, map = gmap.current;
    if (!maps || !map) return;
    clearMap();
    if (!points.length) return;
    const path = points.map((p) => ({ lat: p.lat, lng: p.lng }));
    const dash = { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 };
    fullLine.current = new maps.Polyline({
      map, path, strokeOpacity: 0, zIndex: 1,
      icons: [{ icon: { ...dash, strokeColor: "#94a3b8" }, offset: "0", repeat: "12px" }],
    });
    travelLine.current = new maps.Polyline({ map, path: [path[0]], strokeColor: "#2e6cf5", strokeWeight: 5, strokeOpacity: 0.95, zIndex: 2 });
    (route.waypoints || []).forEach((w) => {
      const mk = new maps.Marker({ map, position: { lat: w.lat, lng: w.lng }, icon: routeDotIcon(maps, WP_COLOR[w.kind] || "#64748b"), title: w.label, zIndex: 3 });
      wpMarkers.current.push(mk);
    });
    vehicle.current = new maps.Marker({ map, position: path[0], icon: playbackVehicleIcon(maps, 0), zIndex: 5, optimized: false });
    const bounds = new maps.LatLngBounds(); path.forEach((p) => bounds.extend(p));
    map.fitBounds(bounds, 90);
    updateVehicle(0);
  }

  function updateVehicle(sec) {
    const maps = mapsApi.current;
    if (!maps || !vehicle.current || !points.length) return;
    const p = interp(sec); if (!p) return;
    vehicle.current.setPosition({ lat: p.lat, lng: p.lng });
    vehicle.current.setIcon(playbackVehicleIcon(maps, headingAt(sec)));
    // traveled polyline up to `sec`
    const seg = [];
    for (let i = 0; i < points.length; i++) {
      if (points[i].t <= sec) seg.push({ lat: points[i].lat, lng: points[i].lng });
      else break;
    }
    seg.push({ lat: p.lat, lng: p.lng });
    if (travelLine.current) travelLine.current.setPath(seg);
  }

  // redraw vehicle whenever t changes
  useEffect(() => { updateVehicle(t); /* eslint-disable-next-line */ }, [t]);

  // stop toast at the Upper Hill stop window
  useEffect(() => {
    const stop = (route?.waypoints || []).find((w) => w.kind === "stop");
    if (!stop) return;
    const end = stop.t + (stop.stop_min || 0) * 60;
    if (t >= stop.t && t <= end) { if (!stopToastRef.current) { stopToastRef.current = true; flash(`Stopped at ${stop.label.replace(" (Stop)", "")} for ${stop.stop_min} minutes`); } }
    else if (t < stop.t) stopToastRef.current = false;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  // play loop
  useEffect(() => {
    if (!playing) { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null; return; }
    tickRef.current = setInterval(() => {
      setT((prev) => {
        const next = prev + STEP_SEC * speed;
        if (next >= totalT) { setPlaying(false); return totalT; }
        return next;
      });
    }, TICK_MS);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [playing, speed, totalT]);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2600); }

  const labeled = route?.waypoints || [];
  function jumpPrev() { setPlaying(false); let target = labeled[0]?.t || 0; for (let i = labeled.length - 1; i >= 0; i--) { if (labeled[i].t < t - 2) { target = labeled[i].t; break; } } setT(target); }
  function jumpNext() { setPlaying(false); let target = totalT; for (let i = 0; i < labeled.length; i++) { if (labeled[i].t > t + 2) { target = labeled[i].t; break; } } setT(target); }

  function exportCsv() {
    if (!points.length) return;
    const header = ["time", "lat", "lng", "speed_kmh"];
    const lines = [header.join(",")].concat(points.map((p) => [fmtClock(startSec, p.t), p.lat, p.lng, p.spd].join(",")));
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `${deviceId}_${date}_route.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    flash("Route exported to CSV");
  }

  const now = interp(t) || { spd: 0, dist: 0 };
  const s = route?.summary;
  const devMatches = devices.filter((d) => !deviceQ.trim() || d.toLowerCase().includes(deviceQ.trim().toLowerCase()));

  return (
    <div className={styles.page}>
      <div className={`${styles.grid} ${collapsed ? styles.gridCollapsed : ""}`}>
        {/* sidebar */}
        <div className={styles.sidebar}>
          <span className={styles.title}>Route Playback</span>

          <div className={styles.lab}>DEVICE</div>
          <div className={styles.field} ref={devWrap}>
            <input className={styles.in} placeholder="Search devices..." autoComplete="off"
              value={deviceQ} onChange={(e) => { setDeviceQ(e.target.value); setOpenDev(true); }} onFocus={() => setOpenDev(true)} />
            {openDev && (
              <div className={styles.devList}>
                {devMatches.length ? devMatches.map((d) => (
                  <div key={d} className={styles.devItem} onClick={() => { setDeviceId(d); setDeviceQ(d); setOpenDev(false); }}>{d}</div>
                )) : <div className={styles.devNone}>No devices found</div>}
              </div>
            )}
          </div>

          <div className={styles.lab}>DATE</div>
          <input type="date" className={styles.in} value={date} onChange={(e) => setDate(e.target.value)} />

          {route ? (
            <>
              <div className={styles.stat} style={{ marginTop: 16 }}><span className={styles.statK}>Total Distance</span><b className={styles.statV}>{s.total_km} km</b></div>
              <div className={styles.stat}><span className={styles.statK}>Duration</span><b className={styles.statV}>{s.duration_min} min</b></div>
              <div className={styles.stat}><span className={styles.statK}>Max Speed</span><b className={styles.statV}>{s.max_speed} km/h</b></div>
              <div className={`${styles.stat} ${styles.statLast}`}><span className={styles.statK}>Stops</span><b className={styles.statV}>{s.stops} stop{s.stops === 1 ? "" : "s"} ({s.stop_min} min)</b></div>

              <div className={styles.lab}>ROUTE POINTS</div>
              {labeled.map((w) => (
                <div key={w.t} className={styles.rp} onClick={() => { setPlaying(false); setT(w.t); }}>
                  <span className={styles.rpDot} style={{ background: WP_COLOR[w.kind] || "#64748b" }} />
                  <div>
                    <div className={styles.rpName}>{w.label.replace(" (Stop)", "")}</div>
                    <div className={styles.rpSub}>
                      {w.kind === "start" ? `Start · ${fmtClock(startSec, w.t)}`
                        : w.kind === "end" ? `End · ${fmtClock(startSec, w.t)}`
                        : `${fmtHM(startSec, w.t)} – ${fmtHM(startSec, w.t + (w.stop_min || 0) * 60)} · ${w.stop_min} min`}
                    </div>
                  </div>
                </div>
              ))}

              <button className={styles.export} onClick={exportCsv}><i className="ti ti-download" style={{ fontSize: 15 }} /> Export</button>
            </>
          ) : !loading ? (
            <div style={{ marginTop: 18, fontSize: 12.5, color: "#94a3b8" }}>No route recorded for this device on this date.</div>
          ) : null}
        </div>

        {/* map */}
        <div className={styles.mapWrap}>
          <div ref={mapRef} className={styles.mapReal} />

          {!mapErr && route ? (
            <div className={styles.chips}>
              <span className={styles.chip}><span className={styles.dot} />{deviceId}</span>
              <span className={styles.chip}><i className="ti ti-map-pin" style={{ fontSize: 13, color: "#059669" }} />{s.total_km_day} km total</span>
            </div>
          ) : null}

          {mapErr === "nokey" ? (
            <div className={styles.mapOverlay}>
              <i className="ti ti-player-play" />
              <div>No Google Maps key found.<br />Set one in <a href="/mainapp/admin/maps">Admin → Google Maps</a> or add <code>GOOGLE_MAPS_API_KEY</code> to your .env.</div>
            </div>
          ) : mapErr ? (
            <div className={styles.mapOverlay}><i className="ti ti-alert-triangle" /><div>{mapErr}</div></div>
          ) : null}

          {/* bottom transport bar */}
          {route ? (
            <div className={styles.bar}>
              <div className={styles.barTop}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className={styles.dropbox}>{deviceId}</span>
                  <span className={styles.dropbox}>{new Date(date + "T00:00:00").toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}</span>
                </div>
                <div className={styles.readout}>
                  <span className={styles.read}><i className="ti ti-clock" style={{ color: "#94a3b8" }} />{fmtClock(startSec, t)}</span>
                  <span className={styles.read}><i className="ti ti-map-pin" style={{ color: "#ec4899" }} />{now.dist.toFixed(1)} km</span>
                  <span className={styles.read}><i className="ti ti-bolt" style={{ color: "#f59e0b" }} />{now.spd} km/h</span>
                </div>
              </div>
              <div className={styles.scrubRow}>
                <span className={styles.scrubEnds}>{fmtHM(startSec, 0)}</span>
                <input type="range" min="0" max={totalT} value={t} className={styles.scrub}
                  onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} />
                <span className={styles.scrubEnds}>{fmtHM(startSec, totalT)}</span>
              </div>
              <div className={styles.controls}>
                <button className={styles.tbtn} title="Reset" onClick={() => { setPlaying(false); setT(0); }}><i className="ti ti-refresh" /></button>
                <button className={styles.tbtn} title="Reverse" onClick={jumpPrev}><i className="ti ti-chevron-left" /></button>
                <button className={styles.play} title="Play/Pause" onClick={() => setPlaying((v) => !v)}>
                  {playing
                    ? <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.2" fill="#fff" /><rect x="14" y="4" width="4" height="16" rx="1.2" fill="#fff" /></svg>
                    : <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4L19 12L7 20V4Z" fill="#fff" /></svg>}
                </button>
                <button className={styles.tbtn} title="Forward" onClick={jumpNext}><i className="ti ti-chevron-right" /></button>
                <span className={styles.sep} />
                {SPEEDS.map((m) => (
                  <button key={m} className={`${styles.speed} ${speed === m ? styles.speedOn : ""}`} onClick={() => setSpeed(m)}>{m}×</button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <button type="button" className={styles.handle} style={{ left: collapsed ? 0 : 270 }}
        onClick={() => setCollapsed((v) => !v)} aria-label={collapsed ? "Show panel" : "Hide panel"}>
        <i className={collapsed ? "ti ti-chevron-right" : "ti ti-chevron-left"} />
      </button>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
