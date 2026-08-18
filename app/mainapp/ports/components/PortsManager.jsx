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

  // ---- send-command state ----
  const [connected, setConnected] = useState([]);
  const [cmdImei, setCmdImei] = useState("");
  const [cmdText, setCmdText] = useState("UPGRADE");
  const [cmdMode, setCmdMode] = useState("tc");   // "tc" = wrapped, "raw" = verbatim
  const [cmdPrefix, setCmdPrefix] = useState("SG");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState(null);

  async function poll() {
    try {
      const [p, r, t, s, c] = await Promise.all([
        fetch("/api/mainapp/ports", { cache: "no-store" }),
        fetch("/api/mainapp/ports/raw?limit=4", { cache: "no-store" }),
        fetch("/api/mainapp/ingest/telemetry?newest=1&limit=4", { cache: "no-store" }),
        fetch("/api/mainapp/ports/stats", { cache: "no-store" }),
        fetch("/api/mainapp/ingest/send-command", { cache: "no-store" }),
      ]);
      if (p.ok) setPorts((await p.json()).ports || []);
      if (r.ok) setRaw((await r.json()).raw || []);
      if (t.ok) setParsed((await t.json()).telemetry || []);
      if (s.ok) setStats(await s.json());
      if (c.ok) setConnected((await c.json()).connected || []);
    } catch {}
  }
  useEffect(() => { poll(); timer.current = setInterval(poll, 3000); return () => clearInterval(timer.current); }, []);
  // Prefill the IMEI with the first connected device once one appears.
  useEffect(() => { if (!cmdImei && connected[0]?.imei) setCmdImei(connected[0].imei); }, [connected]);

  // Build the exact bytes to send: wrapped [PREFIX*IMEI*LEN*cmd], or raw verbatim.
  // LEN = hex byte-length of the command payload (verified against real uplink frames).
  function buildFrame() {
    if (cmdMode === "raw") return cmdText;
    const imei = (cmdImei || "IMEI").trim();
    let payload = cmdText.trim();
    if (!payload.endsWith("#")) payload += "#";   // every command ends with '#'
    const len = byteLen(payload).toString(16).toUpperCase().padStart(4, "0");
    return `[${(cmdPrefix || "SG").trim()}*${imei}*${len}*${payload}]`;
  }
  const cmdTok = cmdText.trim().toUpperCase().split(",")[0];
  const cmdHelp = COMMANDS.find((c) => c.code === cmdTok)?.desc || "";
  async function sendCommand() {
    const imei = (cmdImei || "").trim();
    if (!imei) { setSendMsg({ ok: false, text: "Enter or pick a device IMEI first" }); return; }
    const frame = buildFrame();
    setSending(true); setSendMsg(null);
    try {
      // wrap:false → portManager writes the exact bytes we built
      const r = await fetch("/api/mainapp/ingest/send-command", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imei, cmd: frame, wrap: false }),
      });
      const d = await r.json();
      if (r.ok && d.ok) setSendMsg({ ok: true, text: `Sent to ${imei} (${d.sent}/${d.targets}) · ${frame}` });
      else setSendMsg({ ok: false, text: d.error || "Send failed — device may not be connected" });
    } catch { setSendMsg({ ok: false, text: "Network error" }); }
    finally { setSending(false); }
  }

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
        <div className={styles.stat}><div className={`${styles.statN} ${styles.nRed}`}>{(S.parseErrors ?? 0).toLocaleString()}</div><div className={styles.statK}>Parse errors</div><a className={styles.statSub} href="/mainapp/ports/parse-errors" style={{ color: "#2E6CF5", textDecoration: "none" }}>view →</a></div>
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

      {/* send command to a connected device */}
      <div className={styles.card}>
        <div className={styles.panelHead}>
          <span className={styles.panelTitle}>Send command</span>
          <span style={{ fontSize: 12, color: "#94a3b8" }}>{connected.length} connected</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
          <div>
            <label style={SC.lbl}>Target device (IMEI)</label>
            <input list="conn-imeis" style={SC.in} value={cmdImei} onChange={(e) => setCmdImei(e.target.value)} placeholder="861045082572846" />
            <datalist id="conn-imeis">
              {connected.map((c) => <option key={`${c.imei}:${c.port}`} value={c.imei}>{`:${c.port} ${c.ip || ""}`}</option>)}
            </datalist>
          </div>
          <div>
            <label style={SC.lbl}>Command</label>
            <select value="" onChange={(e) => { const c = COMMANDS.find((x) => x.code === e.target.value); if (c) setCmdText(c.tmpl); }} style={{ ...SC.in, marginBottom: 6, cursor: "pointer" }}>
              <option value="">— pick a command —</option>
              {COMMANDS.map((c) => <option key={c.code} value={c.code}>{c.code} · {c.desc}</option>)}
            </select>
            <input style={SC.in} value={cmdText} onChange={(e) => setCmdText(e.target.value)} placeholder="UPGRADE" />
            {cmdHelp && <div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{cmdHelp}</div>}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
              {["UPGRADE", "RESET", "RFS"].map((q) => (
                <button key={q} type="button" onClick={() => setCmdText(q)} style={SC.chip}>{q}</button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, alignItems: "center", marginTop: 10, flexWrap: "wrap", fontSize: 13 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="radio" checked={cmdMode === "tc"} onChange={() => setCmdMode("tc")} /> Wrapped&nbsp;<code style={SC.code}>[PREFIX*IMEI*LEN*cmd]</code>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
            <input type="radio" checked={cmdMode === "raw"} onChange={() => setCmdMode("raw")} /> Raw exact (type the full frame)
          </label>
          {cmdMode === "tc" && (
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              prefix <input style={{ ...SC.in, width: 70, padding: "5px 8px" }} value={cmdPrefix} onChange={(e) => setCmdPrefix(e.target.value)} />
            </span>
          )}
        </div>

        <label style={SC.lbl}>Bytes that will be sent</label>
        <div style={SC.preview}>{buildFrame() || "—"}</div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 12 }}>
          <button onClick={sendCommand} disabled={sending} style={{ ...SC.send, opacity: sending ? 0.7 : 1 }}>
            {sending ? "Sending…" : "Send raw →"}
          </button>
          {sendMsg && <span style={{ fontSize: 13, color: sendMsg.ok ? "#16a34a" : "#dc2626", wordBreak: "break-all" }}>{sendMsg.text}</span>}
        </div>
      </div>
    </div>
  );
}

