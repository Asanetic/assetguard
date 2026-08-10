// app/mainapp/ingest/components/IngestPanel.jsx
// Open/close the tracker port, watch RAW traffic, and send data back to a
// connected tracker (with optional auto-ACK).
"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./ingest.module.css";

const SAMPLE = "[3G*863957075080470*006A*UD,310726,175332,A,1.541982,S,37.261975,E,0.00,248,0,22,100,73,0,0,00000008,1,255,639,2,10073,15720975,155]";

function fmtTime(iso) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleTimeString(); } catch { return iso; }
}

export default function IngestPanel() {
  const [port, setPort] = useState(9000);
  const [status, setStatus] = useState({ status: "stopped", connections: [], connectionCount: 0, packets: 0, bytesIn: 0, bytesOut: 0, errors: 0, autoAck: { enabled: false, text: "" } });
  const [logs, setLogs] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const [selConn, setSelConn] = useState(null);   // null = broadcast
  const [sendText, setSendText] = useState("");
  const [sendHex, setSendHex] = useState(false);

  const [ackEnabled, setAckEnabled] = useState(false);
  const [ackText, setAckText] = useState("");
  const ackInit = useRef(false);

  const [raw, setRaw] = useState(SAMPLE);
  const lastId = useRef(0);
  const scrollRef = useRef(null);

  async function poll() {
    try {
      const r = await fetch(`/api/mainapp/ingest/logs?since=${lastId.current}`, { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      if (d.status) {
        setStatus(d.status);
        if (!ackInit.current && d.status.autoAck) {
          setAckEnabled(!!d.status.autoAck.enabled);
          setAckText(d.status.autoAck.text || "");
          ackInit.current = true;
        }
      }
      if (d.logs && d.logs.length) {
        lastId.current = d.logs[d.logs.length - 1].id;
        setLogs((prev) => [...prev, ...d.logs].slice(-500));
      }
    } catch {}
  }

  useEffect(() => {
    poll();
    const t = setInterval(poll, 1500);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  async function control(action, extra = {}) {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/mainapp/ingest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, port: Number(port) || 9000, ...extra }),
      });
      const d = await r.json();
      if (!r.ok) setErr(d.error || d.lastError || "Action failed");
      else setStatus(d);
    } catch { setErr("Network error"); }
    finally { setBusy(false); }
  }

  async function saveAck() {
    await control("ack", { enabled: ackEnabled, text: ackText });
  }

  async function send() {
    setErr("");
    if (!sendText) { setErr("Enter data to send"); return; }
    try {
      const r = await fetch("/api/mainapp/ingest/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connId: selConn || null, data: sendText, hex: sendHex }),
      });
      const d = await r.json();
      if (!r.ok) setErr(d.error || "Send failed");
      else { setStatus(d); poll(); }
    } catch { setErr("Network error"); }
  }

  async function sendTest() {
    setErr("");
    try {
      const r = await fetch("/api/mainapp/ingest/test", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ raw }),
      });
      const d = await r.json();
      if (!r.ok) setErr(d.error || "Could not process packet"); else poll();
    } catch { setErr("Network error"); }
  }

  const listening = status.status === "listening";
  const errored = status.status === "error";
  const conns = status.connections || [];

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <div>
          <div className={styles.title}>Live logs</div>
          <div className={styles.sub}>Open the tracker port, capture raw traffic, and send data back to a connected device.</div>
        </div>
      </div>

      {/* control */}
      <div className={styles.card}>
        <div className={styles.ctrlRow}>
          <div className={styles.field}>
            <label className={styles.label}>TCP port</label>
            <input className={styles.port} type="number" min="1" max="65535"
              value={port} onChange={(e) => setPort(e.target.value)} disabled={listening} />
          </div>
          {!listening ? (
            <button className={styles.open} onClick={() => control("start")} disabled={busy}>
              <i className="ti ti-plug-connected" aria-hidden="true" />
              {busy ? "Opening…" : "Open port"}
            </button>
          ) : (
            <button className={styles.close} onClick={() => control("stop")} disabled={busy}>
              <i className="ti ti-plug-connected-x" aria-hidden="true" />
              {busy ? "Closing…" : "Close port"}
            </button>
          )}
          <span className={`${styles.badge} ${listening ? styles.badgeOn : errored ? styles.badgeErr : styles.badgeOff}`}>
            <span className={`${styles.dot} ${listening ? styles.dotOn : errored ? styles.dotErr : styles.dotOff}`} />
            {listening ? `Listening on :${status.port}` : errored ? "Error" : "Port closed"}
          </span>
        </div>

        <div className={styles.statusRow}>
          <span className={styles.stat}>Connections <b>{status.connectionCount ?? 0}</b></span>
          <span className={styles.stat}>Packets <b>{status.packets ?? 0}</b></span>
          <span className={styles.stat}>Bytes in <b>{status.bytesIn ?? 0}</b></span>
          <span className={styles.stat}>Bytes out <b>{status.bytesOut ?? 0}</b></span>
          <span className={styles.stat}>Errors <b>{status.errors ?? 0}</b></span>
        </div>

        {err && <div className={styles.errLine}>{err}{errored && status.lastError ? ` — ${status.lastError}` : ""}</div>}

        {/* auto-ACK */}
        <div className={styles.ackRow}>
          <label className={styles.ackToggle}>
            <input type="checkbox" checked={ackEnabled} onChange={(e) => setAckEnabled(e.target.checked)} />
            Auto-ACK every inbound packet
          </label>
          <input className={styles.ackInput} placeholder="reply to send, e.g. [3G*IMEI*0002*LK]"
            value={ackText} onChange={(e) => setAckText(e.target.value)} />
          <button className={styles.smallBtn} onClick={saveAck} disabled={busy}>Save</button>
        </div>

        <div className={styles.hint}>
          Trackers connect to <b>this server&rsquo;s public IP</b> on the port above (default 9000);
          open the VPS firewall for inbound TCP there. All data is captured raw — no parsing for now.
        </div>
      </div>

      {/* send to device */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>Send to device</div>
        {conns.length === 0 ? (
          <div className={styles.muted}>No active connections. When a tracker connects it appears here and you can send to it.</div>
        ) : (
          <div className={styles.connList}>
            <label className={styles.connItem}>
              <input type="radio" name="conn" checked={selConn === null} onChange={() => setSelConn(null)} />
              <span className={styles.connBroadcast}>Broadcast to all ({conns.length})</span>
            </label>
            {conns.map((c) => (
              <label key={c.id} className={styles.connItem}>
                <input type="radio" name="conn" checked={selConn === c.id} onChange={() => setSelConn(c.id)} />
                <span className={styles.connMain}>#{c.id} · {c.ip}:{c.port}</span>
                <span className={styles.connMeta}>in {c.bytesIn}b · out {c.bytesOut}b</span>
              </label>
            ))}
          </div>
        )}
        <div className={styles.sendRow}>
          <input className={styles.sendInput} placeholder={sendHex ? "hex bytes e.g. 78 78 0D 01 ..." : "text/ASCII to send back to the tracker"}
            value={sendText} onChange={(e) => setSendText(e.target.value)} />
          <label className={styles.hexChk}>
            <input type="checkbox" checked={sendHex} onChange={(e) => setSendHex(e.target.checked)} /> hex
          </label>
          <button className={styles.sendBtn} onClick={send} disabled={!listening}>
            <i className="ti ti-send" aria-hidden="true" /> {selConn ? `Send to #${selConn}` : "Broadcast"}
          </button>
        </div>
      </div>

      {/* simulate inbound */}
      <div className={styles.card}>
        <div className={styles.sectionTitle}>Simulate inbound raw data</div>
        <div className={styles.testRow}>
          <textarea className={styles.testInput} rows={2} value={raw} onChange={(e) => setRaw(e.target.value)} />
          <button className={styles.sendBtn} onClick={sendTest}><i className="ti ti-arrow-down-to-arc" aria-hidden="true" /> Inject</button>
        </div>
      </div>

      {/* raw feed */}
      <div className={styles.logsHead}>
        <span className={styles.logsTitle}>Raw traffic</span>
        {listening && <span className={styles.live}><span className={`${styles.dot} ${styles.dotOn}`} /> live</span>}
      </div>
      <div className={styles.tableWrap}>
        <div className={styles.scroll} ref={scrollRef}>
          <table className={styles.table}>
            <thead>
              <tr><th>Time</th><th>Dir</th><th>Source</th><th>Bytes</th><th>Data</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td>{fmtTime(l.at)}</td>
                  <td>
                    <span className={`${styles.pill} ${l.dir === "in" ? styles.dirIn : l.dir === "out" ? styles.dirOut : styles.dirSys}`}>
                      {l.dir === "in" ? "IN" : l.dir === "out" ? "OUT" : "SYS"}
                    </span>
                  </td>
                  <td className={styles.mono}>{l.ip === "test" ? "test" : `#${l.connId} ${l.ip}:${l.port}`}</td>
                  <td>{l.bytes}</td>
                  <td className={styles.dataCell} title={l.data}>{l.data}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {logs.length === 0 && <div className={styles.empty}>No traffic yet — open the port and connect a tracker, or inject a test packet above.</div>}
      </div>
    </div>
  );
}
