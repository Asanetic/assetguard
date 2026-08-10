// app/mainapp/track/components/TrackDevice.jsx
// Track Device — pursue a moving asset on a real Google Map. The target device
// drifts live (green transmitting waves + growing breadcrumb trail); the operator's
// own position comes from the browser Geolocation API (blue waves). "Get directions"
// routes between them with the Google Directions API and re-routes as both move,
// and the blue speaker gives generated turn-by-turn voice guidance (separate from
// the alarm buzzer). Google's own controls are left in place; a my-location control
// and the guidance speaker are added alongside them.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./track.module.css";
import { fetchMapsConfig, loadGoogleMaps, createWaveOverlay, targetDeviceIcon, myLocationIcon } from "../../lib/googleMaps.js";
import { announce, setGuidanceMuted, cancelGuidance } from "../../lib/navGuidance.js";

const TARGET = "#EF4444", BLUE = "#2E6CF5";  // target device red, my-location blue

function haversine(a, b) {
  const R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180, la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function bearing(a, b) {
  const y = Math.sin((b.lng - a.lng) * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180);
  const x = Math.cos(a.lat * Math.PI / 180) * Math.sin(b.lat * Math.PI / 180) -
    Math.sin(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.cos((b.lng - a.lng) * Math.PI / 180);
  return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
}
function compass(deg) { return ["North", "North-east", "East", "South-east", "South", "South-west", "West", "North-west"][Math.round(deg / 45) % 8]; }
function stripHtml(s) { return String(s || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }

export default function TrackDevice() {
  const router = useRouter();
  const params = useSearchParams();
  const deviceId = params.get("device") || "";

  const [device, setDevice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapErr, setMapErr] = useState("");
  const [navOn, setNavOn] = useState(false);
  const [popOpen, setPopOpen] = useState(true);
  const [distText, setDistText] = useState("—");
  const [etaText, setEtaText] = useState("—");
  const [awayKm, setAwayKm] = useState(0);
  const [breach, setBreach] = useState(340);
  const [updatedSecs, setUpdatedSecs] = useState(1);
  const [toast, setToast] = useState("");
  const [notFound, setNotFound] = useState(false);

  const mapRef = useRef(null);
  const gmap = useRef(null);
  const mapsApi = useRef(null);
  const devMarker = useRef(null);
  const myMarker = useRef(null);
  const trailLine = useRef(null);
  const waveRef = useRef(null);
  const overlayRef = useRef(null);
  const popupEl = useRef(null);
  const dirService = useRef(null);
  const dirRenderer = useRef(null);

  const devPos = useRef(null);   // {lat,lng}
  const devStart = useRef(null);
  const myPos = useRef(null);
  const trail = useRef([]);
  const devHeading = useRef(52);
  const navOnRef = useRef(false);
  const lastRouteAt = useRef(0);
  const stepsRef = useRef([]);
  const curStepRef = useRef(-1);
  const guidanceMutedRef = useRef(false);
  const guidanceBtn = useRef(null);
  const speed = useRef(6);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2200); }

  // load the device (target) + its site coordinates
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/mainapp/devices", { cache: "no-store" });
        const d = r.ok ? await r.json() : { devices: [] };
        const dev = (d.devices || []).find((x) => x.device_id === deviceId) || null;
        if (!alive) return;
        if (!dev) { setNotFound(true); setLoading(false); return; }
        setDevice(dev);
        const lat = dev.site_lat != null ? Number(dev.site_lat) : null;
        const lng = dev.site_lng != null ? Number(dev.site_lng) : null;
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          devStart.current = { lat, lng };
          devPos.current = { lat, lng };
          trail.current = [{ lat, lng }];
          myPos.current = { lat: lat + 0.06, lng: lng + 0.055 }; // fallback until GPS arrives (~9 km away)
        }
      } catch { if (alive) setNotFound(true); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [deviceId]);

  // "updated Ns ago" ticker
  useEffect(() => { const id = setInterval(() => setUpdatedSecs((s) => (s >= 9 ? 1 : s + 1)), 1000); return () => clearInterval(id); }, []);

  // init map
  useEffect(() => {
    if (loading || notFound || !devPos.current) return;
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchMapsConfig();
        if (!cfg.apiKey) { setMapErr("nokey"); return; }
        const maps = await loadGoogleMaps(cfg);
        try { await maps.importLibrary("routes"); } catch { /* directions optional */ }
        if (cancelled || !mapRef.current) return;
        mapsApi.current = maps;

        // Google's own controls stay in their default positions.
        const map = new maps.Map(mapRef.current, {
          center: devPos.current, zoom: 13, mapTypeId: cfg.mapType || "roadmap",
          gestureHandling: "greedy", streetViewControl: false,
          zoomControl: true, fullscreenControl: true, mapTypeControl: true,
        });
        gmap.current = map;

        // custom controls alongside Google's (my-location + blue guidance speaker).
        // Styled inline (Google-control look) because they're DOM nodes outside React.
        const CTRL = "width:40px;height:40px;border-radius:2px;background:#fff;border:0;box-shadow:0 1px 4px rgba(0,0,0,.3);cursor:pointer;display:flex;align-items:center;justify-content:center;margin:10px 10px 0 0;font-size:20px;";
        const myLocBtn = document.createElement("button");
        myLocBtn.type = "button"; myLocBtn.title = "My location";
        myLocBtn.style.cssText = CTRL + "color:#5f6368;";
        myLocBtn.innerHTML = '<i class="ti ti-current-location"></i>';
        myLocBtn.onclick = () => { if (myPos.current) map.panTo(myPos.current); };
        map.controls[maps.ControlPosition.RIGHT_CENTER].push(myLocBtn);

        const gBtn = document.createElement("button");
        gBtn.type = "button"; gBtn.title = "Voice guidance";
        gBtn.style.cssText = CTRL + "color:#2e6cf5;";
        gBtn.innerHTML = '<i class="ti ti-volume"></i>';
        gBtn.onclick = () => {
          const m = !guidanceMutedRef.current;
          guidanceMutedRef.current = m; setGuidanceMuted(m);
          gBtn.style.color = m ? "#9aa0a6" : "#2e6cf5";
          gBtn.innerHTML = `<i class="ti ti-${m ? "volume-off" : "volume"}"></i>`;
          flash(m ? "Voice guidance muted" : "Voice guidance on");
        };
        guidanceBtn.current = gBtn;
        map.controls[maps.ControlPosition.RIGHT_CENTER].push(gBtn);

        // overlay for the custom popup + the transmitting/location waves
        const ov = new maps.OverlayView();
        ov.onAdd = () => {}; ov.onRemove = () => {};
        ov.draw = () => repositionPopup();
        ov.setMap(map);
        overlayRef.current = ov;
        waveRef.current = createWaveOverlay(maps, map, styles.wave);
        ["bounds_changed", "center_changed", "zoom_changed", "drag"].forEach((ev) => map.addListener(ev, repositionPopup));

        // breadcrumb trail (grey dashed) + device + my-location markers
        trailLine.current = new maps.Polyline({
          map, path: [devPos.current], strokeOpacity: 0, zIndex: 1,
          icons: [{ icon: { path: "M 0,-1 0,1", strokeColor: "#94a3b8", strokeOpacity: 1, scale: 2.5 }, offset: "0", repeat: "10px" }],
        });
        devMarker.current = new maps.Marker({ map, position: devPos.current, icon: targetDeviceIcon(maps, devHeading.current), zIndex: 6, optimized: false });
        devMarker.current.addListener("click", () => setPopOpen((v) => !v));
        myMarker.current = new maps.Marker({ map, position: myPos.current, icon: myLocationIcon(maps, 0), zIndex: 5, optimized: false });

        if (maps.DirectionsService) {
          dirService.current = new maps.DirectionsService();
          dirRenderer.current = new maps.DirectionsRenderer({ map, suppressMarkers: true, preserveViewport: true, polylineOptions: { strokeColor: BLUE, strokeWeight: 6, strokeOpacity: 0.9 } });
        }

        drawWaves();
        fitBoth();
        refreshDistance();
        setTimeout(repositionPopup, 60);
        startGeolocation();
      } catch (err) { setMapErr(err.message || "Map failed to load."); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, notFound]);

  // dynamic target: the device drifts every 4s (replace with live telemetry polling)
  useEffect(() => {
    if (loading || notFound) return;
    const id = setInterval(() => {
      if (!devPos.current || !devStart.current) return;
      const prev = { ...devPos.current };
      const next = {
        lat: Math.max(devStart.current.lat - 0.03, Math.min(devStart.current.lat + 0.03, devPos.current.lat + (Math.random() - 0.5) * 0.01)),
        lng: Math.max(devStart.current.lng - 0.03, Math.min(devStart.current.lng + 0.03, devPos.current.lng + (Math.random() - 0.5) * 0.01)),
      };
      devPos.current = next;
      devHeading.current = bearing(prev, next);
      trail.current.push(next); if (trail.current.length > 12) trail.current.shift();
      speed.current = Math.max(3, Math.round(6 + (Math.random() - 0.5) * 6));
      setBreach((b) => Math.max(140, Math.round(b + (Math.random() - 0.5) * 46)));
      setUpdatedSecs(1);
      applyDevice();
      refreshDistance();
      maybeRoute();
    }, 4000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, notFound]);

  function startGeolocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.watchPosition(
      (p) => {
        const np = { lat: p.coords.latitude, lng: p.coords.longitude };
        const prev = myPos.current;
        myPos.current = np;
        if (myMarker.current) {
          myMarker.current.setPosition(np);
          if (prev) myMarker.current.setIcon(myLocationIcon(mapsApi.current, p.coords.heading ?? bearing(prev, np)));
        }
        drawWaves(); refreshDistance(); maybeRoute();
      },
      () => { /* denied — keep the fallback origin */ },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );
  }

  function applyDevice() {
    const maps = mapsApi.current;
    if (!maps || !devMarker.current) return;
    devMarker.current.setPosition(devPos.current);
    devMarker.current.setIcon(targetDeviceIcon(maps, devHeading.current));
    if (trailLine.current) trailLine.current.setPath(trail.current);
    drawWaves(); repositionPopup();
  }
  function drawWaves() {
    if (!waveRef.current) return;
    const pts = [];
    if (devPos.current) pts.push({ ...devPos.current, color: TARGET }); // target — live transmitting
    if (myPos.current) pts.push({ ...myPos.current, color: BLUE });    // my location
    waveRef.current.setPoints(pts);
  }
  function fitBoth() {
    const maps = mapsApi.current, map = gmap.current;
    if (!maps || !map || !devPos.current || !myPos.current) return;
    const b = new maps.LatLngBounds(); b.extend(devPos.current); b.extend(myPos.current);
    map.fitBounds(b, 90);
  }

  function refreshDistance() {
    if (!devPos.current || !myPos.current) return;
    if (!navOnRef.current) { setAwayKm(+haversine(myPos.current, devPos.current).toFixed(1)); }
  }

  function maybeRoute() {
    if (!navOnRef.current || !dirService.current || !dirRenderer.current || !devPos.current || !myPos.current) return;
    const now = Date.now();
    if (now - lastRouteAt.current < 4000) return;
    lastRouteAt.current = now;
    dirService.current.route(
      { origin: myPos.current, destination: devPos.current, travelMode: mapsApi.current.TravelMode.DRIVING },
      (res, status) => {
        if (status !== "OK" || !res.routes[0]) return;
        dirRenderer.current.setDirections(res);
        const leg = res.routes[0].legs[0];
        setDistText(leg.distance?.text || "—");
        setEtaText(leg.duration?.text || "—");
        setAwayKm(leg.distance ? +(leg.distance.value / 1000).toFixed(1) : awayKm);
        stepsRef.current = leg.steps || [];
        advanceGuidance(true);
      }
    );
  }

  // announce the maneuver for the step nearest ahead of the operator
  function advanceGuidance(forceFirst) {
    if (!navOnRef.current || guidanceMutedRef.current || !myPos.current) return;
    const steps = stepsRef.current; if (!steps.length) return;
    let best = 0, bestD = Infinity;
    steps.forEach((s, i) => {
      const sp = s.start_location;
      const d = haversine(myPos.current, { lat: sp.lat(), lng: sp.lng() });
      if (d < bestD) { bestD = d; best = i; }
    });
    if (forceFirst || best !== curStepRef.current) {
      curStepRef.current = best;
      const instr = stripHtml(steps[best].instructions);
      const dist = steps[best].distance?.text ? ` in ${steps[best].distance.text}` : "";
      announce(`${instr}${dist}`);
    }
  }

  function toggleNav() {
    const on = !navOnRef.current;
    navOnRef.current = on; setNavOn(on);
    if (on) {
      lastRouteAt.current = 0; curStepRef.current = -1;
      maybeRoute();
      flash("Live route via Google Directions API");
    } else {
      if (dirRenderer.current) dirRenderer.current.set("directions", null);
      cancelGuidance();
      setDistText("—"); setEtaText("—");
      refreshDistance();
    }
  }

  function shareLoc() {
    const link = typeof window !== "undefined" ? `${window.location.origin}/mainapp/track?device=${encodeURIComponent(deviceId)}` : "";
    try { if (navigator.clipboard) navigator.clipboard.writeText(link); } catch {}
    flash("Live location link copied");
  }

  // ---- popup positioning ----
  function repositionPopup() {
    const ov = overlayRef.current, el = popupEl.current, maps = mapsApi.current;
    if (!ov || !el || !maps || !devPos.current) return;
    const proj = ov.getProjection(); if (!proj) return;
    const pt = proj.fromLatLngToContainerPixel(new maps.LatLng(devPos.current.lat, devPos.current.lng));
    if (!pt) return;
    el.style.left = Math.round(pt.x) + "px";
    el.style.top = Math.round(pt.y) + "px";
  }
  useEffect(() => { repositionPopup(); /* eslint-disable-next-line */ }, [popOpen, device]);

  const siteName = device?.site || "—";
  const siteCode = device?.site_code || "—";
  const battery = device?.battery != null ? `${device.battery}%` : "—";

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.mapOverlay}>
          <i className="ti ti-navigation-off" />
          <div>Device not found.<br /><a href="/mainapp/devices">Back to all devices</a></div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div ref={mapRef} className={styles.mapReal} />

      <button className={styles.back} onClick={() => router.back()} aria-label="Back"><i className="ti ti-arrow-left" /></button>

      {!mapErr && device ? (
        <div className={styles.chips}>
          <span className={styles.chip}><span className={`${styles.dot} ${styles.live}`} />LIVE</span>
          <span className={styles.chip}><span className={styles.dot} style={{ background: TARGET }} />{device.device_id}</span>
          <span className={styles.chip}><i className="ti ti-map-pin" style={{ fontSize: 13, color: "#059669" }} />{awayKm} km away</span>
        </div>
      ) : null}

      {/* device popup */}
      {!mapErr && device && popOpen ? (
        <div ref={popupEl} className={styles.popup}>
          <div className={styles.popCard}>
            <div className={styles.popHead}>
              <button className={styles.popX} onClick={() => setPopOpen(false)} aria-label="Close"><i className="ti ti-x" /></button>
              <div className={styles.popName}>{device.device_id}</div>
              <div className={styles.popSite}>{siteName} · {siteCode}</div>
            </div>
            <div className={styles.popBody}>
              <div className={styles.breach}><i className="ti ti-alert-triangle" style={{ fontSize: 14 }} />{breach}m outside its 100m geofence</div>
              <div className={styles.popRow}><span className={styles.popK}>Speed</span><span className={styles.popV}>{speed.current} km/h</span></div>
              <div className={styles.popRow}><span className={styles.popK}>Heading</span><span className={styles.popV}>{compass(devHeading.current)}</span></div>
              <div className={styles.popRow}><span className={styles.popK}>Battery</span><span className={styles.popV} style={{ color: "#059669" }}>{battery}</span></div>
              <div className={styles.popRow}><span className={styles.popK}>Updated</span><span className={styles.popV}>{updatedSecs}s ago</span></div>
              <div className={styles.popBtns}>
                <button className={styles.popBtn} onClick={() => flash("Device detail — coming soon")}>View device</button>
                <button className={styles.popBtn} onClick={() => flash("Alerts muted for this device")}>Mute alerts</button>
              </div>
            </div>
            <div className={styles.popTail} />
          </div>
        </div>
      ) : null}

      {mapErr === "nokey" ? (
        <div className={styles.mapOverlay}>
          <i className="ti ti-navigation" />
          <div>No Google Maps key found.<br />Set one in <a href="/mainapp/admin/maps">Admin → Google Maps</a> or add <code>GOOGLE_MAPS_API_KEY</code> to your .env.</div>
        </div>
      ) : mapErr ? (
        <div className={styles.mapOverlay}><i className="ti ti-alert-triangle" /><div>{mapErr}</div></div>
      ) : null}

      {/* bottom bar */}
      {!mapErr && device ? (
        <div className={styles.bar}>
          <div className={styles.stat}><div className={styles.statK}>DISTANCE</div><div className={styles.statV}>{navOn ? distText : `${awayKm} km`}</div></div>
          <div className={styles.sep} />
          <div className={styles.stat}><div className={styles.statK}>EST. DRIVE</div><div className={styles.statV}>{navOn ? etaText : `~${Math.round(awayKm * 1.8)} min`}</div></div>
          <div className={styles.sep} />
          <div className={styles.stat}><div className={styles.statK}>DEVICE SPEED</div><div className={styles.statV}>{speed.current} km/h</div></div>
          {navOn ? <span className={styles.apiTag}><span className={styles.dot} />Live route via Google Directions API</span> : null}
          <span className={styles.spacer} />
          <button className={styles.share} onClick={shareLoc} aria-label="Share live location"><i className="ti ti-share-2" /></button>
          <button className={`${styles.directions} ${navOn ? styles.directionsStop : ""}`} onClick={toggleNav}>
            <i className={navOn ? "ti ti-x" : "ti ti-directions"} style={{ fontSize: 18 }} />{navOn ? "Stop navigation" : "Get directions"}
          </button>
        </div>
      ) : null}

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
