// app/mainapp/admin/maps/components/MapsControl.jsx
// Google Maps control — one place to set the Google Maps JavaScript API key,
// pick the libraries to load, and choose the default map view (centre, zoom,
// type) that every maps page in AssetGuard will use. Includes a live "Test key"
// that actually loads Google Maps with the entered key and draws a map, so you
// can confirm the key works before building the map pages.
//
// Config is persisted server-side (PUT /api/mainapp/maps-config) and changes are
// written to the audit log.
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./maps.module.css";
import { loadGoogleMaps, resetGoogleMaps } from "../../../lib/googleMaps.js";

const ALL_LIBRARIES = [
  { key: "places", note: "search / autocomplete" },
  { key: "geometry", note: "distances & areas" },
  { key: "drawing", note: "draw shapes" },
  { key: "marker", note: "advanced markers" },
  { key: "visualization", note: "heatmaps" },
];
const MAP_TYPES = ["roadmap", "satellite", "hybrid", "terrain"];

export default function MapsControl() {
  const [cfg, setCfg] = useState({
    apiKey: "", libraries: ["places"],
    defaultCenter: { lat: -1.2864, lng: 36.8172 }, defaultZoom: 7, mapType: "roadmap",
  });
  const [loaded, setLoaded] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveNote, setSaveNote] = useState("");
  const [toast, setToast] = useState("");
  const [test, setTest] = useState({ state: "idle", msg: "" }); // idle | loading | ok | error
  // Geolocation backup (Unwired Labs). Token is write-only: the server sends back
  // only `unwiredTokenSet`, and we send `unwiredToken` up only when the admin types a new one.
  const [geo, setGeo] = useState({
    unwiredEnabled: false, unwiredTokenSet: false, unwiredToken: "",
    unwiredRegion: "us1", unwiredFreeCap: 50, unwiredCapWindow: "total",
  });
  const [geoUsage, setGeoUsage] = useState({ count: 0, period: "total" });
  const [showTok, setShowTok] = useState(false);
  const mapRef = useRef(null);
  const toastTimer = useRef(null);

  function flashToast(t) {
    setToast(t);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2400);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/mainapp/maps-config", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (alive && data.config) setCfg((c) => ({ ...c, ...data.config }));
          if (alive && data.geo) setGeo((g) => ({ ...g, ...data.geo, unwiredToken: "" }));
          if (alive && data.geoUsage) setGeoUsage(data.geoUsage);
        }
      } catch { /* keep defaults */ }
      finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, []);

  const set = (k, v) => setCfg((c) => ({ ...c, [k]: v }));
  const setG = (k, v) => setGeo((g) => ({ ...g, [k]: v }));
  const setCenter = (k, v) => setCfg((c) => ({ ...c, defaultCenter: { ...c.defaultCenter, [k]: v } }));
  function toggleLib(key) {
    setCfg((c) => {
      const has = c.libraries.includes(key);
      return { ...c, libraries: has ? c.libraries.filter((l) => l !== key) : [...c.libraries, key] };
    });
  }

  async function save() {
    setSaving(true); setSaveNote("");
    try {
      const res = await fetch("/api/mainapp/maps-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: cfg.apiKey,
          libraries: cfg.libraries,
          defaultCenter: {
            lat: Number(cfg.defaultCenter.lat), lng: Number(cfg.defaultCenter.lng),
          },
          defaultZoom: Number(cfg.defaultZoom),
          mapType: cfg.mapType,
          geo: {
            unwiredEnabled: !!geo.unwiredEnabled,
            unwiredRegion: geo.unwiredRegion,
            unwiredFreeCap: Number(geo.unwiredFreeCap),
            unwiredCapWindow: geo.unwiredCapWindow,
            // only send the token when the admin actually typed a new one
            ...(geo.unwiredToken && geo.unwiredToken.trim() ? { unwiredToken: geo.unwiredToken.trim() } : {}),
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setCfg((c) => ({ ...c, ...data.config }));
      if (data.geo) setGeo((g) => ({ ...g, ...data.geo, unwiredToken: "" }));
      if (data.geoUsage) setGeoUsage(data.geoUsage);
      setSaveNote("Saved — every maps page will use this configuration.");
      flashToast("Maps configuration saved");
    } catch (err) {
      setSaveNote(err.message || "Save failed");
    } finally { setSaving(false); }
  }

  async function testKey() {
    setTest({ state: "loading", msg: "Loading Google Maps…" });
    try {
      resetGoogleMaps(); // force a fresh load with the current key
      const maps = await loadGoogleMaps({ apiKey: cfg.apiKey, libraries: cfg.libraries });
      if (mapRef.current) {
        // eslint-disable-next-line no-new
        new maps.Map(mapRef.current, {
          center: { lat: Number(cfg.defaultCenter.lat), lng: Number(cfg.defaultCenter.lng) },
          zoom: Number(cfg.defaultZoom),
          mapTypeId: cfg.mapType,
        });
      }
      setTest({ state: "ok", msg: "Key works — map loaded successfully." });
    } catch (err) {
      setTest({ state: "error", msg: err.message || "Could not load Google Maps." });
    }
  }

  const hasKey = !!(cfg.apiKey && cfg.apiKey.trim());

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Google Maps</div>
          <div className={styles.sub}>Configure the Google Maps API used by every map across the platform</div>
        </div>
        <div className={styles.headActions}>
          <span className={`${styles.statusPill} ${hasKey ? styles.stOk : styles.stNone}`}>
            <span className={styles.dot} style={{ background: hasKey ? "#059669" : "#d97706" }} />
            {hasKey ? "Key configured" : "No key set"}
          </span>
        </div>
      </div>

      {/* API key */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon} style={{ background: "#dbe7fe", color: "#2e6cf5" }}><i className="ti ti-key" /></span>
          API key
        </div>
        <div className={styles.cardSub}>The Google Maps JavaScript API browser key. Used client-side, so lock it to your domain in Google Cloud.</div>
        <label className={styles.lab}>GOOGLE MAPS JAVASCRIPT API KEY</label>
        <div className={styles.keyRow}>
          <input className={styles.in} type={showKey ? "text" : "password"} placeholder="AIza…"
            value={cfg.apiKey} onChange={(e) => set("apiKey", e.target.value)} autoComplete="off" spellCheck={false} />
          <button type="button" className={styles.eyeBtn} onClick={() => setShowKey((s) => !s)} aria-label={showKey ? "Hide key" : "Show key"}>
            <i className={showKey ? "ti ti-eye-off" : "ti ti-eye"} />
          </button>
        </div>
        <div className={styles.help}>
          Get a key from the <a href="https://console.cloud.google.com/google/maps-apis" target="_blank" rel="noreferrer">Google Cloud console</a>:
          enable <b>Maps JavaScript API</b> (add <b>Places API</b> if you use search), create an API key, then restrict it under
          <b> Application restrictions → HTTP referrers</b> to your site’s domains (e.g. <code>localhost:3000/*</code> and your production host).
          Browser keys are meant to be public, but referrer restrictions stop anyone else from using yours.
        </div>
      </div>

      {/* geolocation backup — Unwired Labs */}
      {(() => {
        const cap = Math.max(0, Number(geo.unwiredFreeCap) || 0);
        const used = Math.max(0, Number(geoUsage.count) || 0);
        const pct = cap > 0 ? Math.min(100, Math.round((used / cap) * 100)) : 0;
        const remaining = Math.max(0, cap - used);
        const barColor = pct >= 100 ? "#dc2626" : pct >= 80 ? "#d97706" : "#059669";
        const tokReady = geo.unwiredTokenSet || (geo.unwiredToken && geo.unwiredToken.trim());
        return (
          <div className={styles.card}>
            <div className={styles.cardH}>
              <span className={styles.cardHIcon} style={{ background: "#e0f2fe", color: "#0284c7" }}><i className="ti ti-world-search" /></span>
              Location backup — Unwired Labs
              <span className={`${styles.statusPill} ${geo.unwiredEnabled ? styles.stOk : styles.stNone}`} style={{ marginLeft: "auto" }}>
                <span className={styles.dot} style={{ background: geo.unwiredEnabled ? "#059669" : "#9ca3af" }} />
                {geo.unwiredEnabled ? "Backup on" : "Backup off"}
              </span>
            </div>
            <div className={styles.cardSub}>
              When Google can’t resolve a packet’s cell towers / Wi-Fi (the “Not Found” case), AssetGuard falls back to
              Unwired Labs — but only while under the free-request cap below, so a trial token is never overrun.
            </div>

            <label className={`${styles.lib} ${geo.unwiredEnabled ? styles.libOn : ""}`} style={{ display: "inline-flex", marginBottom: 12 }}>
              <input type="checkbox" checked={!!geo.unwiredEnabled} onChange={(e) => setG("unwiredEnabled", e.target.checked)} />
              Use Unwired Labs as a backup provider
            </label>

            <label className={styles.lab}>UNWIRED LABS ACCESS TOKEN</label>
            <div className={styles.keyRow}>
              <input className={styles.in} type={showTok ? "text" : "password"}
                placeholder={geo.unwiredTokenSet ? "•••••••• (saved — type to replace)" : "paste your Unwired Labs token"}
                value={geo.unwiredToken} onChange={(e) => setG("unwiredToken", e.target.value)} autoComplete="off" spellCheck={false} />
              <button type="button" className={styles.eyeBtn} onClick={() => setShowTok((s) => !s)} aria-label={showTok ? "Hide token" : "Show token"}>
                <i className={showTok ? "ti ti-eye-off" : "ti ti-eye"} />
              </button>
            </div>
            <div className={styles.help}>
              Get a token from the <a href="https://unwiredlabs.com" target="_blank" rel="noreferrer">Unwired Labs</a> dashboard
              (LocationAPI → API tokens). The token is stored server-side and never sent back to the browser.
            </div>

            <div className={styles.g3} style={{ marginTop: 12 }}>
              <div className={styles.field}>
                <label className={styles.lab}>ENDPOINT REGION</label>
                <select className={styles.in} value={geo.unwiredRegion} onChange={(e) => setG("unwiredRegion", e.target.value)}>
                  <option value="us1">us1 · Americas</option>
                  <option value="eu1">eu1 · Europe</option>
                  <option value="ap1">ap1 · Asia-Pacific</option>
                </select>
              </div>
              <div className={styles.field}>
                <label className={styles.lab}>FREE-REQUEST CAP</label>
                <input className={styles.in} type="number" min={0} value={geo.unwiredFreeCap}
                  onChange={(e) => setG("unwiredFreeCap", e.target.value)} />
              </div>
              <div className={styles.field}>
                <label className={styles.lab}>CAP RESETS</label>
                <select className={styles.in} value={geo.unwiredCapWindow} onChange={(e) => setG("unwiredCapWindow", e.target.value)}>
                  <option value="total">Never (trial total)</option>
                  <option value="day">Every day</option>
                  <option value="month">Every month</option>
                </select>
              </div>
            </div>

            {/* usage meter */}
            <div style={{ marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
                <span className={styles.lab} style={{ margin: 0 }}>
                  REQUESTS USED {geo.unwiredCapWindow === "month" ? `(this month · ${geoUsage.period})`
                    : geo.unwiredCapWindow === "day" ? `(today · ${geoUsage.period})`
                    : "(trial total)"}
                </span>
                <span style={{ fontWeight: 800, fontSize: 13, color: barColor }}>
                  {used} / {cap} &nbsp;·&nbsp; {remaining} left
                </span>
              </div>
              <div style={{ height: 10, borderRadius: 999, background: "#eef2f7", overflow: "hidden" }}>
                <div style={{ width: `${pct}%`, height: "100%", background: barColor, transition: "width .3s" }} />
              </div>
              {pct >= 100 ? (
                <div className={styles.help} style={{ color: "#b91c1c" }}>
                  Cap reached — the backup will stay idle until you raise the cap{geo.unwiredCapWindow === "month" ? " or the month rolls over" : geo.unwiredCapWindow === "day" ? " or the day rolls over" : ""}.
                </div>
              ) : (!tokReady && geo.unwiredEnabled) ? (
                <div className={styles.help} style={{ color: "#b45309" }}>
                  Backup is on but no token is saved yet — add one above and save.
                </div>
              ) : null}
            </div>
          </div>
        );
      })()}

      {/* libraries */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon} style={{ background: "#ede9fe", color: "#7c3aed" }}><i className="ti ti-books" /></span>
          Libraries
        </div>
        <div className={styles.cardSub}>Extra Google Maps libraries to load. Load only what you use — each adds weight.</div>
        <div className={styles.libs}>
          {ALL_LIBRARIES.map((l) => {
            const on = cfg.libraries.includes(l.key);
            return (
              <label key={l.key} className={`${styles.lib} ${on ? styles.libOn : ""}`}>
                <input type="checkbox" checked={on} onChange={() => toggleLib(l.key)} />
                {l.key} <span className={styles.labHint}>· {l.note}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* default view */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon} style={{ background: "#d1fae5", color: "#059669" }}><i className="ti ti-map-pin" /></span>
          Default map view
        </div>
        <div className={styles.cardSub}>Where maps open and how they look before a site is selected. Defaults to Nairobi.</div>
        <div className={styles.g3}>
          <div className={styles.field}>
            <label className={styles.lab}>DEFAULT LATITUDE</label>
            <input className={styles.in} value={cfg.defaultCenter.lat} onChange={(e) => setCenter("lat", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>DEFAULT LONGITUDE</label>
            <input className={styles.in} value={cfg.defaultCenter.lng} onChange={(e) => setCenter("lng", e.target.value)} />
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>DEFAULT ZOOM <span className={styles.labHint}>1–22</span></label>
            <input className={styles.in} value={cfg.defaultZoom} onChange={(e) => set("defaultZoom", e.target.value)} />
          </div>
        </div>
        <div className={styles.g2} style={{ marginTop: 10 }}>
          <div className={styles.field}>
            <label className={styles.lab}>MAP TYPE</label>
            <select className={styles.in} value={cfg.mapType} onChange={(e) => set("mapType", e.target.value)}>
              {MAP_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div />
        </div>
      </div>

      {/* live test */}
      <div className={styles.card}>
        <div className={styles.cardH}>
          <span className={styles.cardHIcon} style={{ background: "#fef3c7", color: "#b45309" }}><i className="ti ti-map-search" /></span>
          Live test
        </div>
        <div className={styles.cardSub}>Loads Google Maps with the key above and draws the default view. Save first isn’t required.</div>
        <div className={styles.testRow}>
          <button type="button" className={styles.btnGhost} style={{ height: 38, padding: "0 16px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}
            onClick={testKey} disabled={!hasKey || test.state === "loading"}>
            {test.state === "loading" ? "Loading…" : "Test key"}
          </button>
          {test.msg ? (
            <span className={`${styles.testMsg} ${test.state === "ok" ? styles.testOk : test.state === "error" ? styles.testErr : ""}`}>{test.msg}</span>
          ) : null}
        </div>
        <div className={styles.mapBox}>
          <div ref={mapRef} style={{ width: "100%", height: "100%" }} />
          {test.state === "idle" || test.state === "error" ? (
            <div className={styles.mapPlaceholder}>
              <i className="ti ti-map-2" />
              {hasKey ? "Press “Test key” to load a live map here." : "Add an API key above, then press “Test key”."}
            </div>
          ) : null}
        </div>
      </div>

      {/* save */}
      <div className={`${styles.card} ${styles.saveBar}`}>
        <span className={`${styles.saveNote} ${saveNote.startsWith("Saved") ? styles.saveOk : ""}`}>
          {saveNote || (loaded ? "Changes are saved to the server and used by every maps page." : "Loading…")}
        </span>
        <button type="button" className={styles.btn} onClick={save} disabled={saving}>
          {saving ? "Saving…" : "Save configuration"}
        </button>
      </div>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
