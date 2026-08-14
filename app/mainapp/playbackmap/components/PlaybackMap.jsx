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
import { startScreenRecording, buildRouteCsv } from "../../lib/routeRecorder.js";
import { addExport } from "../../lib/exportsStore.js";
import { useRouter } from "next/navigation";

const WP_COLOR = { start: "#10B981", stop: "#F59E0B", end: "#EF4444" };
const SPEEDS = [1, 2, 3, 4, 5];
const TICK_MS = 200, STEP_SEC = 25; // prototype cadence: +25s of route time per 200ms at 1×

function pad(n) { return (n < 10 ? "0" : "") + n; }
function todayStr() { try { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; } catch { return ""; } }
function nowLocalInput() { try { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; } catch { return ""; } }
// datetime-local value ("YYYY-MM-DDTHH:MM") → ISO with EAT offset so the server
// filters the exact wall-clock window the user picked, regardless of browser tz.
function eatIso(v) { if (!v) return null; const s = v.length === 16 ? `${v}:00` : v; return `${s}+03:00`; }
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
  const router = useRouter();
  const qsDevice = params.get("device");
  const qsDate = params.get("date");

  const [devices, setDevices] = useState([]);
  const [deviceId, setDeviceId] = useState(qsDevice || "");
  const [deviceQ, setDeviceQ] = useState(qsDevice || "");
  const [openDev, setOpenDev] = useState(false);
  // datetime range (local browser time = EAT for KE users). Default: the chosen day
  // (or today) 00:00 → now.
  const [from, setFrom] = useState(qsDate ? `${qsDate}T00:00` : `${todayStr()}T00:00`);
  const [to, setTo] = useState(qsDate ? `${qsDate}T23:59` : nowLocalInput());
  const [route, setRoute] = useState(null);
  const [incidents, setIncidents] = useState([]);
  const [exporting, setExporting] = useState(false);
  const [exportPct, setExportPct] = useState(0);
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
  const incMarkers = useRef([]);
  const devWrap = useRef(null);
  const tickRef = useRef(null);
  const stopToastRef = useRef(false);

  // load device list
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/mainapp/devices", { cache: "no-store" });
        const d = r.ok ? await r.json() : { devices: [] };
        const ids = (d.devices || []).map((x) => x.device_id).filter(Boolean);
        setDevices(ids);
        // Default to the first real device if none was chosen via the URL.
        if (!qsDevice && !deviceId && ids.length) { setDeviceId(ids[0]); setDeviceQ(ids[0]); }
      } catch { /* keep */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // load route on device / range change
  useEffect(() => {
    if (!deviceId || !from || !to) { setLoading(false); return; }
    let alive = true;
    setLoading(true); setPlaying(false); setT(0); stopToastRef.current = false;
    (async () => {
      try {
        const qs = `device_id=${encodeURIComponent(deviceId)}&from=${encodeURIComponent(eatIso(from))}&to=${encodeURIComponent(eatIso(to))}`;
        const r = await fetch(`/api/mainapp/playback?${qs}`, { cache: "no-store" });
        const d = r.ok ? await r.json() : { route: null, incidents: [] };
        if (alive) { setRoute(d.route || null); setIncidents(Array.isArray(d.incidents) ? d.incidents : []); }
      } catch { if (alive) { setRoute(null); setIncidents([]); } }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [deviceId, from, to]);

  useEffect(() => {
    function onDoc(e) { if (devWrap.current && !devWrap.current.contains(e.target)) setOpenDev(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const points = route?.points || [];
  const totalT = points.length ? points[points.length - 1].t : 0;
  const startSec = route?.start_sec ?? 25200;
  // labels for exports + the transport bar (the day, and the full range)
  const fileDate = (from ? from.slice(0, 10) : todayStr());
  const rangeLabel = (from && to) ? `${from.replace("T", " ")} → ${to.slice(11)}` : fileDate;

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
    incMarkers.current.forEach((m) => m.setMap(null)); incMarkers.current = [];
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
    // incident (alarm) pins — red, with a click-to-read label
    (incidents || []).forEach((inc) => {
      if (inc.lat == null || inc.lng == null) return;
      const mk = new maps.Marker({
        map, position: { lat: Number(inc.lat), lng: Number(inc.lng) },
        icon: routeDotIcon(maps, "#EF4444"), title: `${inc.name}${inc.priority ? ` · ${inc.priority}` : ""}`, zIndex: 4,
      });
      const iw = new maps.InfoWindow({ content: `<div style="font-weight:700;color:#b91c1c;font-size:12.5px">⚠ ${String(inc.name || "Alarm").replace(/</g, "&lt;")}</div><div style="color:#64748b;font-size:11.5px">${inc.priority || ""} · ${fmtClock(startSec, inc.t || 0)}</div>` });
      mk.addListener("click", () => iw.open({ map, anchor: mk }));
      incMarkers.current.push(mk);
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

  // Screen-record the REAL playback (Google Maps) as it auto-plays, build the
  // coordinates/incidents CSV, then add both to the session Exports list. The
  // browser asks which screen/tab to share — choose "This tab".
  async function runExport() {
    if (!route || !points.length || exporting) return;
    setExporting(true); setExportPct(0); setPlaying(false); setT(0);
    let recCtl = null;
    try {
      // Ask for the screen share first (needs the click gesture), then play.
      recCtl = await startScreenRecording({ deviceId, date: fileDate });
      flash("Recording the map… choose “This tab” if prompted");
      await new Promise((r) => setTimeout(r, 600)); // let the share settle
      // Drive the playback slowly ourselves (the 1× loop is too fast to record):
      // sweep t from 0 → end over a calm 18–45s so the map pans gently.
      setPlaying(false); setT(0);
      const durMs = Math.min(45000, Math.max(18000, Math.round(totalT * 55)));
      const t0 = Date.now();
      await new Promise((res) => {
        const iv = setInterval(() => {
          const p = Math.min(1, (Date.now() - t0) / durMs);
          setT(Math.round(p * totalT));
          setExportPct(Math.round(p * 100));
          if (p >= 1) { clearInterval(iv); res(); }
        }, 50);
      });
      await new Promise((r) => setTimeout(r, 500)); // hold the final frame
      recCtl.stop();
      const { blob, name } = await recCtl.done;
      const videoUrl = URL.createObjectURL(blob);
      const csvUrl = URL.createObjectURL(new Blob([buildRouteCsv(route, incidents, deviceId, fileDate)], { type: "text/csv;charset=utf-8;" }));
      addExport({
        device: deviceId, date: fileDate,
        durationMin: route.summary?.duration_min ?? Math.round(totalT / 60),
        distanceKm: route.summary?.total_km ?? null,
        incidents: incidents.length,
        video: { url: videoUrl, name },
        csv: { url: csvUrl, name: `${deviceId}_${fileDate}_route.csv` },
      });
      flash("Export ready — opening Exports…");
      setTimeout(() => router.push("/mainapp/playback/exports"), 800);
    } catch (e) {
      if (recCtl) recCtl.stop();
      flash(e?.name === "NotAllowedError" ? "Screen share cancelled" : (e?.message || "Export failed"));
    } finally { setExporting(false); setExportPct(0); }
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

          <div className={styles.lab}>FROM</div>
          <input type="datetime-local" className={styles.in} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <div className={styles.lab} style={{ marginTop: 8 }}>TO</div>
          <input type="datetime-local" className={styles.in} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          <div className={styles.quick}>
            <button type="button" onClick={() => { setFrom(`${todayStr()}T00:00`); setTo(nowLocalInput()); }}>Today</button>
            <button type="button" onClick={() => { const d = new Date(Date.now() - 864e5); const p = (n) => (n < 10 ? "0" : "") + n; const ds = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; setFrom(`${ds}T00:00`); setTo(`${ds}T23:59`); }}>Yesterday</button>
            <button type="button" onClick={() => { const now = new Date(); const p = (n) => (n < 10 ? "0" : "") + n; const f = new Date(now.getTime() - 3600e3); setFrom(`${f.getFullYear()}-${p(f.getMonth() + 1)}-${p(f.getDate())}T${p(f.getHours())}:${p(f.getMinutes())}`); setTo(nowLocalInput()); }}>Last hour</button>
          </div>

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

              {incidents.length > 0 && (
                <>
                  <div className={styles.lab}>INCIDENTS ({incidents.length})</div>
                  {incidents.map((inc) => (
                    <div key={inc.id} className={styles.rp} onClick={() => { setPlaying(false); setT(inc.t || 0); }}>
                      <span className={styles.rpDot} style={{ background: "#EF4444" }} />
                      <div>
                        <div className={styles.rpName}>{inc.name}</div>
                        <div className={styles.rpSub}>{inc.priority} · {fmtClock(startSec, inc.t || 0)}</div>
                      </div>
                    </div>
                  ))}
                </>
              )}

              <button className={styles.export} onClick={runExport} disabled={exporting}>
                <i className={`ti ${exporting ? "ti-loader-2" : "ti-screen-share"}`} style={{ fontSize: 15 }} />
                {exporting ? ` Recording… ${exportPct}%` : " Record & export (MP4 + CSV)"}
              </button>
              <a className={styles.exportsLink} href="/mainapp/playback/exports"><i className="ti ti-files" style={{ fontSize: 14 }} /> View exports</a>
            </>
          ) : !loading ? (
            <div style={{ marginTop: 18, fontSize: 12.5, color: "#94a3b8" }}>No route recorded for this device in this time range.</div>
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
                  <span className={styles.dropbox}>{rangeLabel}</span>
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
