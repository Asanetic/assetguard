// app/mainapp/tcplogs/components/TcpLogs.jsx
// The TCP listener console: open/close/test the listening port (changeable),
// watch fully-interpreted telemetry arrive, and click any row for the full decode
// (status flags, MEMS vector, whole cell + Wi-Fi list, alarms) + raw frame.
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./tcplogs.module.css";

const EAT_TZ = "Africa/Nairobi";
function fmtTime(iso) { if (!iso) return "—"; try { return new Date(iso).toLocaleTimeString("en-GB", { timeZone: EAT_TZ, hour12: false }); } catch { return iso; } }
function coord(lat, lng) { if (lat == null || lng == null) return "no fix"; return `${Number(lat).toFixed(5)}, ${Number(lng).toFixed(5)}`; }
const DISTURB = new Set(["00100008", "00100009"]);
// Net motion (gravity removed) thresholds — mirror the alarm engine defaults.
// --- Motion model -----------------------------------------------------------
// The MEMS "net vector" is the device's reported dynamic-acceleration figure.
// IMPORTANT (from field tests): a device sitting PERFECTLY STILL does NOT read
// ~0 mg — it idles around a REST BASELINE of ~1450 mg (1430–1450). So real
// motion is what rises ABOVE that baseline, and the whole model is anchored to
// it: rest ≈ 0 % on the gauge, not 27 %.
//   REST_MG   ~1450 mg   idle/self-noise floor — treated as zero motion
//   still     : vector <  1800 mg   (baseline + headroom — device at rest)
//   moving    : 1800 – 3000 mg      (handling / disturbance)
//   critical  : vector ≥ 3000 mg    (violent; scales to a 5000 mg hard-impact ceiling)
// The motion % is band-anchored (not a naive ratio): measured from REST_MG so a
// resting device reads ~0 %. still 0–33 %, moving 33–66 %, critical 66–100 %,
// still climbing with real intensity inside the critical band. Speed has its own
// anchored curve (walking→moving, driven-away→critical); the higher drives the gauge.
const REST_MG   = 1450;   // net mg the accelerometer idles at when perfectly still
const STILL_MAX = 1800;   // net mg: below this the device is considered at rest
const CRIT_MG   = 3000;   // net mg: at/above this is critical motion
const CRIT_CEIL = 5000;   // net mg mapped to 100 % (hard impact)
const SPEED_KPH = 5;      // km/h: above this the asset is actually moving
const SPEED_FAST = 25;    // km/h: being driven — critical band
const SPEED_MAX = 80;     // km/h mapped to 100 %
// Back-compat aliases kept for the row colouring / disturbance references below.
const DISTURB_MG = STILL_MAX, MOTION_MG = CRIT_MG;

// Piecewise, band-anchored 0–100 intensity, measured from `base` (the zero-motion
// floor). Boundaries land exactly on 33 % and 66 % so the number and the label
// always agree; anything at/below `base` reads 0 %.
function bandPercent(v, base, lo, mid, ceil) {
  const x = Number(v);
  if (!Number.isFinite(x) || x <= base) return 0;
  if (x < lo)  return ((x - base) / (lo - base)) * 33;    // 0–33  across base..lo
  if (x < mid) return 33 + ((x - lo) / (mid - lo)) * 33;  // 33–66 across lo..mid
  return 66 + Math.min(1, (x - mid) / (ceil - mid)) * 34; // 66–100 across mid..ceil
}
function motionPercent(dyn, spd) {
  const di = dyn == null ? 0 : bandPercent(dyn, REST_MG, STILL_MAX, CRIT_MG, CRIT_CEIL);
  const si = spd == null ? 0 : bandPercent(spd, 0,       SPEED_KPH, SPEED_FAST, SPEED_MAX);
  return Math.max(di, si);
}

