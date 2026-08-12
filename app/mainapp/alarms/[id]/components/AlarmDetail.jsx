// app/mainapp/alarms/[id]/components/AlarmDetail.jsx
// View Alarm — details, device snapshot, lifecycle log (triggered + linked alarms
// + acks + close) and the action rail. Acknowledge is dual-sided (monitoring /
// security, independent). Close (genuine/false + note + photos) is gated. Track /
// Track & respond / View on map navigate out.
"use client";

import { useEffect, useState } from "react";
import styles from "./alarmdetail.module.css";
import AckModal from "../../components/AckModal.jsx";
import DispatchModal from "../../components/DispatchModal.jsx";

const PRIO = {
  Critical: { cls: "pCritical", dot: "#fff" },
  High:     { cls: "pHigh" },
  Medium:   { cls: "pMedium" },
  Low:      { cls: "pLow" },
};
function fmt(ts) { try { return new Date(ts).toLocaleString(undefined, { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" }); } catch { return "—"; } }
// Downscale + JPEG-compress a photo in the browser BEFORE it becomes a data URL.
// Big phone photos (several MB) used to be silently dropped above ~1.9 MB; now
// they're shrunk to a ≤1600px JPEG that comfortably fits the server's per-photo
// limit, so any reasonable photo uploads.
function compressImage(file) {
  return new Promise((resolve) => {
    if (!/^image\//.test(file.type || "")) {   // non-image: read raw, keep only if small
      const r = new FileReader();
      r.onload = () => resolve(typeof r.result === "string" && r.result.length <= 1_800_000 ? r.result : null);
      r.onerror = () => resolve(null);
      r.readAsDataURL(file);
      return;
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let w = img.naturalWidth || img.width, h = img.naturalHeight || img.height;
      if (w > MAX || h > MAX) { const s = Math.min(MAX / w, MAX / h); w = Math.round(w * s); h = Math.round(h * s); }
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      let q = 0.82, out = canvas.toDataURL("image/jpeg", q);
      while (out.length > 1_400_000 && q > 0.4) { q -= 0.12; out = canvas.toDataURL("image/jpeg", q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(null); };
    img.src = url;
  });
}
function readFiles(files, cb) {
  const list = Array.from(files).slice(0, 6);
  if (!list.length) return cb([]);
  Promise.all(list.map(compressImage)).then((res) => cb(res.filter(Boolean)));
}

export default function AlarmDetail({ id }) {
  const [data, setData] = useState(null);
  const [err, setErr] = useState("");
  const [ackOpen, setAckOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [dispatchOpen, setDispatchOpen] = useState(false);
  const [lightbox, setLightbox] = useState(null); // enlarged photo (data URL)

  async function load() {
    setErr("");
    try {
      const r = await fetch(`/api/mainapp/alarms/${encodeURIComponent(id)}`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Failed to load"); return; }
      setData(d);
    } catch { setErr("Network error"); }
  }
  useEffect(() => { load(); }, [id]);

  if (err) return <div className={styles.page}><a className={styles.back} href="/mainapp/alarms">← All alarms</a><div className={styles.err}>{err}</div></div>;
  if (!data) return <div className={styles.page}><div className={styles.muted}>Loading…</div></div>;

  const { alarm, snapshot = {}, lifecycle = [], me = {} } = data;
  const prio = PRIO[alarm.priority] || PRIO.Low;
  const statusLabel = alarm.status === "Open" ? "OPEN" : alarm.status === "Acknowledged" ? "ACKNOWLEDGED" : "CLOSED";
  // Disable the Acknowledge button only when every side THIS user may ack is done
  // (so an admin/dual user stays live until both sides ack; a single-side user
  // until their side acks).
  // The security company only handles Critical alarms — on lower tiers only the
  // monitoring side counts, and Track / Track & respond are disabled.
  const critical = alarm.priority === "Critical";
  const myAckSides = [me.canAckMonitoring && "monitoring", me.canAckSecurity && critical && "security"].filter(Boolean);
  const mySideAcked = myAckSides.length > 0 && myAckSides.every((s) => s === "monitoring" ? me.ackedMonitoring : me.ackedSecurity);
  const techOnSite = alarm.alarm_type === "DISTURBANCE_TECH";
  const canTrack = critical;   // dispatch/track is a Critical-alarm action

  // Carry the alarm id into Track so the operator can jump straight back to the
  // alarm details page from there (no bouncing between the list/map and track).
  const trackHref = `/mainapp/track?device=${encodeURIComponent(alarm.device_id || "")}&alarm=${encodeURIComponent(alarm.id)}`;
  const respondHref = `${trackHref}&respond=1`;
  const mapHref = `/mainapp/alarmmaps?focus=${encodeURIComponent(alarm.id)}`;
  const isClosed = alarm.status === "Closed";
  const photos = Array.isArray(alarm.close_photos) ? alarm.close_photos : [];

  // Log "response started" (name + team) before opening the tracking page.
  async function startRespond() {
    try { await fetch(`/api/mainapp/alarms/${encodeURIComponent(id)}/respond`, { method: "POST" }); } catch {}
    window.location.href = respondHref;
  }

  return (
    <div className={styles.page}>
      <a className={styles.back} href="/mainapp/alarms">← All alarms</a>
      <span className={styles.crumb}>{alarm.id}</span>

      {/* banner */}
      <div className={`${styles.banner} ${styles[prio.cls]}`}>
        <div className={styles.bIcon}><i className="ti ti-alert-triangle" /></div>
        <div className={styles.bBody}>
          <div className={styles.bName}>{alarm.name}</div>
          <div className={styles.bSub}>{alarm.device_id}{alarm.site ? ` · ${alarm.site}` : ""}</div>
        </div>
        <div className={styles.bStatus}>{statusLabel}</div>
      </div>

      <div className={styles.cols}>
        {/* left */}
        <div className={styles.left}>
          <div className={styles.card}>
            <div className={styles.cardHead}>Details</div>
            <Row k="Priority" v={<span className={styles.prioTag}><span className={styles.prioDot} data-p={alarm.priority} /> {alarm.priority}</span>} />
            <Row k="Alarm ID" v={alarm.id} />
            <Row k="Device" v={alarm.device_id || "—"} />
            <Row k="Site" v={alarm.site || "—"} />
            <Row k="Serial" v={alarm.serial || "—"} />
            {alarm.road && <Row k="Road" v={alarm.road} />}
            <Row k="Tech on site" v={techOnSite ? "Yes — technician on site" : "No — no technician on site"} />
          </div>

          <button className={styles.dispatchBtn} onClick={() => setDispatchOpen(true)}>
            <span className={styles.dispatchIcon}><i className="ti ti-send" /></span>
            Who to dispatch
            <span className={styles.dispatchSub}>region · team · contacts</span>
          </button>

          <div className={styles.card}>
            <div className={styles.cardHead}>Device snapshot at trigger</div>
            <div className={styles.snap}>
              <Snap k="Battery" v={snapshot.battery != null ? `${snapshot.battery}%` : "—"} />
              <Snap k="Data bundle" v={snapshot.dataBundle || "—"} />
              <Snap k="Motion sensitivity" v={snapshot.motionSensitivity || "—"} />
              <Snap k="Speed" v={snapshot.speed != null ? `${snapshot.speed} km/h` : "—"} />
              <Snap k="Status" v={snapshot.status || "—"} good={snapshot.status === "Live"} />
              <Snap k="Firmware" v={snapshot.firmware || "—"} />
            </div>
          </div>

          {isClosed && photos.length > 0 && (
            <div className={styles.card}>
              <div className={styles.cardHead}>Photos of completed work ({photos.length})</div>
              <div className={styles.galleryWrap}>
                <div className={styles.gallery}>
                  {photos.map((src, i) => (
                    <button key={i} type="button" className={styles.galItem} onClick={() => setLightbox(src)} title={`Photo ${i + 1}`}>
                      <img src={src} alt={`Evidence ${i + 1}`} />
                      <div className={styles.galCap}>Photo {i + 1}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* right */}
        <div className={styles.right}>
          <div className={styles.card}>
            <div className={styles.cardHead}>Lifecycle log</div>
            <div className={styles.life}>
              {lifecycle.map((e, i) => (
                <div key={i}>
                  <div className={styles.lifeRow}>
                    <div className={`${styles.lifeIcon} ${styles[evClass(e)] || ""}`}><i className={`ti ${evIcon(e)}`} /></div>
                    <div className={styles.lifeBody}>
                      <div className={styles.lifeTitle}>{e.title}{e.thisAlarm ? <span className={styles.thisTag}> (this alarm)</span> : ""}</div>
                      {e.detail && <div className={styles.lifeDetail}>{e.detail}</div>}
                    </div>
                    <div className={styles.lifeTime}><i className="ti ti-clock" /> {fmt(e.at)}</div>
                  </div>
                  {i < lifecycle.length - 1 && <div className={styles.lifeArrow}><i className="ti ti-arrow-down" /></div>}
                </div>
              ))}
              {lifecycle.length === 0 && <div className={styles.muted}>No events yet.</div>}
            </div>
          </div>

          <div className={styles.card}>
            <div className={styles.cardHead}>Actions</div>
            {isClosed ? (
              // A closed alarm has no live actions — only its report.
              <div className={styles.hint} style={{ marginTop: 0 }}>This alarm is closed. Open the report for the full record.</div>
            ) : (
              <>
                <button className={`${styles.act} ${styles.aAck}`} disabled={!me.canAck || mySideAcked} onClick={() => setAckOpen(true)}>
                  <i className="ti ti-eye-check" /> {mySideAcked ? "Acknowledged" : "Acknowledge"}
                </button>
                <div className={styles.actRow}>
                  {canTrack
                    ? <a className={`${styles.act} ${styles.aTrack}`} href={trackHref}><i className="ti ti-current-location" /> Track device</a>
                    : <button className={`${styles.act} ${styles.aTrack}`} disabled title="Tracking is available for Critical alarms only"><i className="ti ti-current-location" /> Track device</button>}
                  {canTrack && me.canRespond
                    ? <button className={`${styles.act} ${styles.aRespond}`} onClick={startRespond}><i className="ti ti-run" /> Track and respond</button>
                    : <button className={`${styles.act} ${styles.aRespond}`} disabled title={canTrack ? "Only the response team can start a response" : "Tracking is available for Critical alarms only"}><i className="ti ti-run" /> Track and respond</button>}
                </div>
                {!canTrack
                  ? <div className={styles.hint}>Track &amp; respond is available for Critical alarms only.</div>
                  : !me.canRespond && <div className={styles.hint}>Only the response team can start a response</div>}
                <a className={`${styles.act} ${styles.aMap}`} href={mapHref}><i className="ti ti-map-pin" /> View on map</a>
                {me.canClose
                  ? <button className={`${styles.act} ${styles.aClose}`} onClick={() => setCloseOpen(true)}><i className="ti ti-checkbox" /> Close alarm</button>
                  : <button className={`${styles.act} ${styles.aClose}`} disabled><i className="ti ti-checkbox" /> Close alarm</button>}
                <div className={styles.hint}>Closing requires notes and is only available here.</div>
              </>
            )}
            {/* Full closure/detail report — alarm info, timeline, photos + notes. */}
            <button className={`${styles.act} ${styles.aReport}`} onClick={() => setSummaryOpen(true)}><i className="ti ti-file-description" /> View report</button>
          </div>
        </div>
      </div>

      {ackOpen && <AckModal alarmId={id} onClose={() => setAckOpen(false)} onDone={() => { setAckOpen(false); load(); }} />}
      {closeOpen && <CloseModal id={id} onClose={() => setCloseOpen(false)} onDone={() => { setCloseOpen(false); load(); }} />}
      {summaryOpen && <SummaryModal alarm={alarm} lifecycle={lifecycle} photos={photos} onPhoto={setLightbox} onClose={() => setSummaryOpen(false)} />}
      {dispatchOpen && <DispatchModal alarmId={id} onClose={() => setDispatchOpen(false)} />}
      {lightbox && (
        <div className={styles.overlay} onClick={() => setLightbox(null)}>
          <img className={styles.lightImg} src={lightbox} alt="" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

const ICON = { triggered: "ti-bolt", linked: "ti-link", ack: "ti-eye-check", closed: "ti-checkbox", response: "ti-run" };
const ALARM_ICON = {
  DISTURBANCE: "ti-alert-triangle", DISTURBANCE_TECH: "ti-alert-triangle",
  GEOFENCE_EXIT: "ti-map-pin-off", CRITICAL_MOTION: "ti-run",
  LOW_BATTERY: "ti-battery-2", CRITICAL_LOW_BATTERY: "ti-battery-1",
  HIGH_TEMPERATURE: "ti-temperature", DEVICE_OFFLINE: "ti-plug-connected-x",
  LOW_DATA: "ti-database", NOTIFICATION_FAILED: "ti-bell-x",
};
function evIcon(e) { return e.kind === "alarm" ? (ALARM_ICON[e.alarmType] || "ti-bolt") : (ICON[e.kind] || "ti-point"); }
function evClass(e) { return e.kind === "alarm" ? "k_alarm" : `k_${e.kind}`; }
function Row({ k, v }) { return <div className={styles.row}><span className={styles.rowK}>{k}</span><span className={styles.rowV}>{v}</span></div>; }
function Snap({ k, v, good }) { return <div className={styles.snapCell}><div className={styles.snapK}>{k}</div><div className={`${styles.snapV} ${good ? styles.snapGood : ""}`}>{v}</div></div>; }


function CloseModal({ id, onClose, onDone }) {
  const [outcome, setOutcome] = useState("genuine");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    if (!note.trim()) { setErr("A closing note is required."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/mainapp/alarms/${encodeURIComponent(id)}/close`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcome, note, photos }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not close"); return; }
      onDone();
    } catch { setErr("Network error"); } finally { setBusy(false); }
  }

  return (
    <Overlay onClose={onClose}>
      <div className={styles.mTitle}>Close alarm</div>
      <div className={styles.mLabel}>Was this a genuine alarm?</div>
      <div className={styles.toggle}>
        <button className={`${styles.tBtn} ${outcome === "genuine" ? styles.tGenuine : ""}`} onClick={() => setOutcome("genuine")}><i className="ti ti-shield-check" /> Genuine</button>
        <button className={`${styles.tBtn} ${outcome === "false" ? styles.tFalse : ""}`} onClick={() => setOutcome("false")}><i className="ti ti-alert-circle" /> False alarm</button>
      </div>
      <div className={styles.mLabel}>Closing note</div>
      <textarea className={styles.ta} placeholder="What was found and what was done…" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className={styles.mLabel}>Photos of what was found <span className={styles.optional}>(optional, up to 6)</span></div>
      <input type="file" accept="image/*" multiple onChange={(e) => readFiles(e.target.files, setPhotos)} />
      {photos.length > 0 && <div className={styles.thumbs}>{photos.map((p, i) => <img key={i} className={styles.thumb} src={p} alt="" />)}</div>}
      {err && <div className={styles.err}>{err}</div>}
      <div className={styles.mActions}>
        <button className={styles.mCancel} onClick={onClose} disabled={busy}>Cancel</button>
        <button className={styles.mClose} onClick={submit} disabled={busy}>{busy ? "…" : "Close alarm"}</button>
      </div>
    </Overlay>
  );
}

function SummaryModal({ alarm, lifecycle = [], photos = [], onPhoto, onClose }) {
  const responders = lifecycle.filter((e) => e.kind === "response");
  const acks = lifecycle.filter((e) => e.kind === "ack");
  const created = alarm.created_at ? new Date(alarm.created_at) : null;
  const closed = alarm.closed_at ? new Date(alarm.closed_at) : null;
  let duration = "—";
  if (created && closed) { const m = Math.max(0, Math.round((closed - created) / 60000)); duration = m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`; }
  const outcome = alarm.status === "Closed" ? (alarm.close_outcome === "false" ? "FALSE ALARM" : "RESOLVED") : (alarm.status || "").toUpperCase();

  return (
    <Overlay onClose={onClose}>
      <div className={styles.mHead}>
        <div className={styles.mIcon}><i className="ti ti-file-description" /></div>
        <div><div className={styles.mTitle}>{alarm.name}</div><div className={styles.mSub}>{alarm.id} · {alarm.site || "—"} · {alarm.device_id || "—"}</div></div>
        <span className={styles.repStatus}>{outcome}</span>
        <button className={styles.mX} onClick={onClose}><i className="ti ti-x" /></button>
      </div>

      <div className={styles.repStats}>
        <div className={styles.repTile}><div className={styles.repN}>{responders.length}</div><div className={styles.repK}>Responders</div></div>
        <div className={styles.repTile}><div className={styles.repN}>{duration}</div><div className={styles.repK}>Duration</div></div>
        <div className={styles.repTile}><div className={styles.repN}>{photos.length}</div><div className={styles.repK}>Photos</div></div>
      </div>

      {responders.length > 0 && (<>
        <div className={styles.mLabel}>Response teams</div>
        {responders.map((e, i) => (
          <div key={i} className={styles.repRow}><span><i className="ti ti-run" /> {e.detail || e.by}</span><span className={styles.repTime}>{fmt(e.at)}</span></div>
        ))}
      </>)}

      <div className={styles.mLabel}>Timeline</div>
      <div className={styles.life}>
        {lifecycle.map((e, i) => (
          <div key={i} className={styles.lifeRow}>
            <div className={`${styles.lifeIcon} ${styles[evClass(e)] || ""}`}><i className={`ti ${evIcon(e)}`} /></div>
            <div className={styles.lifeBody}><div className={styles.lifeTitle}>{e.title}{e.thisAlarm ? " (this alarm)" : ""}</div>{e.detail && <div className={styles.lifeDetail}>{e.detail}</div>}</div>
            <div className={styles.lifeTime}>{fmt(e.at)}</div>
          </div>
        ))}
      </div>

      {photos.length > 0 && (<>
        <div className={styles.mLabel}>Photos of completed work</div>
        <div className={styles.galleryWrap}>
          <div className={styles.gallery}>
            {photos.map((src, i) => (
              <button key={i} type="button" className={styles.galItem} onClick={() => onPhoto && onPhoto(src)}>
                <img src={src} alt={`Evidence ${i + 1}`} />
                <div className={styles.galCap}>Photo {i + 1}</div>
              </button>
            ))}
          </div>
        </div>
      </>)}

      {acks.length > 0 && (<>
        <div className={styles.mLabel}>Acknowledgement notes</div>
        {acks.map((e, i) => <div key={i} className={styles.noteBox}><b>{e.title}</b> — {e.detail}</div>)}
      </>)}

      {alarm.close_note && (<>
        <div className={styles.mLabel}>Closing note</div>
        <div className={styles.noteBox}>“{alarm.close_note}”</div>
      </>)}

      <div className={styles.mActions}><button className={styles.mGo} style={{ flex: 1 }} onClick={onClose}>Close</button></div>
    </Overlay>
  );
}

function Overlay({ children, onClose }) {
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>{children}</div>
    </div>
  );
}
