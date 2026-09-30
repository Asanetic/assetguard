// app/mainapp/lib/PhotoGallery.jsx
// Lightweight, self-contained photo gallery (inline styles) grouped by stage.
// Used where there's no co-located CSS module (e.g. the device page). Reads:
//   GET /api/mainapp/media?site_id=<numeric> | ?device_id=<human id>  -> { photos }
//   GET /api/mainapp/media/<id>            -> the image bytes
// Pass exactly one of siteId or deviceId. deviceId leads with "Device installation".
"use client";
import { useEffect, useState } from "react";

const TZ = "Africa/Nairobi";
const mediaUrl = (id) => `/api/mainapp/media/${encodeURIComponent(id)}`;
const TYPE_TINT = {
  "before works": ["#fef3c7", "#92400e"],
  "after works": ["#d1fae5", "#065f46"],
  "device installation": ["#dbeafe", "#1e40af"],
};
const tint = (t) => TYPE_TINT[String(t || "").toLowerCase()] || ["#f1f5f9", "#475569"];
function fmtWhen(v) {
  if (!v) return "—";
  try {
    return new Date(v).toLocaleString("en-GB", {
      timeZone: TZ, day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }) + " EAT";
  } catch { return "—"; }
}
const byTakenDesc = (a, b) => new Date(b.taken_at || 0) - new Date(a.taken_at || 0);
// SITE = before/after works only; DEVICE = installation only.
const STAGE_SITE = ["Before works", "After works"];
const STAGE_DEVICE = ["Device installation"];

function Tile({ p }) {
  const [bg, fg] = tint(p.photo_type);
  const gps = p.lat != null && p.lng != null ? `${Number(p.lat).toFixed(4)}, ${Number(p.lng).toFixed(4)}` : null;
  const loc = gps ? (p.accuracy_m == null ? "from site record" : `±${Math.round(Number(p.accuracy_m))} m`) : null;
  return (
    <a href={mediaUrl(p.id)} target="_blank" rel="noreferrer"
       style={{ display: "block", border: "1px solid #eef2f7", borderRadius: 12, overflow: "hidden", background: "#fff", textDecoration: "none" }}>
      <div style={{ position: "relative", aspectRatio: "4/3", background: "#f1f5f9", overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mediaUrl(p.id)} alt={p.photo_type || "photo"} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <span style={{ position: "absolute", top: 8, left: 8, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 8px", background: bg, color: fg }}>{p.photo_type || "Photo"}</span>
        {p.imprinted ? <span style={{ position: "absolute", top: 8, right: 8, color: "#fff", background: "rgba(15,39,74,.65)", borderRadius: 6, padding: "2px 5px", fontSize: 11 }} title="Provenance burned into the image"><i className="ti ti-shield-check" /></span> : null}
      </div>
      <div style={{ padding: "8px 10px", fontSize: 12, color: "#334155" }}>
        {p.device_id ? <div style={{ fontWeight: 700, color: "#0f274a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.device_id}</div> : null}
        <div style={{ color: "#64748b" }}>{fmtWhen(p.taken_at)}</div>
        <div style={{ color: "#94a3b8", fontSize: 11 }}>
          {(p.captured_by || p.technician || "—")}{p.status ? ` · ${p.status}` : ""}{loc ? ` · ${loc}` : ""}
        </div>
      </div>
    </a>
  );
}

export default function PhotoGallery({ siteId, deviceId }) {
  const [photos, setPhotos] = useState(null);
  const [err, setErr] = useState("");
  useEffect(() => {
    const qs = deviceId != null ? `device_id=${encodeURIComponent(deviceId)}`
             : siteId != null ? `site_id=${encodeURIComponent(siteId)}` : null;
    if (!qs) { setPhotos([]); return; }
    let alive = true;
    fetch(`/api/mainapp/media?${qs}&limit=60`, { cache: "no-store" })
      .then(async (r) => { const d = await r.json().catch(() => ({})); if (!r.ok) throw new Error(d.error || "load"); return d; })
      .then((d) => { if (alive) setPhotos(Array.isArray(d.photos) ? d.photos : []); })
      .catch(() => { if (alive) { setPhotos([]); setErr("Couldn’t load photos."); } });
    return () => { alive = false; };
  }, [siteId, deviceId]);

  const order = deviceId != null ? STAGE_DEVICE : STAGE_SITE;
  const allowed = new Set(order);
  const visible = (photos || []).filter((p) => allowed.has(String(p.photo_type || "")));

  if (photos === null) return <div style={{ color: "#94a3b8", fontSize: 13 }}>Loading photos…</div>;
  if (err) return <div style={{ padding: 18, textAlign: "center", color: "#94a3b8", fontSize: 12.5, border: "1px dashed #e2e8f0", borderRadius: 10 }}>{err}</div>;
  if (!visible.length) return <div style={{ padding: 18, textAlign: "center", color: "#94a3b8", fontSize: 12.5, border: "1px dashed #e2e8f0", borderRadius: 10 }}>No photos yet.</div>;

  const groups = [];
  for (const st of order) { const g = visible.filter((p) => String(p.photo_type || "") === st).sort(byTakenDesc); if (g.length) groups.push([st, g]); }

  return (
    <div>
      {groups.map(([label, g]) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "2px 0 10px" }}>
            <span style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: ".4px", color: "#334155" }}>{label.toUpperCase()}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8" }}>{g.length}</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 12 }}>
            {g.map((p) => <Tile key={p.id} p={p} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
