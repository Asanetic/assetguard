// app/mainapp/responseplayback/components/ResponsePlaybackMap.jsx
// Response Playback — replays the TARGET device's route and every RESPONDER's route
// TOGETHER on one map and one timeline. The target is the car (grey dashed path +
// navy travelled line); each responder is a coloured dot with its own trail. 1× is
// real time (see Route Playback), speeds up to 1000×. Data: /api/mainapp/response-playback.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import styles from "../../playbackmap/components/playback.module.css";
import { fetchMapsConfig, loadGoogleMaps, playbackVehicleIcon, routeDotIcon } from "../../lib/googleMaps.js";

const SPEEDS = [1, 2, 5, 10, 25, 50, 100, 250, 500, 1000];
const TICK_MS = 100;
const STEP_SEC = TICK_MS / 1000;          // 1× = real time
const WP_COLOR = { start: "#10B981", stop: "#F59E0B", end: "#EF4444" };
// Responder colours — deliberately NOT red/orange (those read as alarm/target).
const RESP_COLORS = ["#2563EB", "#059669", "#7C3AED", "#0891B2", "#4F46E5", "#0D9488", "#9333EA", "#C026D3"];
const TARGET_TRAVEL = "#14315D";

const pad = (n) => (n < 10 ? "0" : "") + n;
function todayStr() { try { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; } catch { return ""; } }
function nowLocalInput() { try { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; } catch { return ""; } }
function fmtClock(startSec, t) { const s = (startSec || 0) + t; return `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor((s % 3600) / 60))}:${pad(Math.floor(s % 60))}`; }
function fmtHM(startSec, t) { const s = (startSec || 0) + t; return `${pad(Math.floor(s / 3600) % 24)}:${pad(Math.floor((s % 3600) / 60))}`; }
const eatIso = (s) => { if (!s) return s; if (/[zZ]$|[+-]\d{2}:?\d{2}$/.test(s)) return s; const t = /T\d{2}:\d{2}$/.test(s) ? `${s}:00` : s; return `${t}+03:00`; };

// Linear interpolation of a {t,lat,lng} track at time `sec`. Clamps to the ends.
function interpPts(points, sec) {
  if (!points || !points.length) return null;
  if (sec <= points[0].t) return { lat: points[0].lat, lng: points[0].lng };
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i], b = points[i + 1];
    if (sec >= a.t && sec <= b.t) {
      const f = (b.t - a.t) > 0 ? (sec - a.t) / (b.t - a.t) : 0;
      return { lat: a.lat + (b.lat - a.lat) * f, lng: a.lng + (b.lng - a.lng) * f };
    }
  }
  const last = points[points.length - 1];
  return { lat: last.lat, lng: last.lng };
}
function traveled(points, sec) {
  const seg = [];
  for (const p of points) { if (p.t <= sec) seg.push({ lat: p.lat, lng: p.lng }); else break; }
  const here = interpPts(points, sec);
  if (here) seg.push(here);
  return seg;
}