// --- interpretation helpers (compute from stored fields; robust to old rows) ---
function memsMag(t) {
  if (t.mems_valid && t.mems_x != null && t.mems_y != null && t.mems_z != null)
    return Math.round(Math.sqrt(t.mems_x ** 2 + t.mems_y ** 2 + t.mems_z ** 2));
  return null;
}
function memsVector(t) {                 // dynamic component (gravity removed) — the disturbance signal
  if (t.mems_dynamic != null) return Math.round(t.mems_dynamic);
  const m = memsMag(t);
  return m == null ? null : Math.abs(m - 1000);
}
function motionState(t) {                 // net MEMS + processed speed -> motion state + intensity %
  const dyn = memsVector(t), spd = t.speed;
  // Kind from the RAW thresholds (authoritative — no rounding at the 1500/2000 edges).
  const dHi = dyn != null && dyn >= CRIT_MG;      // ≥2000 mg net → violent
  const dMid = dyn != null && dyn >= STILL_MAX;   // ≥1500 mg net → disturbance
  const sHi = spd != null && spd >= SPEED_FAST;   // ≥25 km/h → being driven
  const sMid = spd != null && spd >= SPEED_KPH;   // ≥5 km/h → moving
  const kind = (dHi || sHi) ? "critical" : (dMid || sMid) ? "moving" : "still";
  // Intensity % is the band-anchored gauge (still 0–33, moving 33–66, critical 66–100).
  const index = (dyn == null && spd == null) ? 0 : Math.round(motionPercent(dyn, spd));
  return { kind, index };
}
function deriveAlarms(t) {                 // stored alarms, or a decoded-flags fallback
  if (Array.isArray(t.alarms) && t.alarms.length) return t.alarms;
  const out = [], mb = String(t.motion_byte || "").toUpperCase();
  const vv = memsVector(t);
  if (t.status_disturbance || DISTURB.has(mb) || (vv != null && vv >= DISTURB_MG && vv < MOTION_MG && (t.speed == null || t.speed < SPEED_KPH))) out.push("DISTURBANCE");
  if ((t.speed != null && t.speed >= SPEED_KPH) || (vv != null && vv >= MOTION_MG)) out.push("CRITICAL_MOTION");
  if (t.battery != null && t.battery <= 20) out.push("LOW_BATTERY");
  return out;
}

// Coloured position-source tag: gps (green) · wifi (blue) · lbs (amber) · wifi+lbs (purple).
const SRC_CLS = { gps: "srcGps", wifi: "srcWifi", lbs: "srcLbs", "wifi+lbs": "srcBoth" };
function sourceTag(src) {
  const key = src === "network" ? "lbs" : src;
  if (!key || !SRC_CLS[key]) return null;
  return <span className={`${styles.srcTag} ${styles[SRC_CLS[key]]}`}>{key}</span>;
}

