// app/mainapp/devices/view/components/ViewDevice.jsx
// View Device — a faithful port of the prototype (assetguard_web_view_device):
// header with inline status change, a mini map with the geofence, battery/data
// meters, editable device details (SIM, geofence radius, motion sensitivity,
// upload interval, mounting notes), the installation photo, an activity log
// (live from the audit trail) and an actions sidebar. Wired to
// /api/mainapp/devices/[id] (GET / PATCH / DELETE).
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "./viewdevice.module.css";
import { fetchMapsConfig, loadGoogleMaps, devicePinIcon, deviceStatusColor } from "../../../lib/googleMaps.js";

const STATUSES = ["Live", "Offline", "Testing", "Inactive", "Maintenance"];
const STATUS_PILL = {
  Live: ["#D1FAE5", "#065F46", "#10B981"], Offline: ["#FEE2E2", "#991B1B", "#EF4444"],
  Testing: ["#FEF3C7", "#92400E", "#F59E0B"], Inactive: ["#EDE9FE", "#5B21B6", "#8B5CF6"],
  Maintenance: ["#E0F2FE", "#075985", "#0EA5E9"],
};
const RADII = ["25", "50", "100", "250", "500"];
// Reporting cadence (GL-28 `update,N`): 3–60 seconds. [value(seconds), label].
const INTERVALS = [["3", "3 seconds"], ["5", "5 seconds"], ["10", "10 seconds"], ["15", "15 seconds"], ["20", "20 seconds"], ["30", "30 seconds"], ["45", "45 seconds"], ["60", "60 seconds (1 min)"]];
// Wake (sleep) interval in MINUTES. [value, label]. Default 24 h.
const WAKE = [["6", "6 min"], ["10", "10 min"], ["15", "15 min"], ["30", "30 min"], ["60", "1 hour"], ["120", "2 hours"], ["360", "6 hours"], ["720", "12 hours"], ["1440", "24 hours"]];
const MUTE_UNITS = ["minutes", "hours", "days"];
const fmtWake = (sec) => { const m = Math.round((Number(sec) || 0) / 60); return m % 1440 === 0 && m >= 1440 ? `${m / 1440} d` : m % 60 === 0 && m >= 60 ? `${m / 60} h` : `${m} min`; };
const DATA_CAP_GB = 5;

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
function parseGB(s) { const n = parseFloat(String(s || "").replace(/[^0-9.]/g, "")); return Number.isFinite(n) ? n : 0; }

