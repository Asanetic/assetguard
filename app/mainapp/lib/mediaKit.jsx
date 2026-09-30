// app/mainapp/lib/mediaKit.jsx
// Shared, self-contained technician-data UI: photo galleries grouped by stage and
// the technician activity (worklog) log. Reads the existing APIs:
//   GET /api/mainapp/media?site_id=<numeric> | ?device_id=<human id>  -> { photos }
//   GET /api/mainapp/media/<id>            -> the image bytes
//   GET /api/mainapp/technician/worklog?site_id= | ?device_id=        -> { entries }
//   GET /api/mainapp/technician/worklog/<id>                          -> { entry }
// No CSS-module dependency (inline styles) so it drops into any page.
"use client";
import { useEffect, useState } from "react";

const TZ = "Africa/Nairobi";
export const mediaUrl = (id) => `/api/mainapp/media/${encodeURIComponent(id)}`;

function fmtWhen(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("en-GB", {
      timeZone: TZ, day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }) + " EAT";
  } catch { return "—"; }
}
// accuracy_m null ⇒ position came from the SITE record, not a live GPS fix.
function locLabel(p) {
  const hasCoord = p.lat != null && p.lng != null;
  if (p.accuracy_m == null) return hasCoord ? "from site record" : "no location";
  return `±${Math.round(Number(p.accuracy_m))} m`;
}

// ---------- one photo tile ----------
function PhotoTile({ p }) {
  return (
    <a href={mediaUrl(p.id)} target="_blank" rel="noreferrer"
       style={{ display: "block", position: "relative", borderRadius: 10, overflow: "hidden", border: "1px solid #e2e8f0", background: "#f1f5f9" }}
       title={`${p.device_id || p.site_name || "photo"} · ${fmtWhen(p.taken_at)}`}>
      <img src={mediaUrl(p.id)} alt={p.photo_type || "photo"} loading="lazy"
           style={{ width: "100%", height: 130, objectFit: "cover", display: "block" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, padding: "6px 8px",
                    background: "linear-gradient(transparent,rgba(0,0,0,.72))", color: "#fff", fontSize: 11, lineHeight: 1.35 }}>
        {p.device_id ? <div style={{ fontWeight: 700 }}>{p.device_id}</div> : null}
        <div>{fmtWhen(p.taken_at)}</div>
        <div style={{ opacity: .85 }}>
          {(p.captured_by || p.technician || "—")} · {locLabel(p)}
          {p.status ? ` · ${p.status}` : ""}{p.imprinted ? " · stamped" : ""}
        </div>
      </div>
    </a>
  );
}

function Group({ title, tint, photos }) {
  if (!photos.length) return null;
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <span style={{ width: 8, height: 8, borderRadius: 2, background: tint }} />
        <span style={{ fontSize: 12, fontWeight: 800, letterSpacing: .3, color: "#334155" }}>{title.toUpperCase()}</span>
        <span style={{ fontSize: 11, color: "#94a3b8" }}>{photos.length}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
        {photos.map((p) => <PhotoTile key={p.id} p={p} />)}
      </div>
    </div>
  );
}

