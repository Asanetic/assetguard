// app/mainapp/ports/components/PortsManager.jsx
// The official TCP listener ports manager: open/close/add ports, live per-port
// stats, and previews of the latest raw + parsed data (with "View all" links).
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ports.module.css";

function ago(iso) {
  if (!iso) return "—";
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s} s ago`;
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} hr ago`;
  return `${Math.round(h / 24)} d ago`;
}
function fmtTime(iso) { try { return new Date(iso).toLocaleTimeString(); } catch { return "—"; } }
function eventOf(t) {
  const al = Array.isArray(t.alarms) ? t.alarms : [];
  if (al.length) return al[0].replace("_", " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return "Position";
}

function bytesMB(b) { const n = Number(b) || 0; if (n < 1048576) return `${Math.round(n / 1024)} KB`; return `${(n / 1048576).toFixed(n < 1073741824 ? 0 : 1)} MB`; }

export default function PortsManager() {
  const [ports, setPorts] = useState([]);
  const [raw, setRaw] = useState([]);
  const [parsed, setParsed] = useState([]);
  const [stats, setStats] = useState(null);
  const [busy, setBusy] = useState("");
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [newPort, setNewPort] = useState("");
  const [newModel, setNewModel] = useState("");
  const timer = useRef(null);

  async function poll() {
    try {
      const [p, r, t, s] = await Promise.all([
        fetch("/api/mainapp/ports", { cache: "no-store" }),
        fetch("/api/mainapp/ports/raw?limit=4", { cache: "no-store" }),
        fetch("/api/mainapp/ingest/telemetry?newest=1&limit=4", { cache: "no-store" }),
        fetch("/api/mainapp/ports/stats", { cache: "no-store" }),
      ]);
      if (p.ok) setPorts((await p.json()).ports || []);
      if (r.ok) setRaw((await r.json()).raw || []);
      if (t.ok) setParsed((await t.json()).telemetry || []);
      if (s.ok) setStats(await s.json());
    } catch {}
  }
  useEffect(() => { poll(); timer.current = setInterval(poll, 3000); return () => clearInterval(timer.current); }, []);

  async function toggle(port, action) {
    setBusy(`${port}:${action}`); setErr("");
    try {
      const r = await fetch(`/api/mainapp/ports/${port}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
      const d = await r.json();
      if (!r.ok) setErr(d.error || d.lastError || `Could not ${action} port ${port}`);
      await poll();
    } catch { setErr("Network error"); }
    finally { setBusy(""); }
  }
  async function removePort(port) {
    setBusy(`${port}:del`);
    try { await fetch(`/api/mainapp/ports/${port}`, { method: "DELETE" }); await poll(); }
    catch {} finally { setBusy(""); }
  }
  async function addPort() {
    if (!newPort) return;
    setBusy("add"); setErr("");
    try {
      const r = await fetch("/api/mainapp/ports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ port: Number(newPort), deviceModel: newModel }) });
      const d = await r.json();
      if (!r.ok) setErr(d.error || "Could not add port");
      else { setNewPort(""); setNewModel(""); setAdding(false); await poll(); }
    } catch { setErr("Network error"); }
    finally { setBusy(""); }
  }

  const stateCls = (s) => s === "open" ? styles.stOpen : s === "listening" ? styles.stListen : s === "error" ? styles.stErr : styles.stClosed;

  const S = stats || {};
  return (
    <div className={styles.page}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitle}>Device logs &amp; ports</div>
        <div className={styles.pageSub}>Listener control, raw frames and parsed telemetry</div>
      </div>

      <div className={styles.stats}>
        <div className={styles.stat}><div className={`${styles.statN} ${styles.nGreen}`}>{(S.activeConnections ?? 0).toLocaleString()}</div><div className={styles.statK}>Active connections</div><div className={styles.statSub}>live sockets</div></div>
        <div className={styles.stat}><div className={styles.statN}>{(S.messagesToday ?? 0).toLocaleString()}</div><div className={styles.statK}>Messages today</div><div className={styles.statSub}>frames in</div></div>
        <div className={styles.stat}><div className={styles.statN}>{bytesMB(S.bytesInToday)}</div><div className={styles.statK}>Bytes in</div><div className={styles.statSub}>today</div></div>
        <div className={styles.stat}><div className={`${styles.statN} ${styles.nRed}`}>{(S.parseErrors ?? 0).toLocaleString()}</div><div className={styles.statK}>Parse errors</div><div className={styles.statSub}>malformed</div></div>
        <div className={styles.stat}><div className={`${styles.statN} ${styles.nAmber}`}>{(S.unknownDevices ?? 0).toLocaleString()}</div><div className={styles.statK}>Unknown devices</div><div className={styles.statSub}>not enrolled</div></div>
      </div>

      <div className={styles.card}>
        <div className={styles.head}>
          <div className={styles.title}>TCP listener ports</div>
          <button className={styles.addLink} onClick={() => setAdding((v) => !v)}>{adding ? "cancel" : "add a port"}</button>
        </div>

        {adding && (
          <div className={styles.addRow}>
            <input className={styles.in} type="number" placeholder="Port (e.g. 5090)" value={newPort} onChange={(e) => setNewPort(e.target.value)} />
            <input className={styles.in} placeholder="Device model (e.g. Teltonika FMB920)" value={newModel} onChange={(e) => setNewModel(e.target.value)} />
            <button className={styles.addBtn} onClick={addPort} disabled={busy === "add"}>{busy === "add" ? "Adding…" : "Add port"}</button>
          </div>
        )}
        {err && <div className={styles.err}>{err}</div>}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Port</th><th>Proto</th><th>Device model</th><th>State</th><th>Conns</th><th>Messages</th><th>Last frame</th><th style={{ textAlign: "right" }}>Action</th></tr></thead>
            <tbody>
              {ports.map((p) => (
                <tr key={p.port}>
                  <td className={styles.port}>{p.port}</td>
                  <td className={styles.mut}>{p.proto}</td>
                  <td>{p.deviceModel || "—"}</td>
                  <td><span className={`${styles.state} ${stateCls(p.state)}`}>{p.state === "open" ? "Open" : p.state === "listening" ? "Listening" : p.state === "error" ? "Error" : "Closed"}</span></td>
                  <td>{p.conns ?? 0}</td>
                  <td>{(p.messages ?? 0).toLocaleString()}</td>
                  <td className={styles.mut}>{p.lastFrameAt ? ago(p.lastFrameAt) : "—"}</td>
                  <td style={{ textAlign: "right" }}>
                    <div className={styles.actions}>
                      {p.bound
                        ? <button className={styles.close} onClick={() => toggle(p.port, "close")} disabled={busy === `${p.port}:close`}>Close port</button>
                        : <button className={styles.open} onClick={() => toggle(p.port, "open")} disabled={busy === `${p.port}:open`}>Open port</button>}
                      <button className={styles.del} title="Remove port" onClick={() => removePort(p.port)}><i className="ti ti-trash" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {ports.length === 0 && <tr><td colSpan={8} className={styles.empty}>No ports configured. Add one above.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className={styles.grid}>
        {/* raw preview */}
        <div className={styles.card}>
          <div className={styles.panelHead}><span className={styles.panelTitle}>Raw port data</span><a className={styles.viewAll} href="/mainapp/ports/raw">View all →</a></div>
          <div className={styles.rawList}>
            {raw.length === 0 && <div className={styles.empty}>No frames yet.</div>}
            {raw.map((r) => (
              <div key={r.id} className={styles.rawRow}>
                <div className={styles.rawMeta}><span className={styles.rawTime}>{fmtTime(r.received_at)}</span> <span className={styles.rawPort}>:{r.port ?? "—"}</span> <span className={styles.rawDev}>{r.device || "—"}</span></div>
                <div className={styles.rawData}>{r.data}</div>
              </div>
            ))}
          </div>
        </div>

        {/* parsed preview */}
        <div className={styles.card}>
          <div className={styles.panelHead}><span className={styles.panelTitle}>Parsed &amp; aligned</span><a className={styles.viewAll} href="/mainapp/tcplogs">View all →</a></div>
          <div className={styles.parsedList}>
            {parsed.length === 0 && <div className={styles.empty}>No parsed telemetry yet.</div>}
            {parsed.map((t) => (
              <div key={t.id} className={styles.parsedRow}>
                <div className={styles.parsedTop}><b>{t.device_code || t.imei}</b> · {eventOf(t)}<span className={styles.parsedTime}>{fmtTime(t.received_at)}</span></div>
                <div className={styles.parsedSub}>
                  {t.lat != null ? `${Number(t.lat).toFixed(4)}, ${Number(t.lng).toFixed(4)}` : "no fix"} · {t.speed ?? 0} km/h · {t.battery != null ? `${t.battery}%` : "—"} · {t.satellites ?? 0} sats{t.site ? ` · ${t.site}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