// Official GL-28 "SG" downlink commands (from the manufacturer protocol sheet).
// tmpl = a ready-to-edit payload; params after the comma are examples.
const COMMANDS = [
  { code: "UPGRADE", tmpl: "UPGRADE", desc: "Firmware upgrade" },
  { code: "RESET", tmpl: "RESET", desc: "Restart device" },
  { code: "RFS", tmpl: "RFS", desc: "Restore factory settings (keeps IMEI, APN)" },
  { code: "UPT", tmpl: "UPT,24", desc: "Upload interval after sleep — hours, 0–48" },
  { code: "GS", tmpl: "GS,30", desc: "Sensor sensitivity threshold" },
  { code: "CENTER", tmpl: "CENTER,13800138000", desc: "SMS alarm receiving phone number" },
  { code: "APN", tmpl: "APN,cmnet,,", desc: "Cellular APN / account / password (restart after)" },
  { code: "IP", tmpl: "IP,123.45.67.89,10219", desc: "Server IP and port (restart after)" },
  { code: "IMEI", tmpl: "IMEI,861234567890123", desc: "Modify device IMEI" },
];

// Byte length of the payload (LEN field). ASCII commands = 1 byte/char; this
// stays correct for any UTF-8 too.
function byteLen(s) {
  try { return new TextEncoder().encode(String(s)).length; }
  catch { return String(s).length; }
}

// Inline styles for the Send-command card (kept out of the CSS module to avoid
// selector-purity issues and keep this drop-in self-contained).
const SC = {
  lbl: { display: "block", fontSize: 12, color: "#64748b", margin: "10px 0 4px" },
  in: { width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff", fontSize: 14, fontFamily: "ui-monospace, monospace", boxSizing: "border-box" },
  chip: { fontSize: 12, padding: "4px 10px", border: "1px solid #e2e8f0", borderRadius: 999, background: "#fff", color: "#475569", cursor: "pointer" },
  code: { fontFamily: "ui-monospace, monospace", fontSize: 12, background: "#f1f5f9", padding: "1px 5px", borderRadius: 4, color: "#334155" },
  preview: { fontFamily: "ui-monospace, monospace", fontSize: 13, color: "#0369a1", background: "#f1f5f9", border: "1px dashed #cbd5e1", borderRadius: 8, padding: "8px 10px", wordBreak: "break-all" },
  send: { background: "#2E6CF5", color: "#fff", border: 0, borderRadius: 999, padding: "9px 20px", fontSize: 14, cursor: "pointer" },
};