// Photo galleries, grouped by stage. Pass exactly one of siteId (numeric) or
// deviceId (human device_id). deviceId leads with "Device installation".
export function PhotoGallery({ siteId, deviceId, title = "Photos" }) {
  const [photos, setPhotos] = useState(null); // null = loading
  useEffect(() => {
    const qs = deviceId != null ? `device_id=${encodeURIComponent(deviceId)}`
             : siteId != null ? `site_id=${encodeURIComponent(siteId)}` : null;
    if (!qs) { setPhotos([]); return; }
    let alive = true;
    fetch(`/api/mainapp/media?${qs}&limit=60`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((d) => { if (alive) setPhotos(Array.isArray(d.photos) ? d.photos : []); })
      .catch(() => { if (alive) setPhotos([]); });
    return () => { alive = false; };
  }, [siteId, deviceId]);

  const byType = (t) => (photos || []).filter((p) => String(p.photo_type || "") === t)
    .sort((a, b) => new Date(b.taken_at || 0) - new Date(a.taken_at || 0)); // taken_at, NOT created_at
  const known = new Set(["Before works", "Device installation", "After works"]);
  const other = (photos || []).filter((p) => !known.has(String(p.photo_type || "")))
    .sort((a, b) => new Date(b.taken_at || 0) - new Date(a.taken_at || 0));

  // Device page leads with installation; site page reads before → installation → after.
  const order = deviceId != null
    ? [["Device installation", "#7C3AED"], ["Before works", "#0EA5E9"], ["After works", "#059669"]]
    : [["Before works", "#0EA5E9"], ["Device installation", "#7C3AED"], ["After works", "#059669"]];

  const total = (photos || []).length;
  return (
    <div style={{ border: "1px solid #eef2f7", borderRadius: 12, padding: 16, background: "#fff", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <span style={{ display: "inline-flex", width: 27, height: 27, borderRadius: 8, background: "#EDE9FE", color: "#7C3AED", alignItems: "center", justifyContent: "center" }}><i className="ti ti-camera" /></span>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: "#0f274a" }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", background: "#f1f5f9", borderRadius: 999, padding: "2px 9px" }}>{total}</span>
      </div>
      {photos === null ? <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading photos…</div>
        : total === 0 ? <div style={{ padding: 18, textAlign: "center", color: "#94a3b8", fontSize: 12.5, border: "1px dashed #e2e8f0", borderRadius: 10 }}>No photos yet.</div>
        : (
          <>
            {order.map(([t, tint]) => <Group key={t} title={t} tint={tint} photos={byType(t)} />)}
            <Group title="Other" tint="#94a3b8" photos={other} />
          </>
        )}
    </div>
  );
}

// ---------- technician activity (worklog) ----------
const CHECKLIST_FLOW = ["Opened", "PoweredOn", "SimAndBattery", "LedsOn", "LidClosed"];
const chLabel = { Opened: "Opened", PoweredOn: "Powered on", SimAndBattery: "SIM & battery", LedsOn: "LEDs on", LidClosed: "Lid closed" };

function TestRow({ t }) {
  const pass = String(t.result || "").toLowerCase() === "pass";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, padding: "3px 0" }}>
      <span style={{ width: 20, color: "#94a3b8" }}>#{t.attempt}</span>
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
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "10px 2px", background: "transparent", border: 0, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
        <i className={`ti ti-chevron-right`} style={{ fontSize: 15, color: "#94a3b8", transform: open ? "rotate(90deg)" : "none", transition: "transform .15s" }} />
        <span style={{ fontSize: 13, fontWeight: 700, color: "#0f274a", minWidth: 130 }}>{job}</span>
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
          {/* checklist */}
          <div>
            <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 5 }}>Checklist</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {CHECKLIST_FLOW.map((k) => {
                const has = e.checklist && Object.prototype.hasOwnProperty.call(e.checklist, k);
                const val = has ? !!e.checklist[k] : null; // missing = not recorded
                const bg = val === null ? "#f1f5f9" : val ? "#ECFDF5" : "#FEF2F2";
                const fg = val === null ? "#94a3b8" : val ? "#047857" : "#B91C1C";
                return <span key={k} style={{ fontSize: 11.5, borderRadius: 999, padding: "3px 10px", background: bg, color: fg }}>
                  {chLabel[k] || k}{val === null ? " — n/r" : val ? " ✓" : " ✕"}</span>;
              })}
            </div>
          </div>
          {/* tests — full array */}
          {tests.length ? (
            <div>
              <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 3 }}>Tests ({tests.length})</div>
              {tests.map((t, i) => <TestRow key={i} t={t} />)}
            </div>
          ) : null}
          {/* photos */}
          {photoIds.length ? (
            <div>
              <div style={{ fontWeight: 700, color: "#64748b", marginBottom: 5 }}>Photos</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {photoIds.map((id) => (
                  <a key={id} href={mediaUrl(id)} target="_blank" rel="noreferrer">
                    <img src={mediaUrl(id)} alt="job" loading="lazy" style={{ width: 76, height: 76, objectFit: "cover", borderRadius: 8, border: "1px solid #e2e8f0" }} />
                  </a>
                ))}
              </div>
            </div>
          ) : null}
          {/* meta */}
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

// Technician activity log. Pass siteId (numeric) or deviceId (human id).
export function TechActivity({ siteId, deviceId, title = "Technician activity" }) {
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
  return (
    <div style={{ border: "1px solid #eef2f7", borderRadius: 12, padding: 16, background: "#fff", marginBottom: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
        <span style={{ display: "inline-flex", width: 27, height: 27, borderRadius: 8, background: "#DBE7FE", color: "#2E6CF5", alignItems: "center", justifyContent: "center" }}><i className="ti ti-clipboard-check" /></span>
        <span style={{ fontSize: 14.5, fontWeight: 700, color: "#0f274a" }}>{title}</span>
        <span style={{ fontSize: 11, fontWeight: 800, color: "#64748b", background: "#f1f5f9", borderRadius: 999, padding: "2px 9px" }}>{(entries || []).length}</span>
      </div>
      {entries === null ? <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading activity…</div>
        : sorted.length === 0 ? <div style={{ padding: 18, textAlign: "center", color: "#94a3b8", fontSize: 12.5, border: "1px dashed #e2e8f0", borderRadius: 10 }}>No technician jobs recorded yet.</div>
        : sorted.map((e) => <Entry key={e.id} e={e} />)}
    </div>
  );
}
