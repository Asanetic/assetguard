// app/mainapp/logs/components/Heartbeats.jsx
// Heartbeats = device availability. A device is "up" if it sent data at least
// once within 24h. The primary view is SYSTEM-WIDE (all devices) for SLA:
// current 24h status + availability % over 7/14/30/365-day windows + a per-device
// breakdown (worst first). A second tab drills into a single device's detail.
"use client";

import { useCallback, useEffect, useState } from "react";
import DeviceLogs from "./DeviceLogs.jsx";

function fmtWhen(v) {
  if (!v) return "never";
  const s = Math.max(0, Math.round((Date.now() - new Date(v).getTime()) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60); if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60); if (h < 24) return `${h} h ago`;
  const d = Math.round(h / 24); return d === 1 ? "yesterday" : `${d} days ago`;
}
// availability colour: green ≥95, amber 80–95, red <80
function pctColor(p) { return p >= 95 ? "#10B981" : p >= 80 ? "#F59E0B" : "#EF4444"; }

const WINDOWS = [
  { k: "d7", days: 7, label: "7 days" },
  { k: "d14", days: 14, label: "14 days" },
  { k: "d30", days: 30, label: "30 days" },
  { k: "d365", days: 365, label: "12 months" },
];

export default function Heartbeats() {
  const [tab, setTab] = useState("fleet");         // "fleet" | "detail"
  const [detailDevice, setDetailDevice] = useState("");
  const [win, setWin] = useState(30);              // per-device table window
  const [fleet, setFleet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = useCallback(async () => {
    try {
      const r = await fetch(`/api/mainapp/logs?window=${win}`, { cache: "no-store" });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Failed to load"); return; }
      setFleet(j.fleet || null); setErr("");
    } catch { setErr("Network error"); } finally { setLoading(false); }
  }, [win]);
  useEffect(() => { load(); const id = setInterval(load, 30000); return () => clearInterval(id); }, [load]);

  function openDevice(deviceId) { setDetailDevice(deviceId); setTab("detail"); }

  return (
    <div style={S.page}>
      <div style={S.head}>
        <div>
          <div style={S.title}>Heartbeats</div>
          <div style={S.sub}>Device availability across the fleet · a device counts as “up” when it sends data at least once in 24 h</div>
        </div>
        <div style={S.tabs}>
          <button style={{ ...S.tab, ...(tab === "fleet" ? S.tabOn : null) }} onClick={() => setTab("fleet")}>Fleet availability</button>
          <button style={{ ...S.tab, ...(tab === "detail" ? S.tabOn : null) }} onClick={() => setTab("detail")}>Device detail</button>
        </div>
      </div>

      {tab === "detail" ? (
        <DeviceLogs initialDevice={detailDevice} />
      ) : (
        <>
          {err && <div style={S.err}>{err}</div>}

          {/* current status + the four SLA windows */}
          <div style={S.cards}>
            <div style={{ ...S.card, ...S.nowCard }}>
              <div style={S.cardK}>Reporting now</div>
              <div style={S.nowRow}>
                <span style={{ ...S.bigPct, color: pctColor(fleet?.now?.pct ?? 0) }}>{fleet?.now?.pct ?? 0}%</span>
                <span style={S.nowSub}>{fleet?.now?.up ?? 0} of {fleet?.now?.total ?? 0} devices<br />sent data in the last 24 h</span>
              </div>
            </div>
            {WINDOWS.map((w) => {
              const p = fleet?.windows?.[w.k] ?? 0;
              return (
                <div key={w.k} style={S.card}>
                  <div style={S.cardK}>Availability · {w.label}</div>
                  <div style={{ ...S.pct, color: pctColor(p) }}>{p}%</div>
                  <div style={S.track}><div style={{ ...S.fill, width: `${Math.min(100, p)}%`, background: pctColor(p) }} /></div>
                </div>
              );
            })}
          </div>

          {/* per-device breakdown */}
          <div style={S.panel}>
            <div style={S.panelHead}>
              <span style={S.panelTitle}>Per-device availability</span>
              <span style={S.winSel}>
                Window:&nbsp;
                {WINDOWS.map((w) => (
                  <button key={w.days} onClick={() => setWin(w.days)} style={{ ...S.winBtn, ...(win === w.days ? S.winBtnOn : null) }}>{w.label}</button>
                ))}
              </span>
            </div>

            <div style={S.tableWrap}>
              <table style={S.table}>
                <thead>
                  <tr>
                    <th style={S.th}>Device</th>
                    <th style={S.th}>Site</th>
                    <th style={S.th}>Availability ({win === 365 ? "12 mo" : `${win}d`})</th>
                    <th style={S.thR}>Days up</th>
                    <th style={S.thR}>Last seen</th>
                    <th style={S.thR}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading && !fleet && <tr><td colSpan={6} style={S.empty}>Loading…</td></tr>}
                  {fleet && fleet.devices.length === 0 && <tr><td colSpan={6} style={S.empty}>No devices.</td></tr>}
                  {fleet && fleet.devices.map((d) => (
                    <tr key={d.device_id || d.imei} style={S.tr} onClick={() => openDevice(d.device_id || d.imei)}>
                      <td style={S.tdDev}>{d.device_id || d.imei}</td>
                      <td style={S.td}>{d.site}</td>
                      <td style={S.td}>
                        <div style={S.rowBarWrap}>
                          <div style={S.rowTrack}><div style={{ ...S.fill, width: `${Math.min(100, d.pct)}%`, background: pctColor(d.pct) }} /></div>
                          <b style={{ color: pctColor(d.pct), fontVariantNumeric: "tabular-nums" }}>{d.pct}%</b>
                        </div>
                      </td>
                      <td style={S.tdR}>{d.days_up}/{d.days}</td>
                      <td style={S.tdR}>{fmtWhen(d.last_seen)}</td>
                      <td style={S.tdR}>
                        <span style={{ ...S.badge, background: d.up ? "#ECFDF5" : "#FEF2F2", color: d.up ? "#047857" : "#B91C1C", border: `1px solid ${d.up ? "#A7F3D0" : "#FECACA"}` }}>
                          {d.up ? "Up" : "Down"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={S.hint}>Sorted worst-first for SLA triage · click a device for its daily heartbeat detail</div>
          </div>
        </>
      )}
    </div>
  );
}

const S = {
  page: { display: "flex", flexDirection: "column", gap: 16 },
  head: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" },
  title: { fontSize: 22, fontWeight: 800, color: "#0F274A" },
  sub: { fontSize: 13, color: "#64748B", marginTop: 2, maxWidth: 620 },
  tabs: { display: "flex", gap: 6, background: "#F1F5F9", padding: 4, borderRadius: 999 },
  tab: { border: 0, background: "transparent", color: "#475569", fontSize: 13, fontWeight: 700, padding: "7px 16px", borderRadius: 999, cursor: "pointer" },
  tabOn: { background: "#fff", color: "#0F274A", boxShadow: "0 1px 3px rgba(15,23,42,.12)" },
  err: { color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 12px", fontSize: 13 },
  cards: { display: "grid", gridTemplateColumns: "1.3fr 1fr 1fr 1fr 1fr", gap: 14 },
  card: { background: "#fff", border: "1px solid #EEF2F7", borderRadius: 14, padding: "16px 18px" },
  nowCard: { background: "linear-gradient(180deg,#F8FBFF,#fff)" },
  cardK: { fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em" },
  nowRow: { display: "flex", alignItems: "center", gap: 12, marginTop: 8 },
  bigPct: { fontSize: 40, fontWeight: 800, lineHeight: 1 },
  nowSub: { fontSize: 12, color: "#64748B", lineHeight: 1.35 },
  pct: { fontSize: 30, fontWeight: 800, marginTop: 6, lineHeight: 1.05 },
  track: { height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden", marginTop: 10 },
  fill: { height: "100%", borderRadius: 999, minWidth: 3, transition: "width .3s" },
  panel: { background: "#fff", border: "1px solid #EEF2F7", borderRadius: 14, padding: "18px 20px" },
  panelHead: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: 12 },
  panelTitle: { fontSize: 12, fontWeight: 800, color: "#0F274A", textTransform: "uppercase", letterSpacing: ".03em" },
  winSel: { fontSize: 12, color: "#64748B", display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" },
  winBtn: { border: "1px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 700, padding: "5px 11px", borderRadius: 999, cursor: "pointer" },
  winBtnOn: { background: "#2E6CF5", color: "#fff", borderColor: "#2E6CF5" },
  tableWrap: { overflowX: "auto" },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: { textAlign: "left", fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".04em", padding: "8px 10px", borderBottom: "1px solid #EEF2F7" },
  thR: { textAlign: "right", fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".04em", padding: "8px 10px", borderBottom: "1px solid #EEF2F7" },
  tr: { cursor: "pointer", borderBottom: "1px solid #F4F7FB" },
  td: { padding: "10px", color: "#334155" },
  tdDev: { padding: "10px", color: "#0F274A", fontWeight: 700 },
  tdR: { padding: "10px", textAlign: "right", color: "#334155", fontVariantNumeric: "tabular-nums" },
  rowBarWrap: { display: "flex", alignItems: "center", gap: 10, minWidth: 180 },
  rowTrack: { flex: 1, height: 8, background: "#F1F5F9", borderRadius: 999, overflow: "hidden" },
  badge: { fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "2px 10px" },
  empty: { textAlign: "center", color: "#94A3B8", padding: 22, fontSize: 13 },
  hint: { fontSize: 11.5, color: "#94A3B8", marginTop: 10 },
};
