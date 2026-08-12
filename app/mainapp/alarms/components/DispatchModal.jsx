// app/mainapp/alarms/components/DispatchModal.jsx
// Standalone "Who to dispatch" panel — region, regional manager, response cluster,
// the team(s) for that cluster and alternatives, with ALL contacts (phones +
// emails). Reused by the alarm detail page (a button) and the AckModal (the step
// shown after a security acknowledge). Pass `dispatch` to render provided data, or
// `alarmId` to have it fetch /api/mainapp/alarms/:id/dispatch itself.
"use client";

import { useEffect, useState } from "react";

const OV = { position: "fixed", inset: 0, background: "rgba(15,23,42,.45)", display: "grid", placeItems: "center", zIndex: 60, padding: 20 };
const CARD = { background: "#fff", borderRadius: 16, padding: 22, width: "100%", maxWidth: 560, boxShadow: "0 24px 60px rgba(15,23,42,.28)", maxHeight: "90vh", overflow: "auto" };
const LAB = { fontSize: 12, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: ".04em", margin: "16px 0 8px" };

function Contact({ icon, value, href }) {
  if (!value) return null;
  return (
    <a href={href} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "#2E6CF5", textDecoration: "none", fontSize: 12.5, marginRight: 12 }}>
      <i className={`ti ${icon}`} /> {value}
    </a>
  );
}

function TeamCard({ t, primary }) {
  return (
    <div style={{ border: `1px solid ${primary ? "#34D399" : "#E2E8F0"}`, background: primary ? "#F0FDF4" : "#fff", borderRadius: 12, padding: "12px 14px", marginBottom: 10 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <span style={{ fontWeight: 800, color: "#0F274A", display: "inline-flex", alignItems: "center", gap: 6 }}>
          <i className="ti ti-shield-check" style={{ color: primary ? "#059669" : "#94A3B8" }} /> {t.code}
        </span>
        {primary ? <span style={{ fontSize: 10.5, fontWeight: 800, color: "#047857", background: "#DCFCE7", borderRadius: 999, padding: "2px 9px", letterSpacing: ".03em" }}>ASSIGNED</span>
                 : <span style={{ fontSize: 11.5, color: "#94A3B8" }}>{t.company || ""}</span>}
      </div>
      {(t.vehicle || t.company) && <div style={{ fontSize: 12.5, color: "#64748B", marginTop: 3 }}>{[t.company, t.vehicle && `Vehicle ${t.vehicle}`].filter(Boolean).join(" · ")}</div>}
      <div style={{ marginTop: 6 }}>
        {(t.phones || []).map((ph, i) => <Contact key={`p${i}`} icon="ti-phone" value={ph} href={`tel:${String(ph).replace(/\s/g, "")}`} />)}
        {(t.emails || []).map((em, i) => <Contact key={`e${i}`} icon="ti-mail" value={em} href={`mailto:${em}`} />)}
      </div>
      {(t.members || []).length > 0 && (
        <div style={{ marginTop: 8, borderTop: "1px dashed #E2E8F0", paddingTop: 8 }}>
          <div style={{ fontSize: 11, color: "#94A3B8", fontWeight: 700, marginBottom: 4 }}>RESPONDERS</div>
          {t.members.map((m, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12.5, padding: "3px 0" }}>
              <span style={{ color: "#0F274A", fontWeight: 600 }}>{m.name}</span>
              {m.phone ? <a href={`tel:${String(m.phone).replace(/\s/g, "")}`} style={{ color: "#2E6CF5", textDecoration: "none" }}><i className="ti ti-phone" /> {m.phone}</a> : <span style={{ color: "#CBD5E1" }}>no number</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DispatchModal({ alarmId, dispatch: provided, onClose }) {
  const [dispatch, setDispatch] = useState(provided || null);
  const [err, setErr] = useState("");
  useEffect(() => {
    if (provided || !alarmId) return;
    fetch(`/api/mainapp/alarms/${encodeURIComponent(alarmId)}/dispatch`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((d) => setDispatch(d))
      .catch(() => setErr("Could not load dispatch info"));
  }, [alarmId, provided]);

  const d = dispatch;
  return (
    <div style={OV} onClick={onClose}>
      <div style={CARD} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: "#DBEAFE", color: "#1D4ED8", display: "grid", placeItems: "center", fontSize: 20, flex: "none" }}><i className="ti ti-send" /></div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#0F274A" }}>Who to dispatch</div>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{d?.site?.name || "—"}{d?.region ? ` · ${d.region}` : ""}</div>
          </div>
          <button style={{ marginLeft: "auto", background: "none", border: "none", color: "#94A3B8", fontSize: 20, cursor: "pointer" }} onClick={onClose}><i className="ti ti-x" /></button>
        </div>

        {!d ? <div style={{ padding: "24px 0", color: err ? "#B91C1C" : "#94A3B8" }}>{err || "Loading…"}</div> : (<>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, margin: "12px 0" }}>
            <div style={{ background: "#F8FAFC", border: "1px solid #EEF2F7", borderRadius: 10, padding: "10px 12px" }}><div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".04em" }}>Region</div><div style={{ fontWeight: 700, color: "#0F274A", marginTop: 2 }}>{d.region || "—"}</div></div>
            <div style={{ background: "#F8FAFC", border: "1px solid #EEF2F7", borderRadius: 10, padding: "10px 12px" }}><div style={{ fontSize: 11, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".04em" }}>Response cluster</div><div style={{ fontWeight: 700, color: "#0F274A", marginTop: 2 }}>{d.cluster || "—"}</div></div>
          </div>

          <div style={LAB}>Regional manager</div>
          {d.manager ? (
            <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ fontWeight: 700, color: "#0F274A" }}>{d.manager.name}</div>
              <div style={{ marginTop: 4 }}>
                <Contact icon="ti-phone" value={d.manager.phone} href={`tel:${String(d.manager.phone || "").replace(/\s/g, "")}`} />
                <Contact icon="ti-mail" value={d.manager.email} href={`mailto:${d.manager.email}`} />
              </div>
            </div>
          ) : <div style={{ color: "#94A3B8", fontSize: 13 }}>No regional manager on record for this region.</div>}

          <div style={LAB}>Response team{(d.primary || []).length > 1 ? "s" : ""} for this cluster</div>
          {(d.primary || []).length ? d.primary.map((t) => <TeamCard key={t.code} t={t} primary />) : <div style={{ color: "#94A3B8", fontSize: 13 }}>No team assigned to this cluster.</div>}

          {(d.alternatives || []).length > 0 && (<>
            <div style={LAB}>Alternative teams</div>
            {d.alternatives.map((t) => <TeamCard key={t.code} t={t} />)}
          </>)}
        </>)}

        <div style={{ display: "flex", marginTop: 16 }}>
          <button style={{ flex: 1, background: "#2E6CF5", color: "#fff", border: "none", borderRadius: 10, padding: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