export default function ResponsePlaybackMap() {
  const params = useSearchParams();
  const qsDevice = params.get("device");
  const qsDate = params.get("date");

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(qsDevice || "");
  const [deviceQ, setDeviceQ] = useState(qsDevice || "");
  const [openDev, setOpenDev] = useState(false);
  const [from, setFrom] = useState(qsDate ? `${qsDate}T00:00` : `${todayStr()}T00:00`);
  const [to, setTo] = useState(qsDate ? `${qsDate}T23:59` : nowLocalInput());
  const [srcSel, setSrcSel] = useState(["gps", "wifi", "lbs"]);
  const toggleSrc = (k) => setSrcSel((cur) => { const has = cur.includes(k); const next = has ? cur.filter((x) => x !== k) : [...cur, k]; return next.length ? next : cur; });

  const [data, setData] = useState(null);   // {target, responders, incidents, duration, start_sec}
  const [loading, setLoading] = useState(true);
  const [mapErr, setMapErr] = useState("");
  const [t, setT] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [collapsed, setCollapsed] = useState(false);

  const mapRef = useRef(null), gmap = useRef(null), mapsApi = useRef(null);
  const tRefs = useRef({ full: null, travel: null, car: null });   // target
  const rRefs = useRef([]);                                        // responders [{full,travel,marker,firstT}]
  const wpMarkers = useRef([]), incMarkers = useRef([]);
  const devWrap = useRef(null), tickRef = useRef(null);

  const target = data?.target || null;
  const responders = data?.responders || [];
  const incidents = data?.incidents || [];
  const duration = data?.duration || 0;
  const startSec = data?.start_sec ?? 25200;
  const hasAny = !!(target?.points?.length || responders.some((r) => r.points?.length));

  // device list
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/mainapp/devices", { cache: "no-store" });
        const d = r.ok ? await r.json() : { devices: [] };
        const ids = (d.devices || []).map((x) => x.device_id).filter(Boolean);
        setDevices(ids);
        if (!qsDevice && !deviceId && ids.length) { setDeviceId(ids[0]); setDeviceQ(ids[0]); }
      } catch { /* keep */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load combined playback
  useEffect(() => {
    if (!deviceId || !from || !to) { setLoading(false); return; }
    let alive = true;
    setLoading(true); setPlaying(false); setT(0);
    (async () => {
      try {
        let qs = `device_id=${encodeURIComponent(deviceId)}&from=${encodeURIComponent(eatIso(from))}&to=${encodeURIComponent(eatIso(to))}`;
        if (srcSel.length > 0 && srcSel.length < 3) qs += `&sources=${encodeURIComponent(srcSel.join(","))}`;
        const r = await fetch(`/api/mainapp/response-playback?${qs}`, { cache: "no-store" });
        const d = r.ok ? await r.json() : null;
        if (alive) setData(d && (d.target || (d.responders || []).length) ? d : null);
      } catch { if (alive) setData(null); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [deviceId, from, to, srcSel]);

  useEffect(() => {
    function onDoc(e) { if (devWrap.current && !devWrap.current.contains(e.target)) setOpenDev(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  // init / redraw map when data changes
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
        drawAll();
      } catch (err) { setMapErr(err.message || "Map failed to load."); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, data]);

  function respColor(i) { return RESP_COLORS[i % RESP_COLORS.length]; }
  function respMarkerIcon(maps, color) {
    return { path: maps.SymbolPath.CIRCLE, scale: 7, fillColor: color, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2 };
  }

  function clearMap() {
    const tr = tRefs.current;
    [tr.full, tr.travel, tr.car].forEach((o) => { if (o) o.setMap(null); });
    tRefs.current = { full: null, travel: null, car: null };
    rRefs.current.forEach((r) => { [r.full, r.travel, r.marker].forEach((o) => o && o.setMap(null)); });
    rRefs.current = [];
    wpMarkers.current.forEach((m) => m.setMap(null)); wpMarkers.current = [];
    incMarkers.current.forEach((m) => m.setMap(null)); incMarkers.current = [];
  }

  function drawAll() {
    const maps = mapsApi.current, map = gmap.current;
    if (!maps || !map) return;
    clearMap();
    const bounds = new maps.LatLngBounds();
    let any = false;
    const dash = { path: "M 0,-1 0,1", strokeOpacity: 1, scale: 3 };

    // target
    if (target?.points?.length) {
      const path = target.points.map((p) => ({ lat: p.lat, lng: p.lng }));
      tRefs.current.full = new maps.Polyline({ map, path, strokeOpacity: 0, zIndex: 1, icons: [{ icon: { ...dash, strokeColor: "#94a3b8" }, offset: "0", repeat: "12px" }] });
      tRefs.current.travel = new maps.Polyline({ map, path: [path[0]], strokeColor: TARGET_TRAVEL, strokeWeight: 5, strokeOpacity: 0.95, zIndex: 3 });
      tRefs.current.car = new maps.Marker({ map, position: path[0], icon: playbackVehicleIcon(maps, 0), zIndex: 6, optimized: false, title: "Target device" });
      (target.waypoints || []).forEach((w) => {
        wpMarkers.current.push(new maps.Marker({ map, position: { lat: w.lat, lng: w.lng }, icon: routeDotIcon(maps, WP_COLOR[w.kind] || "#64748b"), title: w.label, zIndex: 4 }));
      });
      path.forEach((p) => { bounds.extend(p); any = true; });
    }

    // responders
    responders.forEach((u, i) => {
      if (!u.points?.length) { rRefs.current.push({ full: null, travel: null, marker: null, firstT: 0 }); return; }
      const color = respColor(i);
      const path = u.points.map((p) => ({ lat: p.lat, lng: p.lng }));
      const full = new maps.Polyline({ map, path, strokeColor: color, strokeOpacity: 0.28, strokeWeight: 3, zIndex: 1 });
      const travel = new maps.Polyline({ map, path: [path[0]], strokeColor: color, strokeWeight: 4, strokeOpacity: 0.95, zIndex: 2 });
      const marker = new maps.Marker({ map, position: path[0], icon: respMarkerIcon(maps, color), zIndex: 5, title: u.name || `Responder ${u.userId}` });
      rRefs.current.push({ full, travel, marker, firstT: u.points[0].t });
      path.forEach((p) => { bounds.extend(p); any = true; });
    });

    // incident pins
    (incidents || []).forEach((inc) => {
      if (inc.lat == null || inc.lng == null) return;
      const mk = new maps.Marker({ map, position: { lat: Number(inc.lat), lng: Number(inc.lng) }, icon: routeDotIcon(maps, "#EF4444"), title: `${inc.name || "Alarm"}${inc.priority ? ` · ${inc.priority}` : ""}`, zIndex: 4 });
      const iw = new maps.InfoWindow({ content: `<div style="font-weight:700;color:#b91c1c;font-size:12.5px">⚠ ${String(inc.name || "Alarm").replace(/</g, "&lt;")}</div><div style="color:#64748b;font-size:11.5px">${inc.priority || ""} · ${fmtClock(startSec, inc.t || 0)}</div>` });
      mk.addListener("click", () => iw.open({ map, anchor: mk }));
      incMarkers.current.push(mk);
    });

    if (any) map.fitBounds(bounds, 90);
    updateAll(0);
  }

  function updateAll(sec) {
    const maps = mapsApi.current;
    if (!maps) return;
    // target
    if (target?.points?.length && tRefs.current.car) {
      const p = interpPts(target.points, sec);
      if (p) { tRefs.current.car.setPosition(p); if (tRefs.current.travel) tRefs.current.travel.setPath(traveled(target.points, sec)); }
    }
    // responders
    responders.forEach((u, i) => {
      const ref = rRefs.current[i];
      if (!ref || !ref.marker || !u.points?.length) return;
      const started = sec >= ref.firstT;
      ref.marker.setVisible(started);
      ref.travel.setVisible(started);
      if (started) {
        const p = interpPts(u.points, sec);
        if (p) { ref.marker.setPosition(p); ref.travel.setPath(traveled(u.points, sec)); }
      }
    });
  }

  useEffect(() => { updateAll(t); /* eslint-disable-next-line */ }, [t]);

  // When the panel collapses/expands the map container resizes; nudge Google Maps
  // to repaint tiles into the new width once the CSS transition has settled.
  useEffect(() => {
    const m = gmap.current, maps = mapsApi.current;
    if (!m || !maps) return;
    const id = setTimeout(() => { try { maps.event.trigger(m, "resize"); } catch {} }, 320);
    return () => clearTimeout(id);
  }, [collapsed]);

  // play loop — 1× is real time
  useEffect(() => {
    if (!playing) { if (tickRef.current) clearInterval(tickRef.current); tickRef.current = null; return; }
    tickRef.current = setInterval(() => {
      setT((prev) => { const next = prev + STEP_SEC * speed; if (next >= duration) { setPlaying(false); return duration; } return next; });
    }, TICK_MS);
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [playing, speed, duration]);

  const devMatches = devices.filter((d) => !deviceQ.trim() || d.toLowerCase().includes(deviceQ.trim().toLowerCase()));
  const rangeLabel = (from && to) ? `${from.replace("T", " ")} → ${to.slice(11)}` : todayStr();

  return (
    <div className={styles.page}>
      <div className={`${styles.grid} ${collapsed ? styles.gridCollapsed : ""}`}>
        <div className={styles.sidebar}>
          <span className={styles.title}>Response Playback</span>

          <div className={styles.lab}>TARGET DEVICE</div>
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

          <div className={styles.lab}>FROM</div>
          <input type="datetime-local" className={styles.in} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <div className={styles.lab} style={{ marginTop: 8 }}>TO</div>
          <input type="datetime-local" className={styles.in} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          <div className={styles.quick}>
            <button type="button" onClick={() => { setFrom(`${todayStr()}T00:00`); setTo(nowLocalInput()); }}>Today</button>
            <button type="button" onClick={() => { const d = new Date(Date.now() - 864e5); const ds = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; setFrom(`${ds}T00:00`); setTo(`${ds}T23:59`); }}>Yesterday</button>
            <button type="button" onClick={() => { const now = new Date(); const f = new Date(now.getTime() - 3600e3); setFrom(`${f.getFullYear()}-${pad(f.getMonth() + 1)}-${pad(f.getDate())}T${pad(f.getHours())}:${pad(f.getMinutes())}`); setTo(nowLocalInput()); }}>Last hour</button>
          </div>

          <div className={styles.lab} style={{ marginTop: 8 }}>TARGET FIX SOURCE</div>
          <div className={styles.srcFilter}>
            {[{ k: "gps", label: "GPS", icon: "ti-satellite" }, { k: "wifi", label: "Wi-Fi", icon: "ti-wifi" }, { k: "lbs", label: "LBS", icon: "ti-antenna-bars-4" }].map((o) => {
              const on = srcSel.includes(o.k);
              return (
                <button key={o.k} type="button" className={`${styles.srcChip} ${on ? styles.srcChipOn : ""}`} aria-pressed={on} onClick={() => toggleSrc(o.k)}>
                  <i className={`ti ${on ? "ti-check" : o.icon}`} />{o.label}
                </button>
              );
            })}
          </div>

          {/* legend */}
          <div className={styles.lab} style={{ marginTop: 16 }}>ON THE MAP</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {target?.points?.length ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ width: 14, height: 14, borderRadius: 4, background: TARGET_TRAVEL, display: "inline-block" }} />
                <span style={{ fontWeight: 700, color: "#0f274a" }}>Target device</span>
                <span style={{ color: "#94a3b8", marginLeft: "auto" }}>{target.summary?.total_km ?? 0} km</span>
              </div>
            ) : null}
            {responders.map((u, i) => (
              <div key={u.userId} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                <span style={{ width: 14, height: 14, borderRadius: "50%", background: respColor(i), display: "inline-block" }} />
                <span style={{ fontWeight: 700, color: "#0f274a" }}>{u.name}{u.team ? ` · ${u.team}` : ""}</span>
                <span style={{ color: "#94a3b8", marginLeft: "auto" }}>{u.total_km ?? 0} km</span>
              </div>
            ))}
            {!hasAny && !loading ? <div style={{ fontSize: 12.5, color: "#94a3b8" }}>No target or responder tracks in this range.</div> : null}
            {hasAny && !responders.length ? <div style={{ fontSize: 12, color: "#94a3b8" }}>No responder was tracking this device in this window.</div> : null}
          </div>
        </div>

        <div className={styles.mapWrap}>
          <div ref={mapRef} className={styles.mapReal} />
          {loading ? <div className={styles.mapOverlay}><i className="ti ti-loader" /><div>Loading…</div></div>
            : mapErr === "nokey" ? <div className={styles.mapOverlay}><i className="ti ti-map-off" /><div>No map API key configured.</div></div>
            : mapErr ? <div className={styles.mapOverlay}><i className="ti ti-alert-triangle" /><div>{mapErr}</div></div>
            : !hasAny ? <div className={styles.mapOverlay}><i className="ti ti-route-off" /><div>No tracks for this device in this time range.</div></div>
            : null}

          {hasAny ? (
            <div className={styles.bar}>
              <div className={styles.barTop}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span className={styles.dropbox}>{deviceId}</span>
                  <span className={styles.dropbox}>{rangeLabel}</span>
                </div>
                <div className={styles.readout}>
                  <span className={styles.read}><i className="ti ti-clock" style={{ color: "#94a3b8" }} />{fmtClock(startSec, t)}</span>
                  <span className={styles.read}><i className="ti ti-users" style={{ color: "#2563eb" }} />{responders.length} responder{responders.length === 1 ? "" : "s"}</span>
                </div>
              </div>
              <div className={styles.scrubRow}>
                <span className={styles.scrubEnds}>{fmtHM(startSec, 0)}</span>
                <input type="range" min="0" max={duration} value={t} className={styles.scrub} onChange={(e) => { setPlaying(false); setT(Number(e.target.value)); }} />
                <span className={styles.scrubEnds}>{fmtHM(startSec, duration)}</span>
              </div>
              <div className={styles.controls}>
                <button className={styles.tbtn} title="Reset" onClick={() => { setPlaying(false); setT(0); }}><i className="ti ti-refresh" /></button>
                <button className={styles.play} title="Play/Pause" onClick={() => setPlaying((v) => !v)}>
                  {playing
                    ? <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.2" fill="#fff" /><rect x="14" y="4" width="4" height="16" rx="1.2" fill="#fff" /></svg>
                    : <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4L19 12L7 20V4Z" fill="#fff" /></svg>}
                </button>
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
    </div>
  );
}
