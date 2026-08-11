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
const INTERVALS = ["30 seconds", "1 minute", "5 minutes", "15 minutes", "1 hour"];
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
  const [toast, setToast] = useState("");
  const [track, setTrack] = useState([]);

  // editable draft
  const [dSim, setDSim] = useState("");
  const [dGeo, setDGeo] = useState("100");
  const [dMot, setDMot] = useState(50);
  const [dInt, setDInt] = useState("1 minute");
  const [dNotes, setDNotes] = useState("");

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
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [deviceId]);

  // config-derived values
  const cfg = device?.config || {};
  const geoRadius = String(cfg?.geofence?.radius_m ?? 100);
  const motion = Number(cfg?.motion_sensitivity ?? 50);
  const interval = cfg?.upload_interval || "1 minute";
  const notes = cfg?.mounting_notes || "—";
  const firmware = device?.firmware || "v2.3.8";
  const updateAvailable = firmware !== latestFw;

  useEffect(() => {
    if (!device) return;
    setDSim(device.sim || "");
    setDGeo(geoRadius);
    setDMot(motion);
    setDInt(interval);
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
          center: pos, zoom: 15, mapTypeId: "roadmap", disableDefaultUI: true, gestureHandling: "none", keyboardShortcuts: false,
        });
        new maps.Marker({ map, position: pos, icon: devicePinIcon(maps, device.status), optimized: false });
        new maps.Circle({ map, center: pos, radius: Number(geoRadius) || 100, strokeColor: "#2E6CF5", strokeOpacity: 0.8, strokeWeight: 2, fillColor: "#2E6CF5", fillOpacity: 0.08 });
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
  async function updateFirmware() {
    if (busyFw || !updateAvailable) return;
    setBusyFw(true);
    await patch({ firmware: latestFw }, `Firmware updated to ${latestFw} ✓`);
    setBusyFw(false);
  }
  function saveEdits() {
    patch({
      sim: dSim.trim() || null,
      config: { geofence: { enabled: true, radius_m: Number(dGeo) }, motion_sensitivity: Number(dMot), upload_interval: dInt, mounting_notes: dNotes.trim() || null },
    }, "Device details saved");
    setEditing(false);
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
            <a className={styles.liveMaps} href="/mainapp/devicemap"><i className="ti ti-map-2" style={{ fontSize: 13 }} />Live maps</a>
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
              <div className={styles.statK}>DATA BUNDLE REMAINING</div>
              <div className={styles.statV} style={{ color: "#475569" }}>{device.data_left || "—"} <span className={styles.statSub}>/ {DATA_CAP_GB} GB</span></div>
              <div className={styles.bar}><span style={{ width: `${dataPct}%`, background: "#0EA5E9" }} /></div>
            </div>
          </div>

          {/* device details */}
          <div className={styles.sec}>
            <div className={styles.secH}><span className={styles.chip} style={{ background: "#D1FAE5", color: "#047857" }}><i className="ti ti-cpu" /></span>Device details<span className={styles.editingLbl}>{editing ? "Editing…" : ""}</span></div>
            <div className={styles.detGrid}>
              <div><div className={styles.dl}>DEVICE ID</div><div className={styles.dv}>{device.device_id}</div></div>
              <div><div className={styles.dl}>IMEI</div><div className={styles.dv}>{device.imei}</div></div>
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
                  <div><input type="range" min="1" max="100" value={dMot} className={styles.slider} onChange={(e) => setDMot(Number(e.target.value))} /><div className={styles.hint}>{dMot} / 100 · 1 = low · 100 = high</div></div>
                ) : <div className={styles.dv}>{motion} / 100</div>}
              </div>
              <div>
                <div className={styles.dl}>UPLOAD INTERVAL</div>
                {editing ? <select className={styles.in} value={dInt} onChange={(e) => setDInt(e.target.value)}>{INTERVALS.map((i) => <option key={i} value={i}>{i}</option>)}</select>
                  : <div className={styles.dv}>{interval}</div>}
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
            <button className={`${styles.ghost} ${styles.wFull}`} onClick={() => flash("Test ping sent — response received in 340ms")}><i className="ti ti-antenna-bars-5" style={{ fontSize: 14 }} />Send test ping</button>
            <button className={`${styles.ghost} ${styles.wFull}`} onClick={() => flash("Alerts muted for this device for 2 hours")}><i className="ti ti-bell-off" style={{ fontSize: 14 }} />Mute alerts for 2 hours</button>
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
