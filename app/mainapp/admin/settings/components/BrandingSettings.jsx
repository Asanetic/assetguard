// app/mainapp/admin/settings/components/BrandingSettings.jsx
// Company branding — upload a logo that becomes the watermark on every generated
// document (reports PDF/DOCX). Persists to app_config('branding') via the API.
"use client";

import { useEffect, useRef, useState } from "react";

export default function BrandingSettings() {
  const [companyName, setCompanyName] = useState("");
  const [logoDataUrl, setLogoDataUrl] = useState("");
  const [watermark, setWatermark] = useState(true);
  const [msg, setMsg] = useState(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    fetch("/api/mainapp/admin/branding", { cache: "no-store" })
      .then((r) => r.json()).then((j) => {
        const b = j.branding || {};
        setCompanyName(b.companyName || ""); setLogoDataUrl(b.logoDataUrl || "");
        setWatermark(b.watermark !== false);
      }).catch(() => {});
  }, []);

  function pickFile(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!/^image\//.test(f.type)) { setMsg({ ok: false, t: "Please choose an image file (PNG, JPG, SVG)." }); return; }
    if (f.size > 1_000_000) { setMsg({ ok: false, t: "Image is over 1 MB — please use a smaller logo." }); return; }
    const reader = new FileReader();
    reader.onload = () => { setLogoDataUrl(String(reader.result || "")); setMsg(null); };
    reader.readAsDataURL(f);
  }

  async function save() {
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/mainapp/admin/branding", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName, logoDataUrl, watermark }),
      });
      const j = await r.json();
      if (r.ok && j.ok) setMsg({ ok: true, t: "Branding saved — it will watermark new documents." });
      else setMsg({ ok: false, t: j.error || "Save failed" });
    } catch { setMsg({ ok: false, t: "Network error" }); }
    finally { setSaving(false); }
  }

  return (
    <div style={S.card}>
      <div style={S.head}>
        <div>
          <div style={S.title}>Branding &amp; document watermark</div>
          <div style={S.sub}>The logo below is stamped as a faint watermark on every generated report (PDF &amp; Word).</div>
        </div>
      </div>

      <div style={S.row}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <label style={S.lbl}>Company name (shown on documents)</label>
          <input style={S.in} value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="e.g. Symphony Security Ltd" />

          <label style={S.lbl}>Company logo</label>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" style={S.btn} onClick={() => fileRef.current?.click()}>Choose image…</button>
            {logoDataUrl ? <button type="button" style={S.btnGhost} onClick={() => setLogoDataUrl("")}>Remove</button> : null}
            <input ref={fileRef} type="file" accept="image/*" onChange={pickFile} style={{ display: "none" }} />
          </div>
          <div style={S.hint}>PNG, JPG or SVG · under 1 MB · a transparent PNG looks best as a watermark.</div>

          <label style={{ ...S.lbl, display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
            <input type="checkbox" checked={watermark} onChange={(e) => setWatermark(e.target.checked)} />
            Use logo as a watermark on generated documents
          </label>
        </div>

        <div style={S.previewWrap}>
          <div style={S.previewLbl}>Preview</div>
          <div style={S.preview}>
            {logoDataUrl ? <img src={logoDataUrl} alt="logo" style={S.previewImg} /> : <span style={{ color: "#94A3B8", fontSize: 12 }}>No logo yet</span>}
            {logoDataUrl && watermark ? <img src={logoDataUrl} alt="" aria-hidden style={S.previewWm} /> : null}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
        <button type="button" style={{ ...S.save, opacity: saving ? 0.7 : 1 }} onClick={save} disabled={saving}>{saving ? "Saving…" : "Save branding"}</button>
        {msg ? <span style={{ fontSize: 13, color: msg.ok ? "#059669" : "#DC2626" }}>{msg.t}</span> : null}
      </div>
    </div>
  );
}

const S = {
  card: { background: "#fff", border: "1px solid #EEF2F7", borderRadius: 14, padding: "18px 20px", marginBottom: 16 },
  head: { marginBottom: 12 },
  title: { fontSize: 15, fontWeight: 800, color: "#0F274A" },
  sub: { fontSize: 12.5, color: "#64748B", marginTop: 2 },
  row: { display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start" },
  lbl: { display: "block", fontSize: 12, color: "#64748B", fontWeight: 600, margin: "12px 0 4px" },
  in: { width: "100%", padding: "9px 10px", borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 14, boxSizing: "border-box" },
  btn: { background: "#2E6CF5", color: "#fff", border: 0, borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  btnGhost: { background: "#fff", color: "#475569", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer" },
  hint: { fontSize: 11.5, color: "#94A3B8", marginTop: 6 },
  previewWrap: { width: 240 },
  previewLbl: { fontSize: 11, fontWeight: 800, color: "#94A3B8", textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 6 },
  preview: { position: "relative", height: 150, border: "1px dashed #CBD5E1", borderRadius: 10, display: "grid", placeItems: "center", overflow: "hidden", background: "#F8FAFC" },
  previewImg: { maxWidth: "80%", maxHeight: 60, objectFit: "contain", position: "relative", zIndex: 1 },
  previewWm: { position: "absolute", inset: 0, margin: "auto", width: "70%", opacity: 0.08, objectFit: "contain" },
  save: { background: "#059669", color: "#fff", border: 0, borderRadius: 999, padding: "9px 22px", fontSize: 14, fontWeight: 700, cursor: "pointer" },
};