export default function TcpLogs() {
  const [rows, setRows] = useState([]);
  const [live, setLive] = useState(true);
  const [lastAt, setLastAt] = useState(null);
  const [selected, setSelected] = useState(null);
  const [more, setMore] = useState([]);

  // search + filters (parsed & aligned)
  const [q, setQ] = useState("");
  const [event, setEvent] = useState("all");
  const [device, setDevice] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const timer = useRef(null);

  async function poll() {
    try {
      const p = new URLSearchParams({ newest: "1", limit: "300" });
      if (q) p.set("q", q);
      if (event && event !== "all") p.set("event", event);
      if (from) p.set("from", from);
      if (to) p.set("to", to);
      const tr = await fetch(`/api/mainapp/ingest/telemetry?${p.toString()}`, { cache: "no-store" });
      if (tr.ok) {
        const d = await tr.json();
        let list = Array.isArray(d.telemetry) ? d.telemetry : [];
        if (device) list = list.filter((r) => String(r.imei) === device || String(r.device_code) === device);
        setRows(list);
        if (list.length) setLastAt(list[0].received_at);
      }
    } catch { /* transient */ }
  }
  useEffect(() => {
    poll();
    if (live) timer.current = setInterval(poll, 2500);
    return () => timer.current && clearInterval(timer.current);
    // eslint-disable-next-line
  }, [live, q, event, from, to, device]);

  const devices = Array.from(new Set(rows.map((r) => r.device_code || r.imei).filter(Boolean))).sort();
  function clear() { setQ(""); setEvent("all"); setDevice(""); setFrom(""); setTo(""); }

  async function openDetail(row) {
    setSelected(row); setMore([]);
    try {
      const r = await fetch(`/api/mainapp/ingest/telemetry?imei=${encodeURIComponent(row.imei)}&newest=1&limit=25`, { cache: "no-store" });
      if (r.ok) { const d = await r.json(); setMore(Array.isArray(d.telemetry) ? d.telemetry : []); }
    } catch {}
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Parsed &amp; aligned data</div>
          <div className={styles.sub}>Decoded position, speed, battery, motion and events. Manage listener ports in <a href="/mainapp/ports">Ports</a>.</div>
        </div>
        <div className={styles.headRight}>
          <button className={`${styles.liveBtn} ${live ? styles.liveOn : ""}`} onClick={() => setLive((v) => !v)}>
            <span className={`${styles.dot} ${live ? styles.dotOn : styles.dotOff}`} />{live ? "Live" : "Paused"}
          </button>
          <button className={styles.refresh} onClick={poll}><i className="ti ti-refresh" aria-hidden="true" /> Refresh</button>
        </div>
      </div>

      {/* search + filters */}
      <div className={styles.ctrlCard}>
        <input className={styles.search} placeholder="Search device, coordinates, motion byte…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className={styles.filters}>
          <div className={styles.field}><label>From</label><input type="date" className={styles.fInput} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className={styles.field}><label>To</label><input type="date" className={styles.fInput} value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className={styles.field}><label>Event</label>
            <select className={styles.fInput} value={event} onChange={(e) => setEvent(e.target.value)}>
              <option value="all">All</option><option value="position">Position</option>
              <option value="DISTURBANCE">Disturbance</option><option value="CRITICAL_MOTION">Critical motion</option>
              <option value="GEOFENCE_EXIT">Geofence exit</option><option value="LOW_BATTERY">Low battery</option>
            </select>
          </div>
          <div className={styles.field}><label>Device</label>
            <select className={styles.fInput} value={device} onChange={(e) => setDevice(e.target.value)}>
              <option value="">All</option>{devices.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className={styles.clear} onClick={clear}>Clear</button>
        </div>
        <div className={styles.count}>{rows.length} records{lastAt ? ` · last ${fmtTime(lastAt)}` : ""}</div>
      </div>

      <div className={styles.tableWrap}>
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Time</th><th>Device</th><th>IMEI</th><th>Fix</th><th>Position</th><th>Speed</th>
                <th>Batt</th><th>Status</th><th title="MEMS dynamic acceleration (gravity removed) — disturbance signal">Vector</th>
                <th title="Processed speed + MEMS — predicts critical motion">Motion</th><th>Temp</th><th>Alarms</th><th>Raw</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((t) => {
                const disturbed = t.status_disturbance || DISTURB.has(String(t.motion_byte).toUpperCase());
                const vec = memsVector(t);
                const ms = motionState(t);
                const al = deriveAlarms(t);
                return (
                  <tr key={t.id} className={styles.rowClick} onClick={() => openDetail(t)}>
                    <td className={styles.mono}>{fmtTime(t.received_at)}</td>
                    <td>{t.device_id ? `#${t.device_id}` : <span className={styles.unreg} title="This IMEI is not registered in devices">unregistered</span>}</td>
                    <td className={styles.mono}>{t.imei}</td>
                    <td>{t.fix === "A" && t.fix_valid ? <span className={styles.fixOk}>A</span> : <span className={styles.fixNo}>{t.fix || "V"}</span>}</td>
                    <td className={styles.mono}>
                      {t.lat == null && t.geo_error
                        ? <span className={styles.geoFail} title={t.geo_error}><i className="ti ti-map-pin-off" aria-hidden="true" /> loc failed</span>
                        : <>{coord(t.lat, t.lng)}{t.accuracy != null && t.lat != null ? <span className={styles.acc}>±{Math.round(t.accuracy)}m</span> : null}{t.lat != null ? sourceTag(t.loc_source) : null}</>}
                    </td>
                    <td>{t.speed != null ? `${t.speed} km/h` : "—"}</td>
                    <td style={{ color: t.battery != null && t.battery <= 20 ? "#DC2626" : "#0F274A" }}>{t.battery != null ? `${t.battery}%` : "—"}</td>
                    <td><span className={`${styles.pill} ${disturbed ? styles.pillWarn : styles.pillOk}`}>{t.motion_byte || "—"}</span></td>
                    <td><span className={styles.mono} style={{ color: vec != null && vec >= DISTURB_MG ? "#B91C1C" : "#475569", fontWeight: vec != null && vec >= DISTURB_MG ? 700 : 400 }}>{vec != null ? `${vec} mg` : "—"}</span></td>
                    <td>
                      <span className={`${styles.motion} ${ms.kind === "critical" ? styles.motCrit : ms.kind === "moving" ? styles.motMove : styles.motStill}`}>{ms.kind}</span>
                      <span className={styles.motIdx}>{ms.index}%</span>
                    </td>
                    <td>{t.temperature != null ? `${t.temperature}°C` : "—"}</td>
                    <td>{al.length ? al.map((a) => <span key={a} className={styles.alarmChip}>{a.replace("_", " ").toLowerCase()}</span>) : <span className={styles.mutedDash}>—</span>}</td>
                    <td className={styles.rawCell} title={t.raw}>{t.raw}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && (
          <div className={styles.empty}>No telemetry yet. Open the port above, then send packets from <a href="/mainapp/simulator">the simulator</a> or a real tracker.</div>
        )}
      </div>

      {selected && <LogDetail row={selected} more={more} onSelect={openDetail} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Field({ k, v }) { return <div className={styles.dField}><div className={styles.dK}>{k}</div><div className={styles.dV}>{v == null || v === "" ? "—" : String(v)}</div></div>; }
function Flag({ on, yes, no }) { return <span className={on ? styles.flagYes : styles.flagNo}>{on ? (yes || "yes") : (no || "no")}</span>; }

function LogDetail({ row, more, onSelect, onClose }) {
  const t = row;
  const cells = Array.isArray(t.cells) ? t.cells : [];
  const wifi = Array.isArray(t.wifi) ? t.wifi : [];
  const al = deriveAlarms(t);
  const vec = memsVector(t), mag = memsMag(t), ms = motionState(t);
  const pos = t.lat == null || t.lng == null ? "no fix" : `${Number(t.lat).toFixed(5)}, ${Number(t.lng).toFixed(5)}`;
  const mems = t.mems_valid === true
    ? `valid · X ${t.mems_x} · Y ${t.mems_y} · Z ${t.mems_z} · roll ${t.roll ?? "—"} · pitch ${t.pitch ?? "—"}`
    : t.mems_valid === false ? "invalid (accel ignored)" : "—";

  // Which provider located this packet, and (for Unwired) the trial snapshot at
  // the time of the fix. Stamped by the ingest pipeline into geo_raw._ag; we also
  // fall back to sniffing the raw shape for older rows saved before that stamp.
  const ag = t.geo_raw && typeof t.geo_raw === "object" ? t.geo_raw._ag : null;
  const geoProvider = ag?.provider
    || (t.geo_raw && (t.geo_raw.status === "ok" || t.geo_raw.lon != null || t.geo_raw.balance != null) ? "unwired"
        : t.geo_raw && t.geo_raw.location ? "google" : null);
  const providerLabel = geoProvider === "unwired" ? "Unwired Labs" : geoProvider === "google" ? "Google" : null;
  const trials = ag?.trials || null;
  const trialWord = trials?.window === "day" ? " today" : trials?.window === "month" ? " this month" : "";

  return (
    <div className={styles.modalWrap} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHead}>
          <div>
            <div className={styles.modalTitle}>Telemetry packet</div>
            <div className={styles.modalSub}>{t.imei} · {fmtTime(t.received_at)}</div>
          </div>
          <div className={styles.modalHeadRight}>
            {t.device_id ? <a className={styles.devLink} href={`/mainapp/devices/view?device=${encodeURIComponent(t.device_id)}`}><i className="ti ti-external-link" aria-hidden="true" /> Device</a> : null}
            <button className={styles.close2} onClick={onClose} aria-label="Close"><i className="ti ti-x" /></button>
          </div>
        </div>

        {al.length ? <div className={styles.alarmBar}>{al.map((a) => <span key={a} className={styles.alarmChipBig}>{a.replace("_", " ")}</span>)}</div> : <div className={styles.noAlarm}>No alarms raised by this packet.</div>}

        {t.device_id == null ? (
          <div className={styles.geoErrBar} style={{ background: "#FEF3C7", color: "#92400E" }}>
            <i className="ti ti-alert-triangle" aria-hidden="true" />
            <span><b>Unregistered device.</b> IMEI {t.imei} isn&rsquo;t in your devices table — stored for visibility, but it won&rsquo;t raise alarms or bump device state until you add it (Devices → Add device).</span>
          </div>
        ) : null}

        {/* geolocation: what we sent to Google and what came back */}
        {(t.loc_source === "network" || t.geo_error || t.geo_raw) ? (
          <div className={styles.geoBlock}>
            <div className={styles.dK}>Geolocation ({providerLabel || "Google"})</div>
            <div className={styles.geoLine}>
              <b>Sent:</b> {(Array.isArray(t.cells) ? t.cells.length : 0)} cell tower(s) + {(Array.isArray(t.wifi) ? t.wifi.length : 0)} Wi‑Fi AP(s)
            </div>
            <div className={styles.geoLine}>
              <b>Result:</b> {t.lat != null
                ? <span style={{ color: "#047857" }}>{Number(t.lat).toFixed(6)}, {Number(t.lng).toFixed(6)} · ±{Math.round(t.accuracy)} m</span>
                : <span style={{ color: "#B91C1C" }}>{t.geo_error || "no location"}</span>}
            </div>
            {t.geo_raw ? <pre className={styles.geoRaw}>{JSON.stringify(t.geo_raw, null, 2)}</pre> : null}
          </div>
        ) : null}

        {/* interpretation summary */}
        <div className={styles.interpBar}>
          <span className={styles.interp}><span className={styles.interpK}>MEMS vector</span> {mag != null ? `${mag} mg` : "—"}</span>
          <span className={styles.interp}><span className={styles.interpK}>Dynamic Δ</span> <b style={{ color: vec != null && vec >= DISTURB_MG ? "#B91C1C" : "#0F274A" }}>{vec != null ? `${vec} mg` : "—"}</b></span>
          <span className={styles.interp}><span className={styles.interpK}>Motion</span> <span className={`${styles.motion} ${ms.kind === "critical" ? styles.motCrit : ms.kind === "moving" ? styles.motMove : styles.motStill}`}>{ms.kind}</span> {ms.index}%</span>
        </div>

        <div className={styles.detGrid}>
          <Field k="Received" v={new Date(t.received_at).toLocaleString("en-GB", { timeZone: EAT_TZ, hour12: false })} />
          <Field k="Device time" v={t.device_time ? new Date(t.device_time).toLocaleString("en-GB", { timeZone: EAT_TZ, hour12: false }) : "—"} />
          <div className={styles.dField}><div className={styles.dK}>GPS fix</div><div className={styles.dV}>{t.fix || "—"} · <Flag on={t.fix_valid} yes="valid" no="void" /></div></div>
          <Field k="Position" v={pos} />
          <Field k="Accuracy" v={t.accuracy != null ? `±${Math.round(t.accuracy)} m (${t.loc_source || "gps"})` : t.geo_error ? "failed to compute" : "—"} />
          <div className={styles.dField}><div className={styles.dK}>Network‑located</div><div className={styles.dV}>
            <Flag on={t.network_located} />
            {t.network_located && providerLabel ? <> · via <b>{providerLabel}</b></> : null}
            {t.network_located && geoProvider === "unwired" && trials
              ? <> · <span title={`Used ${trials.used} of ${trials.cap}${trialWord}`}>{trials.remaining} of {trials.cap} trials left{trialWord}</span></>
              : null}
          </div></div>
          <Field k="Speed" v={t.speed != null ? `${t.speed} km/h` : "—"} />
          <Field k="Course" v={t.course != null ? `${t.course}°` : "—"} />
          <Field k="Altitude" v={t.altitude != null ? `${t.altitude} m` : "—"} />
          <Field k="Satellites" v={t.satellites} />
          <Field k="GSM signal" v={t.signal} />
          <Field k="Battery" v={t.battery != null ? `${t.battery}%` : "—"} />
          <div className={styles.dField}><div className={styles.dK}>Status word</div><div className={styles.dV}><span className={styles.mono}>{t.motion_byte || "—"}</span> · disturb <Flag on={t.status_disturbance} /> · low‑batt flag <Flag on={t.status_low_batt} /></div></div>
          <Field k="Temperature" v={t.temperature != null ? `${t.temperature}°C` : "—"} />
          <div className={styles.dFieldWide}><div className={styles.dK}>MEMS</div><div className={styles.dV}>{mems}</div></div>
        </div>

        {cells.length > 0 && (
          <div className={styles.listBlock}>
            <div className={styles.dK}>Cell towers ({cells.length}) · MCC {t.mcc ?? "—"} / MNC {t.mnc ?? "—"}</div>
            <table className={styles.subTable}><thead><tr><th>#</th><th>LAC</th><th>Cell ID</th><th>Signal</th></tr></thead>
              <tbody>{cells.map((c, i) => <tr key={i}><td>{i + 1}</td><td className={styles.mono}>{c.lac}</td><td className={styles.mono}>{c.cid}</td><td>{c.sig}</td></tr>)}</tbody></table>
          </div>
        )}
        {wifi.length > 0 && (
          <div className={styles.listBlock}>
            <div className={styles.dK}>Wi‑Fi access points ({wifi.length})</div>
            <table className={styles.subTable}><thead><tr><th>#</th><th>MAC</th><th>RSSI</th></tr></thead>
              <tbody>{wifi.map((w, i) => <tr key={i}><td>{i + 1}</td><td className={styles.mono}>{w.mac}</td><td>{w.rssi} dBm</td></tr>)}</tbody></table>
          </div>
        )}

        <div className={styles.rawBlock}><div className={styles.dK}>Raw frame</div><code className={styles.rawFull}>{t.raw}</code></div>

        <div className={styles.moreHead}>More from this device ({more.length})</div>
        <div className={styles.moreWrap}>
          {more.length === 0 && <div className={styles.moreEmpty}>Loading…</div>}
          {more.map((m) => (
            <button key={m.id} className={`${styles.moreRow} ${m.id === t.id ? styles.moreRowOn : ""}`} onClick={() => onSelect(m)}>
              <span className={styles.mono}>{fmtTime(m.received_at)}</span>
              <span>{m.lat == null ? "no fix" : `${Number(m.lat).toFixed(4)}, ${Number(m.lng).toFixed(4)}`}</span>
              <span>{m.speed != null ? `${m.speed} km/h` : "—"}</span>
              <span style={{ color: m.battery != null && m.battery <= 20 ? "#DC2626" : "#64748B" }}>{m.battery != null ? `${m.battery}%` : "—"}</span>
              <span className={styles.mono}>{m.motion_byte || "—"}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
