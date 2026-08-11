// app/mainapp/ports/raw/components/RawPortData.jsx
// All raw port data — unparsed frames exactly as the trackers sent them, with
// search + port / device / date filters.
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import styles from "./rawdata.module.css";

function fmt(iso) { try { return new Date(iso).toLocaleString(); } catch { return "—"; } }

export default function RawPortData() {
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [q, setQ] = useState("");
  const [port, setPort] = useState("");
  const [device, setDevice] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [ports, setPorts] = useState([]);
  const t = useRef(null);

  async function load() {
    const p = new URLSearchParams();
    if (q) p.set("q", q); if (port) p.set("port", port); if (device) p.set("device", device);
    if (from) p.set("from", from); if (to) p.set("to", to); p.set("limit", "500");
    try { const r = await fetch(`/api/mainapp/ports/raw?${p.toString()}`, { cache: "no-store" });
      if (r.ok) { const d = await r.json(); setRows(d.raw || []); setTotal(d.total || 0); } } catch {}
  }
  useEffect(() => { (async () => { try { const r = await fetch("/api/mainapp/ports"); if (r.ok) setPorts((await r.json()).ports || []); } catch {} })(); }, []);
  useEffect(() => { if (t.current) clearTimeout(t.current); t.current = setTimeout(load, 250); return () => clearTimeout(t.current);
    // eslint-disable-next-line
  }, [q, port, device, from, to]);

  const devices = useMemo(() => Array.from(new Set(rows.map((r) => r.device).filter(Boolean))).sort(), [rows]);
  function clear() { setQ(""); setPort(""); setDevice(""); setFrom(""); setTo(""); }

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div className={styles.title}>All raw port data</div>
        <div className={styles.sub}>Unparsed frames exactly as the trackers sent them</div>
      </div>

      <div className={styles.card}>
        <input className={styles.search} placeholder="Search device, port, payload…" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className={styles.filters}>
          <div className={styles.f}><label>From</label><input type="date" className={styles.in} value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div className={styles.f}><label>To</label><input type="date" className={styles.in} value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <div className={styles.f}><label>Port</label>
            <select className={styles.in} value={port} onChange={(e) => setPort(e.target.value)}>
              <option value="">All</option>{ports.map((p) => <option key={p.port} value={p.port}>:{p.port}</option>)}
            </select>
          </div>
          <div className={styles.f}><label>Device</label>
            <select className={styles.in} value={device} onChange={(e) => setDevice(e.target.value)}>
              <option value="">All</option>{devices.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <button className={styles.clear} onClick={clear}>Clear</button>
        </div>
        <div className={styles.count}>{rows.length} of {total} frames · 10‑year history</div>

        <div className={styles.list}>
          {rows.length === 0 && <div className={styles.empty}>No frames match.</div>}
          {rows.map((r) => (
            <div key={r.id} className={styles.row}>
              <div className={styles.meta}>
                <span className={styles.time}>{fmt(r.received_at)}</span>{" "}
                <span className={styles.port}>:{r.port ?? "—"}</span>{" "}
                <span className={styles.dev}>{r.device || "—"}</span>{" "}
                <span className={styles.bytes}>{r.bytes ?? 0}B</span>
              </div>
              <div className={styles.data}>{r.data}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
