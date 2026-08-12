// app/mainapp/alarms/components/AckModal.jsx
// Shared Acknowledge modal — used by the alarm list, the alarms-map popup and the
// detail page. Self-contained (inline styles, fetches its own perms) so it can be
// dropped anywhere. Records a finding + note (required) and the side (monitoring /
// security, or admin's choice), matching the /ack API contract.
"use client";

import { useEffect, useState } from "react";
import DispatchModal from "./DispatchModal.jsx";

const OV = { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", zIndex: 60, padding: 20 };
const CARD = { background: "#fff", borderRadius: 16, padding: 22, width: "100%", maxWidth: 540, boxShadow: "0 20px 50px rgba(0,0,0,.25)", maxHeight: "90vh", overflow: "auto" };
const LAB = { fontSize: 12, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: ".04em", margin: "14px 0 8px" };
const TA = { width: "100%", minHeight: 84, border: "1px solid #E2E8F0", borderRadius: 10, padding: 11, fontSize: 13.5, resize: "vertical", boxSizing: "border-box", fontFamily: "inherit" };
const btn = (bg, fg, flex) => ({ flex, background: bg, color: fg, border: bg === "#fff" ? "1px solid #E2E8F0" : "none", borderRadius: 10, padding: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" });

export default function AckModal({ alarmId, onClose, onDone }) {
  const [data, setData] = useState(null);
  const [finding, setFinding] = useState("");
  const [note, setNote] = useState("");
  const [side, setSide] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [step, setStep] = useState("ack");     // ack -> dispatch (security only)
  const [dispatch, setDispatch] = useState(null);

  useEffect(() => {
    fetch(`/api/mainapp/alarms/${encodeURIComponent(alarmId)}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { setData(d); setSide(d?.me?.canChooseSide ? "monitoring" : (d?.me?.side || "monitoring")); })
      .catch(() => setErr("Could not load alarm"));
  }, [alarmId]);

  if (err && !data) return (<div style={OV} onClick={onClose}><div style={CARD} onClick={(e) => e.stopPropagation()}><div style={{ color: "#B91C1C" }}>{err}</div></div></div>);
  if (!data) return (<div style={OV} onClick={onClose}><div style={CARD} onClick={(e) => e.stopPropagation()}>Loading…</div></div>);

  const me = data.me || {}, alarm = data.alarm || {};
  const critical = alarm.priority === "Critical";   // security side only applies to Critical alarms
  if (!me.canAck) return (
    <div style={OV} onClick={onClose}><div style={CARD} onClick={(e) => e.stopPropagation()}>
      <div style={{ fontWeight: 800, fontSize: 18, color: "#0F274A" }}>Acknowledge</div>
      <div style={{ color: "#64748B", marginTop: 8 }}>Your role can’t acknowledge alarms.</div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}><button style={btn("#fff", "#334155")} onClick={onClose}>Close</button></div>
    </div></div>
  );

  const sideLabel = side === "security" ? "SECURITY COMPANY" : "MONITORING COMPANY";
  const otherName = side === "security" ? "Monitoring company" : "Security company";
  const otherAcked = side === "security" ? alarm.ack_monitoring_at : alarm.ack_security_at;

  async function submit() {
    if (!finding && !note.trim()) { setErr("Record what you found."); return; }
    setBusy(true); setErr("");
    try {
      const r = await fetch(`/api/mainapp/alarms/${encodeURIComponent(alarmId)}/ack`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finding, note, side }),
      });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Could not acknowledge"); return; }
      // Security side: guide them on who to dispatch (region/manager/cluster/teams).
      if ((d.side || side) === "security") {
        try {
          const dr = await fetch(`/api/mainapp/alarms/${encodeURIComponent(alarmId)}/dispatch`, { cache: "no-store" });
          if (dr.ok) { setDispatch(await dr.json()); setStep("dispatch"); return; }
        } catch {}
      }
      onDone && onDone();
    } catch { setErr("Network error"); } finally { setBusy(false); }
  }

  // ---- step 2: dispatch guidance (security acknowledgers) — reuse the shared modal
  if (step === "dispatch" && dispatch) {
    return <DispatchModal dispatch={dispatch} onClose={() => onDone && onDone()} />;
  }

  return (
    <div style={OV} onClick={onClose}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#FEF3C7", color: "#D97706", display: "grid", placeItems: "center", fontSize: 20, flex: "none" }}><i className="ti ti-eye-check" /></div>
          <div><div style={{ fontSize: 20, fontWeight: 800, color: "#0F274A" }}>Acknowledge this alarm</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{alarm.name}{alarm.site ? ` · ${alarm.site}` : ""}</div></div>
          <button style={{ marginLeft: "auto", background: "none", border: "none", color: "#94A3B8", fontSize: 20, cursor: "pointer" }} onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        {me.canChooseSide && critical && (
          <>
            <div style={LAB}>Acknowledge on behalf of</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <button style={{ ...btn(side === "monitoring" ? "#ECFDF5" : "#fff", side === "monitoring" ? "#047857" : "#334155"), border: `1px solid ${side === "monitoring" ? "#34D399" : "#E2E8F0"}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setSide("monitoring")}><i className="ti ti-headphones" />Monitoring{alarm.ack_monitoring_at ? " ✓" : ""}</button>
              <button style={{ ...btn(side === "security" ? "#ECFDF5" : "#fff", side === "security" ? "#047857" : "#334155"), border: `1px solid ${side === "security" ? "#34D399" : "#E2E8F0"}`, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }} onClick={() => setSide("security")}><i className="ti ti-shield" />Security{alarm.ack_security_at ? " ✓" : ""}</button>
            </div>
          </>
        )}

        <div style={{ display: "inline-block", background: "#EFF4FF", color: "#2E6CF5", fontWeight: 800, fontSize: 12, borderRadius: 8, padding: "6px 12px", marginTop: 12 }}>YOU ARE ACKNOWLEDGING FOR {sideLabel}</div>
        <div style={{ color: "#94A3B8", fontSize: 12.5, margin: "8px 0 4px" }}>{otherName}: {otherAcked ? "acknowledged" : "not yet"}</div>

        <div style={LAB}>What did you find?</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {(me.findings || []).map((f) => (
            <button key={f} onClick={() => setFinding(finding === f ? "" : f)}
              style={{ border: `1px solid ${finding === f ? "#14315D" : "#E2E8F0"}`, background: finding === f ? "#14315D" : "#fff", color: finding === f ? "#fff" : "#334155", borderRadius: 999, padding: "8px 14px", fontSize: 13, cursor: "pointer", fontFamily: "inherit" }}>{f}</button>
          ))}
        </div>
        <textarea style={{ ...TA, marginTop: 10 }} placeholder="Add anything else the next person should know…" value={note} onChange={(e) => setNote(e.target.value)} />
        {err && <div style={{ color: "#B91C1C", fontSize: 13, marginTop: 8 }}>{err}</div>}
        <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
          <button style={btn("#fff", "#334155", 1)} onClick={onClose} disabled={busy}>Cancel</button>
          <button style={btn("#F59E0B", "#fff", 2)} onClick={submit} disabled={busy}>{busy ? "…" : "Acknowledge"}</button>
        </div>
      </div>
    </div>
  );
}
