// app/mainapp/simulator/components/Simulator.jsx
// Device Simulator — craft GL-28 packets for any device and send them the way a
// physical tracker would: over TCP to the running listener (default), or injected
// straight into the pipeline. Click the map to set coordinates; build a path and
// stream it as a moving route, then replay it in Playback.
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./simulator.module.css";
import { fetchMapsConfig, loadGoogleMaps } from "../../lib/googleMaps.js";

const SCENARIOS = [
  { key: "normal", label: "Normal", desc: "healthy fix, no alarm" },
  { key: "disturbance", label: "Disturbance", desc: "motion 00100008" },
  { key: "overspeed", label: "Critical motion", desc: "92 km/h" },
  { key: "lowbattery", label: "Low battery", desc: "12%" },
  { key: "geofence", label: "Geofence exit", desc: "~3 km from site" },
  { key: "carry", label: "Carried (no GPS)", desc: "sustained MEMS, no fix" },
  { key: "all", label: "All (burst)", desc: "one of each" },
];

function now() { try { return new Date().toLocaleTimeString(); } catch { return ""; } }
function todayUTC() { try { return new Date().toISOString().slice(0, 10); } catch { return ""; } }

// Build the EXACT GL-28 frame the server will send (mirrors ingest/simPackets.buildUD)
// so you can preview + confirm the wire data before firing. Only the timestamp is
// live — the server re-stamps it at send time.
function padz(n, w) { return String(n).padStart(w, "0"); }
function previewFrame(step, imei) {
  if (!step || !imei) return "";
  const d = new Date();
  const date = padz(d.getUTCDate(), 2) + padz(d.getUTCMonth() + 1, 2) + padz(d.getUTCFullYear() % 100, 2);
  const time = padz(d.getUTCHours(), 2) + padz(d.getUTCMinutes(), 2) + padz(d.getUTCSeconds(), 2);
  const lat = Number(step.lat), lng = Number(step.lng);
  const aLat = Math.abs(lat).toFixed(6), aLng = Math.abs(lng).toFixed(6);
  const latH = lat < 0 ? "S" : "N", lngH = lng < 0 ? "W" : "E";
  const speed = step.speed, angle = 0, altitude = 1650, sats = 9, gsm = 80, battery = 88, fix = "A";
  const m = { valid: true, x: 20, y: -12, z: 1010, roll: 0.4, pitch: 0.9, temp: 30 };
  const memsTail = `,${m.valid ? "+1" : "+0"},${m.x},${m.y},${m.z},${m.roll},${m.pitch},${m.temp}`;
  const body =
    `UD,${date},${time},${fix},${aLat},${latH},${aLng},${lngH},` +
    `${speed},${angle},${altitude},${sats},${gsm},${battery},0,0,${step.motionByte},` +
    `1,255,639,02,10256,93847880,155,` +
    `HomeWiFi,F4:2A:7D:50:DD:C6,-87` + memsTail;
  const len = padz(body.length.toString(16).toUpperCase(), 4);
  return `[3G*${imei}*${len}*${body}]`;
}

// A 20-frame vandalism scenario you fire one packet at a time. The FRAME CONTENT
// (position / speed / motion byte) is what makes the engine raise each alarm:
//   • 5× on-site disturbance (deep inside the 30 m fence) — the 4th raises Disturbance
//   • 3× carrying out — the 1st crosses the fence → Geofence Exit
//   • 12× motorbike escape (fast, off-site) — the 1st → Critical Motion
function scenarioSteps(base) {
  const bLat = Number(base?.lat) || 0, bLng = Number(base?.lng) || 0;
  const cosLat = Math.max(0.2, Math.cos((bLat * Math.PI) / 180));
  const at = (m) => { const deg = m / 111000, c = deg * 0.70710678; return { lat: Number((bLat + c).toFixed(6)), lng: Number((bLng + c / cosLat).toFixed(6)) }; };
  const S = [];
  const add = (phase, label, expects, meters, speed) => { const p = at(meters); S.push({ phase, label, expects, meters: Math.round(meters), speed, motionByte: "00100008", lat: p.lat, lng: p.lng }); };
  [6, 7, 8, 7, 9].forEach((m, i) => add("On-site disturbance", i < 3 ? `Tampering ${i + 1}` : (i === 3 ? "Tampering 4 → raises DISTURBANCE" : "Tampering 5"), i === 3 ? "DISTURBANCE" : null, m, 1));
  [45, 150, 300].forEach((m, i) => add("Carrying out", i === 0 ? "Cross the 30 m fence → GEOFENCE EXIT" : "Walking to the road", i === 0 ? "GEOFENCE_EXIT" : null, m, 3));
  [[420, 72], [900, 80], [1500, 86], [2200, 90], [2900, 88], [3500, 84], [4100, 82], [4600, 86], [5000, 90], [5400, 84], [5800, 80], [6200, 78]]
    .forEach(([m, s], i) => add("Motorbike escape", i === 0 ? "On the motorbike → CRITICAL MOTION" : `Fleeing ${i + 1}`, i === 0 ? "CRITICAL_MOTION" : null, m, s));
  return S; // 20 frames
}

