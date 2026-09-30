// app/mainapp/lib/TechActivity.jsx
// Technician activity log — one row per install/maintenance job, expandable to the
// full record. Reads:
//   GET /api/mainapp/technician/worklog?site_id=<id> | ?device_id=<human id>  -> { entries }
//   GET /api/mainapp/media/<id>   (job photos, by id)
// Self-contained (inline styles). Pass exactly one of siteId or deviceId.
"use client";
import { useEffect, useState } from "react";

const TZ = "Africa/Nairobi";
const mediaUrl = (id) => `/api/mainapp/media/${encodeURIComponent(id)}`;
function fmtWhen(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("en-GB", {
      timeZone: TZ, day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }) + " EAT";
  } catch { return "—"; }
}
const CHECKLIST_FLOW = ["Opened", "PoweredOn", "SimAndBattery", "LedsOn", "LidClosed"];
const chLabel = { Opened: "Opened", PoweredOn: "Powered on", SimAndBattery: "SIM & battery", LedsOn: "LEDs on", LidClosed: "Lid closed" };

function TestRow({ t }) {
  const pass = String(t.result || "").toLowerCase() === "pass";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0" }}>
      <span style={{ width: 22, color: "#94a3b8" }}>#{t.attempt}</span>
      <span style={{ fontWeight: 700, color: pass ? "#047857" : "#B91C1C" }}>{pass ? "pass" : (t.result || "fail")}</span>
      <span style={{ color: "#94a3b8" }}>{fmtWhen(t.started_at)}</span>
      {t.alarm_id ? <a href={`/mainapp/alarms/${encodeURIComponent(t.alarm_id)}`} style={{ marginLeft: "auto", color: "#2E6CF5", fontWeight: 600 }}>{t.alarm_name || t.alarm_id}</a> : null}
    </div>
  );
}

function Entry({ e }) {
  const [open, setOpen] = useState(false);
  const abandoned = String(e.outcome || "").toLowerCase() === "abandoned";
  const tests = Array.isArray(e.tests) ? e.tests : [];
  const lastTest = tests[tests.length - 1];
  const job = e.job_type === "maintain" ? `Maintenance${e.maintenance_type ? ` · ${e.maintenance_type}` : ""}` : "Install";
  const photoIds = e.photos && typeof e.photos === "object"
    ? [...(e.photos.before || []), ...(e.photos.confirmation || []), ...(e.photos.after || [])] : [];
  return (
    <div style={{ borderBottom: "1px solid #f1f5f9" }}>
      <button onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "10px 2px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
        <i className="ti ti-chevron-right" style={{ fontSize: 15, color: "#94a3b8", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f274a", minWidth: 120 }}>{job}</span>
        <span style={{ fontSize: 12.5, color: "#475569" }}>{e.device_id || "—"}</span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{e.technician_name || "—"}</span>
        <span style={{ fontSize: 12, color: "#94a3b8" }}>{fmtWhen(e.started_at || e.created_at)}</span>
        <span style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 8 }}>
          {lastTest ? <span style={{ fontSize: 11.5, fontWeight: 700, color: String(lastTest.result).toLowerCase() === "pass" ? "#047857" : "#B91C1C" }}>
            test {String(lastTest.result).toLowerCase() === "pass" ? `pass${tests.length > 1 ? ` (#${lastTest.attempt})` : ""}` : "fail"}</span> : null}
          <span style={{ fontSize: 11.5, fontWeight: 800, borderRadius: 999, padding: "2px 10px",
                        background: abandoned ? "#FEF2F2" : "#ECFDF5", color: abandoned ? "#B91C1C" : "#047857", border: `1px solid ${abandoned ? "#FECACA" : "#A7F3D0"}` }}>
            {abandoned ? "abandoned" : (e.outcome || "passed")}
          </span>
        </span>
      </button>
      {open && (
        <div style={{ padding: "4px 2px 14px 27px", fontSize: 12.5, color: "#334155", display: "grid", gap: 12 }}>
          <div>
            <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 5 }}>Checklist</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {CHECKLIST_FLOW.map((k) => {
                const has = e.checklist && Object.prototype.hasOwnProperty.call(e.checklist, k);
                const val = has ? !!e.checklist[k] : null; // missing key = not recorded (NOT false)
                const bg = val === null ? "#f1f5f9" : val ? "#ECFDF5" : "#FEF2F2";
                const fg = val === null ? "#94a3b8" : val ? "#047857" : "#B91C1C";
                return <span key={k} style={{ fontSize: 11.5, borderRadius: 999, padding: "3px 10px", background: bg, color: fg }}>
                  {chLabel[k] || k}{val === null ? " — n/r" : val ? " ✓" : " ✕"}</span>;
              })}
            </div>
          </div>
          {tests.length ? (
            <div>
              <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 3 }}>Tests ({tests.length})</div>
              {tests.map((t, i) => <TestRow key={i} t={t} />)}
            </div>
          ) : null}
          {photoIds.length ? (
            <div>
              <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 5 }}>Photos</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {photoIds.map((id) => (
                  <a key={id} href={mediaUrl(id)} target="_blank" rel="noreferrer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={mediaUrl(id)} alt="job" loading="lazy" style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          <div style={{ color: "#94a3b8", fontSize: 12 }}>
            {(e.lat != null && e.lng != null) ? `${Number(e.lat).toFixed(5)}, ${Number(e.lng).toFixed(5)} · ${e.accuracy_m == null ? "from site record" : `±${Math.round(Number(e.accuracy_m))} m`}` : "no location"}
            {e.finished_at ? ` · finished ${fmtWhen(e.finished_at)}` : ""}
          </div>
          {e.notes ? <div style={{ background: "#f8fafc", border: "1px solid #eef2f7", borderRadius: 8, padding: "8px 10px" }}>{e.notes}</div> : null}
        </div>
      )}
    </div>
  );
}

export default function TechActivity({ siteId, deviceId }) {
  const [entries, setEntries] = useState(null);
  useEffect(() => {
    const qs = deviceId != null ? `device_id=${encodeURIComponent(deviceId)}`
             : siteId != null ? `site_id=${encodeURIComponent(siteId)}` : null;
    if (!qs) { setEntries([]); return; }
    let alive = true;
    fetch(`/api/mainapp/technician/worklog?${qs}&limit=50`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => { if (alive) setEntries(Array.isArray(d.entries) ? d.entries : []); })
      .catch(() => { if (alive) setEntries([]); });
    return () => { alive = false; };
  }, [siteId, deviceId]);

  const sorted = (entries || []).slice().sort((a, b) => new Date(b.started_at || b.created_at || 0) - new Date(a.started_at || a.created_at || 0));
  if (entries === null) return <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading activity…</div>;
  if (!sorted.length) return <div style={{ padding: 18, textAlign: "center", color: "#94a3b8", fontSize: 12.5, border: "1px dashed #e2e8f0", borderRadius: 10 }}>No technician jobs recorded yet.</div>;
  return <div>{sorted.map((e) => <Entry key={e.id} e={e} />)}</div>;
}
