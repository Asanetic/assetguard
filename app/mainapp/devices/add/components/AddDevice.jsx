// app/mainapp/devices/add/components/AddDevice.jsx
// "Add device" — a faithful port of the prototype (assetguard_web_add_device).
// A device is registered against a Site (identified by its numeric Site ID) with
// an orientation; the Device ID is generated server-side from
//   {site id}_{site name}_{V|H}
// and previewed live. Location is inherited from the site; battery comes from
// device heartbeats and data bundle from the Safaricom IoT API, so neither is
// entered here. Extra install settings (geofence / sensor / notes) are saved with
// the device.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./adddevice.module.css";

const STATUSES = ["Testing", "Live", "Maintenance", "Offline", "Inactive"];
const RADII = [["30", "30 m"], ["50", "50 m"], ["100", "100 m"], ["250", "250 m"], ["500", "500 m"]];
// Moving/report cadence (GL-28 update,N) in seconds. [value, label].
const INTERVALS = [["3", "3 seconds"], ["5", "5 seconds"], ["10", "10 seconds"], ["15", "15 seconds"], ["30", "30 seconds"], ["60", "60 seconds"]];
// Wake (sleep) interval in MINUTES. [value, label]. Default 24 h.
const WAKE = [["6", "6 min"], ["10", "10 min"], ["15", "15 min"], ["30", "30 min"], ["60", "1 hour"], ["120", "2 hours"], ["360", "6 hours"], ["720", "12 hours"], ["1440", "24 hours (default)"]];
const GEO_PX = { 30: 40, 50: 52, 100: 76, 250: 118, 500: 150 };

function siteId(code) { const m = String(code || "").match(/(\d+)\s*$/); return m ? m[1].padStart(3, "0") : "000"; }
function pascal(name) { return String(name || "").replace(/\s+/g, ""); }