export default function Simulator() {
  const [devices, setDevices] = useState([]);
  const [imei, setImei] = useState("");
  const [customImei, setCustomImei] = useState(false);
  const [base, setBase] = useState({ lat: -1.542, lng: 37.262 });

  const [mode, setMode] = useState("tcp");
  const [host, setHost] = useState("127.0.0.1");
  const [port, setPort] = useState(9000);

  const [kind, setKind] = useState("scenario");
  const [scenario, setScenario] = useState("disturbance");

  const [custom, setCustom] = useState({
    lat: -1.542, lng: 37.262, speed: 30, battery: 90, motionByte: "00000008", fix: "A",
    mems: { enabled: true, valid: true, x: 20, y: -12, z: 1010, roll: 0.4, pitch: 0.9, temp: 30.2 },
  });
  const [raw, setRaw] = useState("[3G*863957075080470*00A3*UD,010826,195602,V,0.0,N,0.0,E,0,0,0,0,88,55,0,0,00100008,1,255,639,02,10256,93847880,155,+1,60,-140,1040,-7.7,-3.3,29.6]");

  const [streaming, setStreaming] = useState(false);
  const [interval, setIntervalMs] = useState(1000);
  const [busy, setBusy] = useState(false);
  const [simBusy, setSimBusy] = useState(false);
  const [simDate, setSimDate] = useState("");
  const [steps, setSteps] = useState([]);      // manual step-through scenario
  const [stepIdx, setStepIdx] = useState(0);   // how many frames sent
  const [stepBusy, setStepBusy] = useState(false);
  const [frameEdit, setFrameEdit] = useState(""); // editable raw frame to send next
  const [log, setLog] = useState([]);

  // map + path
  const [mapErr, setMapErr] = useState("");
  const [pathMode, setPathMode] = useState(false);
  const [path, setPath] = useState([]);
  const [sendingPath, setSendingPath] = useState(false);

  const streamRef = useRef(null);
  const logRef = useRef(null);
  const mapRef = useRef(null);
  const gmap = useRef(null);
  const gmaps = useRef(null);
  const marker = useRef(null);
  const pathLine = useRef(null);
  const pathMarkers = useRef([]);
  const pathModeRef = useRef(false);
  const customRef = useRef(custom);
  useEffect(() => { pathModeRef.current = pathMode; }, [pathMode]);
  useEffect(() => { customRef.current = custom; }, [custom]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/mainapp/devices", { cache: "no-store" });
        const d = await r.json();
        const list = Array.isArray(d.devices) ? d.devices : [];
        setDevices(list);
        if (list.length) selectDevice(list[0], list);
      } catch {}
    })();
    return () => streamRef.current && clearInterval(streamRef.current);
    // eslint-disable-next-line
  }, []);

  // init the Google map
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await fetchMapsConfig();
        if (!cfg.apiKey) { setMapErr("nokey"); return; }
        const maps = await loadGoogleMaps(cfg);
        if (cancelled || !mapRef.current) return;
        gmaps.current = maps;
        const center = { lat: Number(base.lat) || -1.29, lng: Number(base.lng) || 36.82 };
        const map = new maps.Map(mapRef.current, {
          center, zoom: 13, mapTypeId: "roadmap", streetViewControl: false, fullscreenControl: false, mapTypeControl: true,
        });
        gmap.current = map;
        marker.current = new maps.Marker({ map, position: center, draggable: true });
        marker.current.addListener("dragend", (e) => setPoint(e.latLng.lat(), e.latLng.lng()));
        pathLine.current = new maps.Polyline({ map, path: [], strokeColor: "#2E6CF5", strokeOpacity: 0.9, strokeWeight: 3 });
        map.addListener("click", (e) => {
          const lat = e.latLng.lat(), lng = e.latLng.lng();
          if (pathModeRef.current) addPathPoint(lat, lng);
          else setPoint(lat, lng);
        });
      } catch { setMapErr("fail"); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line
  }, []);

  function setPoint(lat, lng) {
    const la = Number(lat.toFixed(6)), ln = Number(lng.toFixed(6));
    setCustom((c) => ({ ...c, lat: la, lng: ln }));
    setKind("custom");
    if (marker.current) marker.current.setPosition({ lat: la, lng: ln });
    if (gmap.current) gmap.current.panTo({ lat: la, lng: ln });
  }

  function addPathPoint(lat, lng) {
    const p = { lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)) };
    setPath((prev) => {
      const next = [...prev, p];
      if (pathLine.current) pathLine.current.setPath(next);
      if (gmaps.current && gmap.current) {
        const m = new gmaps.current.Marker({
          map: gmap.current, position: p,
          label: { text: String(next.length), color: "#fff", fontSize: "10px" },
          icon: { path: gmaps.current.SymbolPath.CIRCLE, scale: 9, fillColor: "#2E6CF5", fillOpacity: 1, strokeColor: "#fff", strokeWeight: 2 },
        });
        pathMarkers.current.push(m);
      }
      return next;
    });
  }
  function clearPath() {
    setPath([]);
    if (pathLine.current) pathLine.current.setPath([]);
    pathMarkers.current.forEach((m) => m.setMap(null));
    pathMarkers.current = [];
  }

  function selectDevice(dev, list = devices) {
    if (!dev) return;
    setImei(dev.imei);
    const lat = dev.site_lat != null ? Number(dev.site_lat) : base.lat;
    const lng = dev.site_lng != null ? Number(dev.site_lng) : base.lng;
    setBase({ lat, lng });
    setCustom((c) => ({ ...c, lat, lng }));
    if (gmap.current) { gmap.current.panTo({ lat, lng }); if (marker.current) marker.current.setPosition({ lat, lng }); }
  }

  function pushLog(entry) { setLog((prev) => [{ id: Date.now() + Math.random(), at: now(), ...entry }, ...prev].slice(0, 200)); }

  function baseBody() { return { imei, mode, host, port: Number(port) || 9000, lat: base.lat, lng: base.lng }; }
  function buildBody() {
    const body = { ...baseBody(), kind };
    if (kind === "scenario") body.scenario = scenario;
    else if (kind === "custom") body.custom = custom;
    else if (kind === "raw") body.raw = raw;
    return body;
  }

  async function postSim(body) {
    const r = await fetch("/api/mainapp/ingest/simulate", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
    });
    return { ok: r.ok, d: await r.json().catch(() => ({})) };
  }

  async function send() {
    if (kind !== "raw" && !imei) { pushLog({ err: "Pick a device or enter an IMEI first" }); return; }
    setBusy(true);
    try {
      const { ok, d } = await postSim(buildBody());
      if (!ok || d.error) { pushLog({ err: d.error || "Send failed" }); return; }
      logSent(d);
    } catch { pushLog({ err: "Network error" }); }
    finally { setBusy(false); }
  }

  function logSent(d) {
    const sent = d.sent || [];
    const alarms = (d.results || []).flatMap((x) => x.alarms || []);
    pushLog({ ok: true, mode: d.mode, count: sent.length, who: kind === "raw" ? "raw" : `${imei}`,
      detail: kind === "scenario" ? scenario : kind, packets: sent, ack: (d.received || []).join(" ").trim(), alarms });
  }

  function toggleStream() {
    if (streaming) { clearInterval(streamRef.current); streamRef.current = null; setStreaming(false); return; }
    setStreaming(true); send();
    streamRef.current = setInterval(send, Math.max(300, Number(interval) || 1000));
  }

  // Stream the path points in order — records a moving route you can replay in Playback.
  async function sendPath() {
    if (!imei) { pushLog({ err: "Pick a device first" }); return; }
    if (path.length < 2) { pushLog({ err: "Add at least 2 path points (turn on Path mode and click the map)" }); return; }
    setSendingPath(true);
    const c = customRef.current;
    const gap = Math.max(300, Number(interval) || 1000);
    pushLog({ ok: true, mode, count: path.length, who: imei, detail: `path (${path.length} pts)`, packets: [] });
    for (let i = 0; i < path.length; i++) {
      const pt = path[i];
      const custom = { ...c, lat: pt.lat, lng: pt.lng, speed: c.speed || 30 };
      try { await postSim({ ...baseBody(), kind: "custom", custom }); } catch {}
      if (marker.current) marker.current.setPosition(pt);
      if (i < path.length - 1) await new Promise((r) => setTimeout(r, gap));
    }
    setSendingPath(false);
    pushLog({ ok: true, mode, count: path.length, who: imei, detail: "path sent — open in Playback", packets: [] });
  }

  // One-click critical-alarms tracking simulation: server injects a moving route
  // that raises Disturbance + Critical Motion + Geofence, so Playback has real
  // recorded telemetry + incidents to replay and export.
  async function runCriticalSim() {
    if (!imei) { pushLog({ err: "Pick a device first" }); return; }
    setSimBusy(true);
    pushLog({ ok: true, mode: "inject", count: 0, who: imei, detail: "critical-alarms simulation started…", packets: [] });
    try {
      const r = await fetch("/api/mainapp/ingest/simulate-critical", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imei, deviceId: dev?.device_id, lat: base.lat, lng: base.lng, paceSec: 120, stepSec: 20 }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { pushLog({ err: d.error || "Simulation failed" }); return; }
      setSimDate(d.date || "");
      pushLog({ ok: true, mode: "tcp", count: d.sent, who: imei,
        detail: `vandalism scenario over TCP → ${d.host || "127.0.0.1"}:${d.port} — on-site disturbance, then geofence exit, then critical motion (motorbike) @ ${Math.round((d.pace_seconds || 120) / 60)} min pace, then ${d.fast_step_seconds || 3}s streaming for ${d.fast_minutes || 5} min · ${d.points} pts · date ${d.date}`,
        packets: [], alarms: d.alarms || [] });
    } catch { pushLog({ err: "Network error" }); }
    finally { setSimBusy(false); }
  }

  // (Re)build the step-through scenario whenever the selected device/site changes.
  useEffect(() => { setSteps(scenarioSteps(base)); setStepIdx(0); }, [base.lat, base.lng]);
  // Load the next frame into the editable box whenever the step (or device) changes,
  // with a fresh timestamp. The user can then tweak battery/speed/coords before sending.
  useEffect(() => { setFrameEdit(previewFrame(steps[stepIdx], imei)); }, [stepIdx, imei, steps]);

  // Fire the NEXT frame over the real TCP port. Frame content decides the alarm.
  async function sendNextStep() {
    if (!imei) { pushLog({ err: "Pick a device first" }); return; }
    if (stepIdx >= steps.length) { pushLog({ err: "Scenario complete — press Restart to run it again" }); return; }
    const s = steps[stepIdx];
    const raw = (frameEdit || "").trim();
    if (!raw) { pushLog({ err: "Nothing to send — the frame is empty" }); return; }
    setStepBusy(true);
    try {
      const r = await fetch("/api/mainapp/ingest/sim-frame", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imei, raw, reset: stepIdx === 0 }),   // send the (possibly edited) raw frame verbatim
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok || d.error) { pushLog({ err: d.error || "Send failed" }); return; }
      pushLog({ ok: true, mode: "tcp", count: 1, who: imei,
        detail: `step ${stepIdx + 1}/${steps.length} · ${s.phase} — ${s.label}${s.expects ? ` · ⇒ ${s.expects}` : ""} · port ${d.port}`,
        packets: [d.frame], alarms: s.expects ? [s.expects] : [] });
      setStepIdx((i) => i + 1);
      setSimDate(todayUTC());   // real-time data lands under today → open it in Playback
    } catch { pushLog({ err: "Network error" }); }
    finally { setStepBusy(false); }
  }
  async function restartScenario() {
    setStepIdx(0);
    // Clear the engine counters on the server NOW so the disturbance debounce truly
    // restarts from zero — it will only raise on the 4th disturbance packet again.
    if (imei) {
      try { await fetch("/api/mainapp/ingest/sim-frame", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imei, resetOnly: true }) }); } catch {}
    }
    pushLog({ ok: true, mode: "sys", who: imei, detail: "scenario reset — engine counters cleared; Disturbance raises on the 4th packet", packets: [] });
  }

  const dev = devices.find((x) => x.imei === imei);
  const pbDate = simDate || todayUTC();
  const nextStep = steps[stepIdx] || null;
  const playbackHref = dev?.device_id ? `/mainapp/playbackmap?device=${encodeURIComponent(dev.device_id)}&date=${pbDate}` : null;

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Device simulator</div>
          <div className={styles.sub}>Craft GL-28 packets for any device and send them like a real tracker — click the map to place them, stream a path, then replay it in Playback.</div>
        </div>
        <div className={styles.headRight}>
          <select className={styles.critDev} value={imei} disabled={simBusy}
            onChange={(e) => { const d = devices.find((x) => x.imei === e.target.value); if (d) selectDevice(d); }}
            title="Device to simulate">
            {devices.length === 0 && <option value="">No devices</option>}
            {devices.map((x) => (<option key={x.id || x.imei} value={x.imei}>{x.device_id || x.imei}</option>))}
          </select>
          <button className={styles.critBtn} onClick={runCriticalSim} disabled={simBusy || !imei}>
            <i className={`ti ${simBusy ? "ti-loader-2" : "ti-alert-triangle"}`} aria-hidden="true" /> {simBusy ? "Simulating…" : "Run critical-alarms simulation"}
          </button>
          {playbackHref && <a className={styles.pbLink} href={playbackHref}><i className="ti ti-player-play" aria-hidden="true" /> Open in Playback</a>}
          <span className={`${styles.modePill} ${mode === "tcp" ? styles.modeTcp : styles.modeInject}`}>{mode === "tcp" ? "TCP → listener" : "Direct inject"}</span>
        </div>
      </div>

      {/* Manual step-through — you fire each frame; the frame decides the alarm. */}
      <div className={styles.stepCard}>
        <div className={styles.stepHead}>
          <div>
            <div className={styles.stepTitle}>Step-through scenario — you trigger each event</div>
            <div className={styles.stepSub}>Fire one GL-28 frame per click over the real TCP port. The frame’s data (position · speed · motion byte) is what raises each alarm — so you control exactly when Disturbance → Geofence → Critical happen, then build realistic data for Playback &amp; reports.</div>
          </div>
          <div className={styles.stepBtns}>
            <span className={styles.stepProg}>{stepIdx}/{steps.length} sent</span>
            <button className={styles.stepGo} onClick={sendNextStep} disabled={stepBusy || !imei || stepIdx >= steps.length}>
              <i className={`ti ${stepBusy ? "ti-loader-2" : "ti-send"}`} /> {stepIdx >= steps.length ? "Scenario complete" : (stepBusy ? "Sending…" : `Send next data (#${stepIdx + 1})`)}
            </button>
            <button className={styles.stepReset} onClick={restartScenario} disabled={stepBusy}><i className="ti ti-refresh" /> Restart</button>
          </div>
        </div>

        {nextStep && (
          <>
            <div className={styles.stepNext}>
              <span className={styles.stepNextTag}>NEXT</span>
              <span className={styles.stepNextPhase}>{nextStep.phase}</span>
              <span className={styles.stepNextLabel}>{nextStep.label}</span>
              <span className={styles.stepNextMeta}>{nextStep.meters} m from site · {nextStep.speed} km/h · byte {nextStep.motionByte} · {nextStep.lat}, {nextStep.lng}</span>
              {nextStep.expects && <span className={styles.stepExpect}>⇒ {nextStep.expects}</span>}
            </div>
            <div className={styles.stepFrameWrap}>
              <div className={styles.stepFrameTop}>
                <div className={styles.stepFrameLbl}>Frame to send <span className={styles.stepFrameHint}>(editable — change battery, speed, coords… then Send)</span></div>
                <button type="button" className={styles.stepRegen} onClick={() => setFrameEdit(previewFrame(nextStep, imei))} title="Regenerate from the scenario (fresh timestamp)"><i className="ti ti-refresh" /> Reset frame</button>
              </div>
              <textarea className={styles.stepFrame} value={frameEdit} spellCheck={false} onChange={(e) => setFrameEdit(e.target.value)} />
            </div>
          </>
        )}

        <div className={styles.stepBottom}>
          <div className={styles.stepPane}>
            <div className={styles.stepPaneH}>Scenario frames ({stepIdx}/{steps.length})</div>
            <div className={styles.stepList}>
              {steps.map((s, i) => {
                const state = i < stepIdx ? "sent" : i === stepIdx ? "next" : "todo";
                return (
                  <div key={i} className={`${styles.stepRow} ${state === "next" ? styles.stepRowNext : ""} ${state === "sent" ? styles.stepRowSent : ""}`}>
                    <span className={styles.stepNum}>{i + 1}</span>
                    <div className={styles.stepMain}>
                      <div className={styles.stepMainTop}>{s.phase} — {s.label}</div>
                      <div className={styles.stepMainSub}>{s.meters} m · {s.speed} km/h · byte {s.motionByte}</div>
                    </div>
                    {s.expects ? <span className={styles.stepBadge}>{s.expects.replace("_", " ")}</span> : null}
                    <span className={styles.stepState}>{state === "sent" ? "✓" : state === "next" ? "→" : ""}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.stepPane}>
            <div className={styles.stepPaneH}>Transcript</div>
            <div className={styles.logWrap} ref={logRef}>
              {log.length === 0 && <div className={styles.logEmpty}>Nothing sent yet.</div>}
              {log.map((l) => (
                <div key={l.id} className={`${styles.logRow} ${l.err ? styles.logErr : ""}`}>
                  <span className={styles.logAt}>{l.at}</span>
                  {l.err ? <span className={styles.logMsg}>⚠ {l.err}</span> : (
                    <span className={styles.logMsg}>
                      <b>{l.mode}</b> · {l.who} · {l.detail} · {l.count} pkt
                      {l.alarms && l.alarms.length ? <span className={styles.logAlarm}> · alarms: {l.alarms.join(", ")}</span> : ""}
                      {l.ack ? <span className={styles.logAck}> · ack {l.ack.slice(0, 40)}</span> : ""}
                      {l.packets && l.packets[0] ? <div className={styles.logPkt} title={l.packets.join("\n")}>{l.packets[0]}</div> : null}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* map */}
      <div className={styles.mapCard}>
        {mapErr ? (
          <div className={styles.mapFallback}>
            <i className="ti ti-map-off" aria-hidden="true" />
            {mapErr === "nokey" ? "Add a Google Maps key in Admin → Google Maps to pick coordinates on a map." : "Map couldn't load — you can still type coordinates below."}
          </div>
        ) : <div ref={mapRef} className={styles.map} />}
        <div className={styles.mapBar}>
          <label className={styles.chk}>
            <input type="checkbox" checked={pathMode} onChange={(e) => setPathMode(e.target.checked)} /> Path mode — click to drop route points
          </label>
          <span className={styles.mapCoord}>{custom.lat}, {custom.lng}</span>
          <span className={styles.spacer} />
          <span className={styles.mapPts}>{path.length} pts</span>
          <button className={styles.pathBtn} onClick={sendPath} disabled={sendingPath || path.length < 2}>
            <i className="ti ti-route" aria-hidden="true" /> {sendingPath ? "Streaming path…" : "Send path"}
          </button>
          <button className={styles.mini} onClick={clearPath} disabled={!path.length}>Clear</button>
        </div>
      </div>

      <div className={styles.grid}>
        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardH}>Device</div>
            {!customImei ? (
              <select className={styles.input} value={imei} onChange={(e) => selectDevice(devices.find((x) => x.imei === e.target.value))}>
                {devices.length === 0 && <option value="">No devices found</option>}
                {devices.map((x) => (<option key={x.id || x.imei} value={x.imei}>{x.device_id || x.imei} — {x.site || "no site"} ({x.imei})</option>))}
              </select>
            ) : (
              <input className={styles.input} placeholder="Enter IMEI, e.g. 863957075080470" value={imei} onChange={(e) => setImei(e.target.value)} />
            )}
            <label className={styles.chk}><input type="checkbox" checked={customImei} onChange={(e) => setCustomImei(e.target.checked)} /> Use a custom IMEI</label>
            <div className={styles.baseRow}>
              <div className={styles.field}><label>Site lat</label><input className={styles.input} value={base.lat} onChange={(e) => setBase((b) => ({ ...b, lat: e.target.value }))} /></div>
              <div className={styles.field}><label>Site lng</label><input className={styles.input} value={base.lng} onChange={(e) => setBase((b) => ({ ...b, lng: e.target.value }))} /></div>
            </div>
            <div className={styles.hint}>Geofence scenario is measured from these coordinates{dev?.site ? ` (${dev.site})` : ""}.</div>
          </div>

          <div className={styles.card}>
            <div className={styles.tabs}>
              {["scenario", "custom", "raw"].map((k) => (
                <button key={k} className={`${styles.tab} ${kind === k ? styles.tabOn : ""}`} onClick={() => setKind(k)}>
                  {k === "scenario" ? "Scenario" : k === "custom" ? "Custom" : "Raw packet"}
                </button>
              ))}
            </div>

            {kind === "scenario" && (
              <div className={styles.scenGrid}>
                {SCENARIOS.map((s) => (
                  <button key={s.key} className={`${styles.scen} ${scenario === s.key ? styles.scenOn : ""}`} onClick={() => setScenario(s.key)}>
                    <span className={styles.scenLabel}>{s.label}</span><span className={styles.scenDesc}>{s.desc}</span>
                  </button>
                ))}
              </div>
            )}

            {kind === "custom" && (
              <div className={styles.customWrap}>
                <div className={styles.row3}>
                  <div className={styles.field}><label>Latitude</label><input className={styles.input} value={custom.lat} onChange={(e) => setCustom({ ...custom, lat: e.target.value })} /></div>
                  <div className={styles.field}><label>Longitude</label><input className={styles.input} value={custom.lng} onChange={(e) => setCustom({ ...custom, lng: e.target.value })} /></div>
                  <div className={styles.field}><label>Fix</label><select className={styles.input} value={custom.fix} onChange={(e) => setCustom({ ...custom, fix: e.target.value })}><option value="A">A (valid)</option><option value="V">V (no fix)</option></select></div>
                </div>
                <div className={styles.row3}>
                  <div className={styles.field}><label>Speed (km/h)</label><input className={styles.input} type="number" value={custom.speed} onChange={(e) => setCustom({ ...custom, speed: e.target.value })} /></div>
                  <div className={styles.field}><label>Battery (%)</label><input className={styles.input} type="number" value={custom.battery} onChange={(e) => setCustom({ ...custom, battery: e.target.value })} /></div>
                  <div className={styles.field}><label>Motion byte</label>
                    <div className={styles.motRow}>
                      <input className={styles.input} value={custom.motionByte} onChange={(e) => setCustom({ ...custom, motionByte: e.target.value })} />
                      <button className={styles.mini} onClick={() => setCustom({ ...custom, motionByte: "00000008" })}>normal</button>
                      <button className={styles.mini} onClick={() => setCustom({ ...custom, motionByte: "00100008" })}>disturb</button>
                    </div>
                  </div>
                </div>
                <label className={styles.chk}><input type="checkbox" checked={custom.mems.enabled} onChange={(e) => setCustom({ ...custom, mems: { ...custom.mems, enabled: e.target.checked } })} /> Include MEMS tail</label>
                {custom.mems.enabled && (
                  <div className={styles.memsWrap}>
                    <label className={styles.chk}><input type="checkbox" checked={custom.mems.valid} onChange={(e) => setCustom({ ...custom, mems: { ...custom.mems, valid: e.target.checked } })} /> valid (+1)</label>
                    <div className={styles.row3}>
                      <div className={styles.field}><label>X mg</label><input className={styles.input} type="number" value={custom.mems.x} onChange={(e) => setCustom({ ...custom, mems: { ...custom.mems, x: e.target.value } })} /></div>
                      <div className={styles.field}><label>Y mg</label><input className={styles.input} type="number" value={custom.mems.y} onChange={(e) => setCustom({ ...custom, mems: { ...custom.mems, y: e.target.value } })} /></div>
                      <div className={styles.field}><label>Z mg</label><input className={styles.input} type="number" value={custom.mems.z} onChange={(e) => setCustom({ ...custom, mems: { ...custom.mems, z: e.target.value } })} /></div>
                    </div>
                    <div className={styles.row3}>
                      <div className={styles.field}><label>Roll°</label><input className={styles.input} value={custom.mems.roll} onChange={(e) => setCustom({ ...custom, mems: { ...custom.mems, roll: e.target.value } })} /></div>
                      <div className={styles.field}><label>Pitch°</label><input className={styles.input} value={custom.mems.pitch} onChange={(e) => setCustom({ ...custom, mems: { ...custom.mems, pitch: e.target.value } })} /></div>
                      <div className={styles.field}><label>Temp °C</label><input className={styles.input} value={custom.mems.temp} onChange={(e) => setCustom({ ...custom, mems: { ...custom.mems, temp: e.target.value } })} /></div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {kind === "raw" && (
              <div><textarea className={styles.raw} rows={4} value={raw} onChange={(e) => setRaw(e.target.value)} /><div className={styles.hint}>Sent verbatim over the wire. Header IMEI is used for routing.</div></div>
            )}
          </div>
        </div>

        <div className={styles.col}>
          <div className={styles.card}>
            <div className={styles.cardH}>Delivery</div>
            <div className={styles.tabs}>
              <button className={`${styles.tab} ${mode === "tcp" ? styles.tabOn : ""}`} onClick={() => setMode("tcp")}>Over TCP (real listener)</button>
              <button className={`${styles.tab} ${mode === "inject" ? styles.tabOn : ""}`} onClick={() => setMode("inject")}>Direct inject</button>
            </div>
            {mode === "tcp" ? (
              <div className={styles.row2}>
                <div className={styles.field}><label>Listener host</label><input className={styles.input} value={host} onChange={(e) => setHost(e.target.value)} /></div>
                <div className={styles.field}><label>Port</label><input className={styles.input} type="number" value={port} onChange={(e) => setPort(e.target.value)} /></div>
              </div>
            ) : (
              <div className={styles.hint}>Feeds packets straight through the parser + store — no need to run <code>ingest/server.js</code>. Downlink/ACK isn&rsquo;t exercised in this mode.</div>
            )}
            <div className={styles.sendRow}>
              <button className={styles.send} onClick={send} disabled={busy || streaming}><i className="ti ti-send" aria-hidden="true" /> {busy ? "Sending…" : "Send"}</button>
              <button className={`${styles.stream} ${streaming ? styles.streamOn : ""}`} onClick={toggleStream}><i className={`ti ${streaming ? "ti-player-stop" : "ti-player-play"}`} aria-hidden="true" /> {streaming ? "Stop" : "Stream"}</button>
              <div className={styles.field}><label>every (ms)</label><input className={styles.inputSm} type="number" value={interval} onChange={(e) => setIntervalMs(e.target.value)} /></div>
            </div>
            <div className={styles.hint} style={{ marginTop: 10 }}>The live transcript is in the step-through panel above (next to the scenario frames).</div>
          </div>
        </div>
      </div>
    </div>
  );
}