export default function ViewDevice() {
  const router = useRouter();
  const params = useSearchParams();
  const deviceId = params.get("device") || "";

  const [device, setDevice] = useState(null);
  const [activity, setActivity] = useState([]);
  const [latestFw, setLatestFw] = useState("v2.4.1");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [mapErr, setMapErr] = useState("");
  const [editing, setEditing] = useState(false);
  const [busyFw, setBusyFw] = useState(false);
  const [decomArmed, setDecomArmed] = useState(false);
  const [pwrArmed, setPwrArmed] = useState(false);
  const [toast, setToast] = useState("");
  const [track, setTrack] = useState([]);

  // editable draft
  const [dImei, setDImei] = useState("");
  const [dSim, setDSim] = useState("");
  const [dGeo, setDGeo] = useState("100");
  const [dMot, setDMot] = useState(50);
  const [dInt, setDInt] = useState("3");
  const [dWake, setDWake] = useState("1440");   // wake interval draft, minutes
  const [dNotes, setDNotes] = useState("");
  const [muteAmt, setMuteAmt] = useState(2);
  const [muteUnit, setMuteUnit] = useState("hours");

  const mapRef = useRef(null);
  const decomTimer = useRef(null);

  async function load() {
    try {
      const r = await fetch(`/api/mainapp/devices/${encodeURIComponent(deviceId)}`, { cache: "no-store" });
      if (r.status === 404) { setNotFound(true); setLoading(false); return; }
      const d = r.ok ? await r.json() : null;
      if (!d?.device) { setNotFound(true); setLoading(false); return; }
      setDevice(d.device);
      setActivity(Array.isArray(d.activity) ? d.activity : []);
      if (d.latestFirmware) setLatestFw(d.latestFirmware);
      // Latest available firmware is a platform-wide setting (Admin → Firmware).
      try {
        const fr = await fetch("/api/mainapp/firmware-config", { cache: "no-store" });
        const fd = await fr.json();
        if (fr.ok && fd.firmware?.latest) setLatestFw(fd.firmware.latest);
      } catch {}
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [deviceId]);

  // config-derived values
  const cfg = device?.config || {};
  // Read the FLAT geofence_radius_m the engine uses (fall back to the legacy nested key).
  const geoRadius = String(cfg?.geofence_radius_m ?? cfg?.geofence?.radius_m ?? 30);
  const motion = Number(cfg?.motion_sensitivity ?? 30);
  const intervalSec = Number(cfg?.upload_interval_s ?? 3);
  const interval = intervalSec ? `${intervalSec}s` : "—";
  const wakeSec = Number(cfg?.wake_interval_sec ?? 86400);
  const wakeMin = Math.round(wakeSec / 60);
  const pendingWakeSec = cfg?.pending_wake_interval_sec != null ? Number(cfg.pending_wake_interval_sec) : null;
  const muteActive = device?.mute_until && new Date(device.mute_until) > new Date();
  const usage = device?.data_usage || null;
  const fmtMbC = (mb) => (mb == null ? "—" : mb >= 1024 ? `${Math.round((mb / 1024) * 100) / 100} GB` : `${Math.round(mb)} MB`);
  const notes = cfg?.mounting_notes || "—";
  const firmware = device?.firmware || "v2.3.8";
  const updateAvailable = firmware !== latestFw;

  useEffect(() => {
    if (!device) return;
    setDImei(device.imei || "");
    setDSim(device.sim || "");
    setDGeo(geoRadius);
    setDMot(motion);
    setDInt(String(intervalSec || 3));
    setDWake(String(wakeMin || 1440));
    setDNotes(cfg?.mounting_notes || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device]);

  // tracker log history — parsed telemetry for this device (by IMEI)
  useEffect(() => {
    if (!device?.imei) return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`/api/mainapp/ingest/telemetry?imei=${encodeURIComponent(device.imei)}&newest=1&limit=25`, { cache: "no-store" });
        if (!r.ok) return;
        const d = await r.json();
        if (!cancelled) setTrack(Array.isArray(d.telemetry) ? d.telemetry : []);
      } catch {}
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [device?.imei]);

  // mini map preview
  useEffect(() => {
    if (loading || notFound || !device) return;
    const lat = device.site_lat != null ? Number(device.site_lat) : null;
    const lng = device.site_lng != null ? Number(device.site_lng) : null;
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) { setMapErr("nocoord"); return; }
    let cancelled = false;
    (async () => {
      try {
        const c = await fetchMapsConfig();
        if (!c.apiKey) { setMapErr("nokey"); return; }
        const maps = await loadGoogleMaps(c);
        if (cancelled || !mapRef.current) return;
        const pos = { lat, lng };
        const map = new maps.Map(mapRef.current, {
          center: pos, zoom: 17, mapTypeId: "roadmap", disableDefaultUI: true, gestureHandling: "none", keyboardShortcuts: false,
        });
        new maps.Marker({ map, position: pos, icon: devicePinIcon(maps, device.status), optimized: false });
        // Geofence ring — blue circle. Fit the map to its bounds so it's always visible
        // (a 30 m ring is only a few pixels at a fixed zoom).
        const circle = new maps.Circle({
          map, center: pos, radius: Number(geoRadius) || 30,
          strokeColor: "#2E6CF5", strokeOpacity: 0.95, strokeWeight: 2.5,
          fillColor: "#2E6CF5", fillOpacity: 0.14,
        });
        try {
          const b = circle.getBounds();
          if (b) {
            map.fitBounds(b, 24); // 24px padding around the ring
            // Don't zoom in past 18 for a tiny geofence.
            maps.event.addListenerOnce(map, "idle", () => { if (map.getZoom() > 18) map.setZoom(18); });
          }
        } catch {}
      } catch { setMapErr("fail"); }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, notFound, device, geoRadius]);

  function flash(msg) { setToast(msg); setTimeout(() => setToast(""), 2400); }

  async function patch(body, okMsg) {
    try {
      const r = await fetch(`/api/mainapp/devices/${encodeURIComponent(deviceId)}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { flash(d.error || "Update failed"); return false; }
      if (d.device) setDevice(d.device);
      if (okMsg) flash(okMsg);
      await load();
      return true;
    } catch { flash("Network error"); return false; }
  }

  function changeStatus(v) { patch({ status: v }, `Status changed to ${v}`); }
  // Power off (deactivate): queue *HQ,IMEI,pwroff#. Sends on the device's next wake;
  // when it acks, the device is set INACTIVE (sticky — reinstate manually later).
  async function powerOff() {
    if (!device?.id) return;
    if (!pwrArmed) { setPwrArmed(true); setTimeout(() => setPwrArmed(false), 4000); return; }
    setPwrArmed(false);
    try {
      const r = await fetch("/api/mainapp/devices/commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [device.id], op: "poweroff" }),
      });
      flash(r.ok ? "Power-off queued — sends on the device's next wake, then it goes Inactive" : "Could not queue power-off");
    } catch { flash("Could not queue power-off"); }
  }

  async function updateFirmware() {
    if (busyFw || !updateAvailable || !device?.id) return;
    setBusyFw(true);
    // Queue the OTA command — it sends on the device's next wake (no critical alarm),
    // and the device is labelled to the latest version only once it CONFIRMS by
    // reporting again. We do NOT set firmware directly here.
    try {
      const r = await fetch("/api/mainapp/devices/commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [device.id], op: "firmware" }),
      });
      flash(r.ok ? `Firmware update to ${latestFw} queued — applies on next wake, confirmed when it reports back`
                 : "Could not queue the firmware update");
    } catch { flash("Could not queue the firmware update"); }
    setBusyFw(false);
  }
  async function sendPing() {
    if (!device?.id) return;
    try {
      const r = await fetch("/api/mainapp/devices/commands", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [device.id], op: "ping" }),
      });
      flash(r.ok ? "Test ping queued — confirms when the device next reports" : "Could not queue ping");
    } catch { flash("Network error"); }
  }
  async function applyMute(amount, unit) {
    if (!device?.id) return;
    try {
      const r = await fetch("/api/mainapp/devices/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [device.id], op: "mute", value: { amount, unit } }),
      });
      if (r.ok) { flash(amount > 0 ? `Alerts muted for ${amount} ${unit}` : "Alerts unmuted"); load(); }
      else flash("Could not update mute");
    } catch { flash("Network error"); }
  }
  async function resetDataBundle() {
    if (!device?.id) return;
    if (typeof window !== "undefined" && !window.confirm("Reset the data-bundle counter? Usage starts from zero now.")) return;
    try {
      const r = await fetch("/api/mainapp/devices/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [device.id], op: "dreset" }),
      });
      if (r.ok) { flash("Data bundle reset — counting from now"); load(); }
      else flash("Could not reset data bundle");
    } catch { flash("Network error"); }
  }
  async function saveEdits() {
    const imei = dImei.trim();
    if (!/^\d{14,17}$/.test(imei)) { flash("IMEI must be 14–17 digits"); return; }
    const body = {
      sim: dSim.trim() || null,
      // Canonical flat keys the engine + sync read. Wake interval is NOT written here —
      // it's queued as a command and only becomes active when the device confirms it.
      config: { geofence_enabled: true, geofence_radius_m: Number(dGeo), motion_sensitivity: Number(dMot), upload_interval_s: Number(dInt), mounting_notes: dNotes.trim() || null },
    };
    if (imei !== String(device?.imei || "").trim()) body.imei = imei; // only send when changed
    const ok = await patch(body, "Device details saved");
    if (ok) {
      setEditing(false);
      // Only fields that REQUIRE a device command get one queued, and only when they
      // actually changed. (Geofence radius, notes, SIM and IMEI are registry-only — no
      // command.) Commands send on the device's next wake.
      const queued = [];
      const prevMot = Number(cfg?.motion_sensitivity ?? 50);
      if (device?.id && Number(dInt) !== intervalSec) {
        try {
          const r = await fetch("/api/mainapp/devices/commands", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [device.id], op: "interval", value: Number(dInt) }),
          });
          if (r.ok) queued.push(`interval ${dInt}s`);
        } catch { /* config saved; command best-effort */ }
      }
      if (device?.id && Number(dMot) !== prevMot) {
        try {
          const r = await fetch("/api/mainapp/devices/commands", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [device.id], op: "sensitivity", value: Number(dMot) }),
          });
          if (r.ok) queued.push(`sensitivity ${dMot}`);
        } catch { /* config saved; command best-effort */ }
      }
      // Wake interval → queue UPT. Backend stores it pending; it becomes active only
      // when the device ACK-confirms (so the interval "resets" only after success).
      if (device?.id && Number(dWake) !== wakeMin) {
        try {
          const r = await fetch("/api/mainapp/devices/commands", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ids: [device.id], op: "upt", value: Number(dWake) }),
          });
          if (r.ok) { queued.push(`wake ${dWake} min (pending)`); load(); }
        } catch { /* config saved; command best-effort */ }
      }
      if (queued.length) flash(`Queued to the device on next wake: ${queued.join(", ")}`);
    }
  }
  function decommission() {
    if (!decomArmed) {
      setDecomArmed(true);
      if (decomTimer.current) clearTimeout(decomTimer.current);
      decomTimer.current = setTimeout(() => setDecomArmed(false), 3000);
      return;
    }
    (async () => {
      try {
        const r = await fetch(`/api/mainapp/devices/${encodeURIComponent(deviceId)}`, { method: "DELETE" });
        if (!r.ok) { flash("Decommission failed"); return; }
        router.push("/mainapp/devices");
      } catch { flash("Network error"); }
    })();
  }

  const pill = STATUS_PILL[device?.status] || STATUS_PILL.Live;
  const battery = device?.battery ?? 0;
  const battColor = battery < 20 ? "#DC2626" : "#059669";
  const dataGB = parseGB(device?.data_left);
  const dataPct = Math.max(0, Math.min(100, (dataGB / DATA_CAP_GB) * 100));

  if (notFound) {
    return (
      <div className={styles.page}>
        <div className={styles.head}>
          <button className={styles.back} onClick={() => router.push("/mainapp/devices")} aria-label="Back"><i className="ti ti-arrow-left" /></button>
          <div className={styles.title}>Device not found</div>
        </div>
        <div className={styles.sec}>That device doesn’t exist. <a href="/mainapp/devices">Back to all devices</a>.</div>
      </div>
    );
  }
  if (loading || !device) {
    return <div className={styles.page}><div className={styles.sec}>Loading device…</div></div>;
  }

  return (
    <div className={styles.page}>
      {/* header */}
      <div className={styles.head}>
        <button className={styles.back} onClick={() => router.back()} aria-label="Back"><i className="ti ti-arrow-left" /></button>
        <div>
          <div className={styles.titleRow}>
            <span className={styles.title}>{device.device_id}</span>
            <span className={styles.ori}>{String(device.orientation || "").toUpperCase() || "—"}</span>
            <span className={styles.statusPill} style={{ background: pill[0] }}>
              <span className={styles.statusDot} style={{ background: pill[2] }} />
              <select className={styles.statusSel} style={{ color: pill[1] }} value={device.status} onChange={(e) => changeStatus(e.target.value)}>
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <span className={styles.statusChev} style={{ color: pill[1] }}>▾</span>
            </span>
          </div>
          <div className={styles.sub}>{device.site || "—"} · {device.site_code || "—"} · change status directly above</div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* main column */}
        <div>
          {/* map preview */}
          <div className={styles.mapBox}>
            {mapErr ? (
              <div className={styles.mapFallback}>
                <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 700 160" preserveAspectRatio="none"><path d="M0 54 C160 44 340 66 700 50" stroke="#fff" strokeWidth="4" fill="none" /></svg>
                <div className={styles.geoCircle} style={{ width: 96, height: 96 }} />
                <div className={styles.pinDot} style={{ background: deviceStatusColor(device.status) }}><i className="ti ti-gps" /></div>
              </div>
            ) : <div ref={mapRef} className={styles.mapReal} />}
            <span className={styles.geoChip}><i className="ti ti-map-pin-cog" style={{ fontSize: 12 }} />Geofence {geoRadius}m</span>
            {device.site_lat != null && device.site_lng != null
              ? <span className={styles.mapChip}>{Number(device.site_lat).toFixed(4)}, {Number(device.site_lng).toFixed(4)}</span> : null}
          </div>

          {/* battery + data */}
          <div className={styles.stats}>
            <div className={styles.stat}>
              <div className={styles.statK}>BATTERY</div>
              <div className={styles.statV} style={{ color: battColor }}>{battery}%</div>
              <div className={styles.bar}><span style={{ width: `${battery}%`, background: battColor === "#DC2626" ? "#EF4444" : "#10B981" }} /></div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statK}>DATA BUNDLE <span style={{ fontWeight: 600, color: "#94a3b8" }}>(est.)</span></div>
              <div className={styles.statV} style={{ color: "#475569" }}>
                {usage?.assigned_mb ? `${fmtMbC(usage.remaining_mb)} left` : "No plan"}
                {usage?.assigned_mb ? <span className={styles.statSub}> / {fmtMbC(usage.assigned_mb)}</span> : null}
              </div>
              <div className={styles.bar}><span style={{ width: `${usage?.pct != null ? Math.min(100, usage.pct) : 0}%`, background: (usage?.pct ?? 0) >= 90 ? "#EF4444" : "#0EA5E9" }} /></div>
              <div className={styles.statSub} style={{ marginTop: 4 }}>
                {usage ? `used ${fmtMbC(usage.used_mb)} · ↑${fmtMbC(usage.up_mb)} ↓${fmtMbC(usage.down_mb)}${usage.since ? "" : " · all-time"}` : "—"}
              </div>
            </div>
          </div>

          {/* device details */}
          <div className={styles.sec}>
            <div className={styles.secH}><span className={styles.chip} style={{ background: "#D1FAE5", color: "#047857" }}><i className="ti ti-cpu" /></span>Device details<span className={styles.editingLbl}>{editing ? "Editing…" : ""}</span></div>
            <div className={styles.detGrid}>
              <div><div className={styles.dl}>DEVICE ID</div><div className={styles.dv}>{device.device_id}</div></div>
              <div>
                <div className={styles.dl}>IMEI</div>
                {editing
                  ? <input className={styles.in} value={dImei} onChange={(e) => setDImei(e.target.value.replace(/[^\d]/g, ""))} inputMode="numeric" maxLength={17} placeholder="15-digit IMEI" />
                  : <div className={styles.dv}>{device.imei}</div>}
              </div>
              <div>
                <div className={styles.dl}>SIM NUMBER</div>
                {editing ? <input className={styles.in} value={dSim} onChange={(e) => setDSim(e.target.value)} placeholder="e.g. +254 7…" />
                  : <div className={styles.dv}>{device.sim || "—"}</div>}
              </div>
              <div>
                <div className={styles.dl}>GEOFENCE RADIUS</div>
                {editing ? <select className={styles.in} value={dGeo} onChange={(e) => setDGeo(e.target.value)}>{RADII.map((r) => <option key={r} value={r}>{r} m</option>)}</select>
                  : <div className={styles.dv}>{geoRadius} m</div>}
              </div>
              <div>
                <div className={styles.dl}>MOTION SENSITIVITY</div>
                {editing ? (
                  <div><input type="range" min="1" max="50" value={dMot} className={styles.slider} onChange={(e) => setDMot(Number(e.target.value))} /><div className={styles.hint}>{dMot} / 50 · 1 = most sensitive · 50 = least sensitive</div></div>
                ) : <div className={styles.dv}>{motion} / 50</div>}
              </div>
              <div>
                <div className={styles.dl}>MOVING INTERVAL</div>
                {editing ? <select className={styles.in} value={dInt} onChange={(e) => setDInt(e.target.value)}>{INTERVALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  : <div className={styles.dv}>{interval}</div>}
              </div>
              <div>
                <div className={styles.dl}>WAKE-UP INTERVAL</div>
                {editing ? <select className={styles.in} value={dWake} onChange={(e) => setDWake(e.target.value)}>{WAKE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
                  : <div className={styles.dv}>{fmtWake(wakeSec)}{pendingWakeSec != null && pendingWakeSec !== wakeSec ? <span style={{ color: "#B45309", fontWeight: 700, marginLeft: 5 }}>→ {fmtWake(pendingWakeSec)} pending</span> : null}</div>}
              </div>
              <div><div className={styles.dl}>FIRMWARE</div><div className={styles.dv}>{firmware}{updateAvailable ? <span className={styles.fwUpd}>UPDATE AVAILABLE</span> : null}</div></div>
              <div><div className={styles.dl}>LAST SEEN</div><div className={styles.dv}>{relTime(device.last_seen)}</div></div>
            </div>
            <div className={styles.notesBlock}>
              <div className={styles.dl}>MOUNTING NOTES</div>
              {editing ? <textarea className={styles.notesTa} value={dNotes} onChange={(e) => setDNotes(e.target.value)} placeholder="e.g. Mounted on the north perimeter pole, 3m up" />
                : <div className={styles.dv} style={{ fontWeight: 500 }}>{notes}</div>}
            </div>
            <div className={styles.editRow}>
              {editing ? (
                <>
                  <button className={styles.primary} onClick={saveEdits}>Save changes</button>
                  <button className={styles.ghost} onClick={() => { setEditing(false); }}>Cancel</button>
                </>
              ) : (
                <button className={styles.ghost} onClick={() => setEditing(true)}><i className="ti ti-pencil" style={{ fontSize: 14, color: "#2e6cf5" }} />Edit details</button>
              )}
            </div>
          </div>

          {/* installation photo */}
          <div className={styles.sec}>
            <div className={styles.secH}><span className={styles.chip} style={{ background: "#EDE9FE", color: "#7C3AED" }}><i className="ti ti-camera" /></span>Installation photo</div>
            <div className={styles.photoWrap}>
              <svg viewBox="0 0 700 190"><rect width="700" height="190" fill="#BFDBFE" /><rect y="145" width="700" height="45" fill="#A8B8A0" /><rect x="320" y="20" width="16" height="150" fill="#64748B" /><rect x="260" y="35" width="130" height="24" rx="3" fill="#334155" /></svg>
              <div className={styles.photoCap}><i className="ti ti-camera" style={{ fontSize: 13 }} />{cfg?.install_photo ? `Installation photo · ${cfg.install_photo}` : "Installation photo on file"}</div>
            </div>
          </div>

          {/* tracker log history — parsed telemetry from the device */}
          <div className={styles.sec}>
            <div className={styles.secH}>
              <span className={styles.chip} style={{ background: "#DBE7FE", color: "#2E6CF5" }}><i className="ti ti-router" /></span>
              Tracker log
              <span className={styles.editingLbl}>{track.length ? `last ${track.length}` : ""}</span>
            </div>
            {track.length ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                  <thead>
                    <tr style={{ color: "#64748B", textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>
                      <th style={{ padding: "6px 8px" }}>Time</th>
                      <th style={{ padding: "6px 8px" }}>Position</th>
                      <th style={{ padding: "6px 8px" }}>Speed</th>
                      <th style={{ padding: "6px 8px" }}>Batt</th>
                      <th style={{ padding: "6px 8px" }}>Motion</th>
                      <th style={{ padding: "6px 8px" }}>Temp</th>
                    </tr>
                  </thead>
                  <tbody>
                    {track.map((t) => {
                      const dz = t.motion_byte && ["00100008", "00100009"].includes(String(t.motion_byte).toUpperCase());
                      return (
                        <tr key={t.id} style={{ borderTop: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "6px 8px", whiteSpace: "nowrap" }}>{relTime(t.received_at)}</td>
                          <td style={{ padding: "6px 8px", fontFamily: "ui-monospace, monospace", fontSize: 11.5, color: "#475569" }}>
                            {t.lat == null || t.lng == null ? "no fix" : `${Number(t.lat).toFixed(5)}, ${Number(t.lng).toFixed(5)}`}
                          </td>
                          <td style={{ padding: "6px 8px" }}>{t.speed != null ? `${t.speed} km/h` : "—"}</td>
                          <td style={{ padding: "6px 8px", color: t.battery != null && t.battery <= 20 ? "#DC2626" : "#0F274A" }}>
                            {t.battery != null ? `${t.battery}%` : "—"}
                          </td>
                          <td style={{ padding: "6px 8px" }}>
                            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 700, padding: "2px 6px", borderRadius: 6, background: dz ? "#FEE2E2" : "#F1F5F9", color: dz ? "#B91C1C" : "#64748B" }}>
                              {t.motion_byte || "—"}
                            </span>
                          </td>
                          <td style={{ padding: "6px 8px" }}>{t.temperature != null ? `${t.temperature}°C` : "—"}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className={styles.actEmpty}>No tracker telemetry yet — once this device (IMEI {device.imei}) reports in, its packets appear here. You can also open TCP logs to watch data arrive live.</div>
            )}
          </div>

          {/* activity log */}
          <div className={styles.sec}>
            <div className={styles.secH}><span className={styles.chip} style={{ background: "#FEE2E2", color: "#DC2626" }}><i className="ti ti-history" /></span>Activity log</div>
            {activity.length ? activity.map((a, i) => (
              <div key={i} className={styles.act}>
                <span className={styles.actIco} style={{ background: "#D1FAE5", color: "#047857" }}><i className="ti ti-circle-check" /></span>
                <div style={{ flex: 1 }}><div className={styles.actTitle}>{a.action}</div><div className={styles.actSub}>{a.detail || (a.actor_name ? `By ${a.actor_name}` : "")}</div></div>
                <span className={styles.actDate}>{a.date}</span>
              </div>
            )) : <div className={styles.actEmpty}>No activity recorded yet — status changes, firmware updates and edits will appear here.</div>}
          </div>
        </div>

        {/* actions sidebar */}
        <div className={styles.aside}>
          <div className={styles.sec}>
            <div className={styles.secH} style={{ marginBottom: 9 }}><span className={styles.chip} style={{ background: "#DBE7FE", color: "#2E6CF5" }}><i className="ti ti-bolt" /></span>Actions</div>
            <button className={`${styles.primary} ${styles.wFull}`} onClick={() => router.push(`/mainapp/track?device=${encodeURIComponent(device.device_id)}`)}>Track Device</button>
            <button className={`${styles.ghost} ${styles.wFull}`} onClick={updateFirmware} disabled={busyFw || !updateAvailable}>
              <i className={busyFw ? "ti ti-loader-2" : "ti ti-refresh"} style={{ fontSize: 14, color: "#2e6cf5" }} />
              {busyFw ? "Updating firmware…" : updateAvailable ? "Update firmware" : "Firmware up to date"}
            </button>
            <button className={`${styles.ghost} ${styles.wFull}`} onClick={sendPing}><i className="ti ti-antenna-bars-5" style={{ fontSize: 14 }} />Send test ping</button>
            {/* Mute alerts — pick amount + unit, or unmute */}
            <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8 }}>
              <input type="number" min={0} value={muteAmt} onChange={(e) => setMuteAmt(e.target.value)}
                style={{ width: 54, padding: "8px 8px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13 }} />
              <select value={muteUnit} onChange={(e) => setMuteUnit(e.target.value)}
                style={{ flex: 1, padding: "8px 8px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 13 }}>
                {MUTE_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
              <button className={styles.ghost} style={{ padding: "8px 12px" }} onClick={() => applyMute(Number(muteAmt) || 0, muteUnit)}><i className="ti ti-bell-off" style={{ fontSize: 14 }} />Mute</button>
            </div>
            {muteActive && (
              <button className={`${styles.ghost} ${styles.wFull}`} onClick={() => applyMute(0, "hours")}>
                <i className="ti ti-bell" style={{ fontSize: 14, color: "#047857" }} />Unmute (muted until {new Date(device.mute_until).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })})
              </button>
            )}
            <button className={`${styles.ghost} ${styles.wFull}`} onClick={resetDataBundle}><i className="ti ti-database-cog" style={{ fontSize: 14, color: "#b45309" }} />Reset data bundle</button>
            <button className={`${styles.ghost} ${styles.wFull}`} onClick={powerOff}>
              <i className="ti ti-power" style={{ fontSize: 14, color: pwrArmed ? "#dc2626" : "#8B5CF6" }} />{pwrArmed ? "Confirm power off (device → Inactive)?" : "Power off (deactivate)"}
            </button>
            <button className={`${styles.danger} ${styles.wFull}`} style={{ marginBottom: 0 }} onClick={decommission}>
              <i className={decomArmed ? "ti ti-alert-triangle" : "ti ti-trash"} style={{ fontSize: 14 }} />{decomArmed ? "Confirm decommission?" : "Decommission device"}
            </button>
          </div>
        </div>
      </div>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