export default function AddDevice() {
  const router = useRouter();
  const [sites, setSites] = useState([]);
  const [siteQ, setSiteQ] = useState("");
  const [site, setSite] = useState(null);
  const [openList, setOpenList] = useState(false);
  const [orientation, setOrientation] = useState("V");
  const [imei, setImei] = useState("");
  const [imeiErr, setImeiErr] = useState(false);
  const [sim, setSim] = useState("");
  const [status, setStatus] = useState("Testing");
  const [geoOn, setGeoOn] = useState(true);
  const [radius, setRadius] = useState("30");
  const [motion, setMotion] = useState(30);
  const [interval, setIntervalV] = useState("3");      // moving interval, seconds
  const [wakeMin, setWakeMin] = useState("1440");      // wake interval, minutes (24 h)
  const [photo, setPhoto] = useState(null); // { name, url }
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const wrapRef = useRef(null);
  const photoInput = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/mainapp/sites", { cache: "no-store" });
        const d = r.ok ? await r.json() : { sites: [] };
        const list = Array.isArray(d.sites) ? d.sites : [];
        setSites(list);
        if (list[0]) { setSite(list[0]); setSiteQ(list[0].name); }
      } catch { setSites([]); }
    })();
  }, []);

  useEffect(() => {
    function onDoc(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpenList(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const siteMatches = useMemo(() => {
    const f = siteQ.trim().toLowerCase();
    return sites.filter((s) => !f || `${s.name} ${s.code}`.toLowerCase().includes(f));
  }, [sites, siteQ]);

  const previewId = useMemo(() => {
    if (!site) return "—";
    return `${siteId(site.code)}_${pascal(site.name)}_${orientation}`;
  }, [site, orientation]);

  function pickSite(s) { setSite(s); setSiteQ(s.name); setOpenList(false); }

  function onPhoto(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setPhoto({ name: f.name, url: URL.createObjectURL(f) });
  }

  async function save() {
    setErr(""); setMsg("");
    if (!site) { setErr("Please choose a site."); return; }
    if (!imei.trim()) { setImeiErr(true); return; }
    setImeiErr(false);
    setBusy(true);
    const config = {
      // Canonical flat keys the alarm engine + command sync read.
      geofence_enabled: geoOn,
      geofence_radius_m: Number(radius),
      motion_sensitivity: Number(motion),
      upload_interval_s: Number(interval),
      wake_interval_sec: Number(wakeMin) * 60,
      mounting_notes: notes.trim() || null,
      install_photo: photo?.name || null,
    };
    try {
      const res = await fetch("/api/mainapp/devices", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ site_code: site.code, imei: imei.trim(), orientation, sim: sim.trim() || null, status, config }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setErr(d.error || "Could not add device"); setBusy(false); return; }
      setMsg(`Saved ${d.device?.device_id || previewId} — status: ${status} · sensitivity ${motion}/50${photo ? " · photo attached" : ""}`);
      setBusy(false);
      // reset for the next device (same site/orientation keeps auto-numbering)
      setImei(""); setSim(""); setNotes(""); setPhoto(null);
      setTimeout(() => router.push("/mainapp/devices"), 900);
    } catch { setErr("Network error while saving."); setBusy(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <button className={styles.back} onClick={() => router.push("/mainapp/devices")} aria-label="Back"><i className="ti ti-arrow-left" /></button>
        <div>
          <div className={styles.title}>Add device</div>
          <div className={styles.sub}>More device types are coming soon</div>
        </div>
      </div>

      <div className={styles.grid}>
        {/* left column — the form */}
        <div>
          {/* Site */}
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.chip} style={{ background: "#DBE7FE", color: "#2E6CF5" }}><i className="ti ti-map-pin" /></span>Site</div>
            <label className={styles.lab}>Site *</label>
            <div className={styles.siteWrap} ref={wrapRef}>
              <input
                className={styles.in} placeholder="Search sites..." autoComplete="off"
                value={siteQ}
                onChange={(e) => { setSiteQ(e.target.value); setOpenList(true); }}
                onFocus={() => setOpenList(true)}
              />
              {openList && (
                <div className={styles.siteList}>
                  {siteMatches.length ? siteMatches.map((s) => (
                    <div key={s.code} className={styles.siteItem} onClick={() => pickSite(s)}>
                      {s.name}<span className={styles.siteId}>ID {siteId(s.code)}</span>
                    </div>
                  )) : <div className={styles.siteNone}>No sites found</div>}
                </div>
              )}
            </div>
          </div>

          {/* Orientation */}
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.chip} style={{ background: "#FEF3C7", color: "#B45309" }}><i className="ti ti-gps" /></span>Orientation</div>
            <div className={styles.oriRow}>
              <button type="button" className={`${styles.ori} ${orientation === "V" ? styles.oriOn : ""}`} onClick={() => setOrientation("V")}>
                <i className="ti ti-arrow-bar-to-up" /><div>Vertical</div>
              </button>
              <button type="button" className={`${styles.ori} ${orientation === "H" ? styles.oriOn : ""}`} onClick={() => setOrientation("H")}>
                <i className="ti ti-arrow-bar-to-right" /><div>Horizontal</div>
              </button>
            </div>
          </div>

          {/* Device details */}
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.chip} style={{ background: "#D1FAE5", color: "#047857" }}><i className="ti ti-cpu" /></span>Device details</div>
            <label className={styles.lab}>Device ID <span className={styles.muted}>(auto-generated)</span></label>
            <input className={`${styles.in} ${styles.readonly} ${styles.mb}`} readOnly value={previewId} />
            <label className={styles.lab}>IMEI *</label>
            <input className={`${styles.in} ${styles.mb}`} style={imeiErr ? { borderColor: "#DC2626" } : undefined} placeholder="e.g. 352093100034561" value={imei} onChange={(e) => { setImei(e.target.value); setImeiErr(false); }} />
            <label className={styles.lab}>SIM number <span className={styles.muted}>(optional)</span></label>
            <input className={`${styles.in} ${styles.mb}`} placeholder="e.g. 0712 345 678" value={sim} onChange={(e) => setSim(e.target.value)} />
            <label className={styles.lab}>Initial status</label>
            <select className={styles.in} value={status} onChange={(e) => setStatus(e.target.value)}>
              {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* Geofence */}
          <div className={styles.card}>
            <div className={styles.cardHead}>
              <span className={styles.chip} style={{ background: "#FEE2E2", color: "#DC2626" }}><i className="ti ti-map-pin-cog" /></span>Geofence
              <span style={{ marginLeft: "auto" }}>
                <button type="button" role="switch" aria-checked={geoOn} className={`${styles.tg} ${geoOn ? "" : styles.tgOff}`} onClick={() => setGeoOn((v) => !v)} />
              </span>
            </div>
            <div className={styles.geoGrid}>
              <div>
                <label className={styles.lab}>Alert radius</label>
                <select className={styles.in} value={radius} disabled={!geoOn} onChange={(e) => setRadius(e.target.value)}>
                  {RADII.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <div className={styles.geoNote}>An alarm fires if this device moves beyond the radius from its installed point.</div>
              </div>
              <div className={styles.geoMap}>
                <svg viewBox="0 0 190 150" preserveAspectRatio="none"><path d="M0 50 C60 42 130 58 190 46" stroke="#fff" strokeWidth="3" fill="none" /></svg>
                {geoOn && <div className={styles.geoCircle} style={{ width: GEO_PX[radius], height: GEO_PX[radius] }} />}
                <div className={styles.geoPin}><i className="ti ti-gps" /></div>
              </div>
            </div>
          </div>

          {/* Sensor & reporting */}
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.chip} style={{ background: "#EDE9FE", color: "#7C3AED" }}><i className="ti ti-adjustments" /></span>Sensor &amp; reporting</div>
            <label className={styles.lab}>Motion sensitivity <span className={styles.motVal}>{motion}</span> / 50 · lower = more sensitive</label>
            <input type="range" min="1" max="50" value={motion} className={styles.slider} onChange={(e) => setMotion(Number(e.target.value))} />
            <div className={styles.sliderEnds}><span>1 · saves battery</span><span>100 · detects smallest movement</span></div>
            <label className={styles.lab}>Moving interval <span className={styles.op}>report cadence while awake</span></label>
            <select className={styles.in} value={interval} onChange={(e) => setIntervalV(e.target.value)}>
              {INTERVALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <label className={styles.lab} style={{ marginTop: 12 }}>Wake-up interval <span className={styles.op}>sleep cadence · default 24 h</span></label>
            <select className={styles.in} value={wakeMin} onChange={(e) => setWakeMin(e.target.value)}>
              {WAKE.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>

          {/* Installation photo + notes */}
          <div className={styles.card}>
            <div className={styles.cardHead}><span className={styles.chip} style={{ background: "#EDE9FE", color: "#7C3AED" }}><i className="ti ti-camera" /></span>Installation photo <span className={styles.muted} style={{ fontSize: 11 }}>— one per device</span></div>
            {photo ? (
              <div className={styles.photoFull}>
                <img src={photo.url} alt="Installation" />
                <button type="button" className={styles.photoX} onClick={() => setPhoto(null)} aria-label="Remove"><i className="ti ti-x" /></button>
              </div>
            ) : (
              <div className={styles.photoEmpty} onClick={() => photoInput.current?.click()}>
                <i className="ti ti-upload" /><span className="pt" style={{ fontSize: 12, fontWeight: 600 }}>Import installation photo</span>
                <span className="ps" style={{ fontSize: 10.5, color: "#94a3b8" }}>Choose an image from your computer</span>
              </div>
            )}
            <input ref={photoInput} type="file" accept="image/*" style={{ display: "none" }} onChange={onPhoto} />
          </div>

          <label className={styles.lab}>Mounting notes <span className={styles.muted}>(optional)</span></label>
          <textarea className={styles.notes} placeholder="e.g. Mounted on north perimeter pole, 3m up" value={notes} onChange={(e) => setNotes(e.target.value)} />

          {msg && <div className={styles.msg}><i className="ti ti-circle-check" />{msg}</div>}
          {err && <div className={styles.err}>{err}</div>}

          <button type="button" className={styles.save} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save device"}</button>
          <button type="button" className={styles.cancel} onClick={() => router.push("/mainapp/devices")}>Cancel</button>
        </div>

        {/* right column — naming convention */}
        <div className={styles.aside}>
          <div className={styles.card}>
            <div className={styles.cardHead} style={{ marginBottom: 9 }}><span className={styles.chip} style={{ background: "#EDE9FE", color: "#7C3AED" }}><i className="ti ti-list-check" /></span>Naming convention</div>
            <div className={styles.asideBox}>
              Device IDs are generated as<br />
              <b>{"{site id}_{site name}_{V or H}"}</b><br />
              e.g. <code>001_NairobiHeadquarters_V</code>. A repeated orientation at the same site is auto-numbered (_V2, _H2…).
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
