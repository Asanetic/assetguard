// app/mainapp/alarms/missed/components/MissedAlarms.jsx
// Missed alarms — a faithful port of the prototype. The system cannot detect its
// own omissions, so operators record them here; each entry feeds the SLA report.
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./missedalarms.module.css";

const KINDS = [
  ["recording", "Not recorded — the alarm was never captured"],
  ["timestamp", "Not time-stamped — captured without an accurate time"],
];
const KIND_LABEL = { recording: "Not recorded", timestamp: "Not time-stamped" };

function relTime(v) {
  if (!v) return "";
  const t = new Date(v).getTime();
  if (!Number.isFinite(t)) return "";
  const s = Math.max(0, Math.round((Date.now() - t) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const dd = Math.round(h / 24); return dd === 1 ? "Yesterday" : `${dd} days ago`;
}

export default function MissedAlarms() {
  const [kind, setKind] = useState("recording");
  const [device, setDevice] = useState("");
  const [note, setNote] = useState("");
  const [list, setList] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  async function load() {
    try {
      const res = await fetch("/api/mainapp/missed-alarms", { cache: "no-store" });
      const d = res.ok ? await res.json() : { missed: [] };
      setList(Array.isArray(d.missed) ? d.missed : []);
    } catch { /* keep */ }
  }
  useEffect(() => { load(); }, []);

  function flash(msg) { setToast(msg); if (toastTimer.current) clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(""), 2600); }

  async function record() {
    if (!device.trim()) { flash("Enter the device or site"); return; }
    setBusy(true);
    try {
      const res = await fetch("/api/mainapp/missed-alarms", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, device: device.trim(), note: note.trim() }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { flash(d.error || "Could not record"); setBusy(false); return; }
      setDevice(""); setNote(""); setBusy(false);
      flash("Missed alarm recorded — it now counts against the SLA");
      await load();
    } catch { flash("Network error"); setBusy(false); }
  }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.title}>Missed alarms</div>
        <div className={styles.sub}>These feed directly into the SLA report</div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Log a missed alarm</div>
        <div className={styles.cardSub}>The system cannot detect these on its own — record them here and they count against the SLA.</div>

        <label className={styles.lab}>TYPE</label>
        <select className={styles.in} value={kind} onChange={(e) => setKind(e.target.value)}>
          {KINDS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>

        <label className={styles.lab}>DEVICE / SITE</label>
        <input className={styles.in} placeholder="e.g. 002_MombasaBranch_H" value={device} onChange={(e) => setDevice(e.target.value)} />

        <label className={styles.lab}>WHAT WAS MISSED</label>
        <textarea className={`${styles.in} ${styles.note}`} placeholder="Describe the alarm that should have been raised…" value={note} onChange={(e) => setNote(e.target.value)} />

        <button type="button" className={styles.save} onClick={record} disabled={busy}>{busy ? "Recording…" : "Record missed alarm"}</button>
      </div>

      <div className={styles.logCard}>
        <div className={styles.logHead}>
          <span className={styles.logTitle}>Missed alarm log</span>
          <span className={styles.logCount}>{list.length} recorded</span>
        </div>
        {list.length ? list.map((r) => (
          <div key={r.id} className={styles.row}>
            <div className={styles.rowTop}>
              <span className={`${styles.kindPill} ${r.kind === "recording" ? styles.kindRec : styles.kindTs}`}>{KIND_LABEL[r.kind] || "Missed"}</span>
              <span className={styles.rowDev}>{r.device || "—"}</span>
              <span className={styles.rowId}>{r.id}</span>
            </div>
            {r.note ? <div className={styles.rowNote}>{r.note}</div> : null}
            <div className={styles.rowTime}>{relTime(r.created_at)}</div>
          </div>
        )) : <div className={styles.empty}>No missed alarms recorded</div>}
      </div>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}
