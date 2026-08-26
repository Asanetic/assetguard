// app/mainapp/admin/firmware/components/FirmwareControl.jsx
// Set the latest available firmware version. Firmware is hosted on the OEM servers
// for now, so an admin records the current version here; a device is labelled to this
// version once it CONFIRMS an OTA update. Later, firmware will live on our servers.
"use client";

import { useEffect, useState } from "react";

const S = {
  page: { padding: "22px 28px", maxWidth: 720 },
  title: { fontSize: 22, fontWeight: 800, color: "#0f274a" },
  sub: { color: "#64748b", fontSize: 13.5, margin: "4px 0 18px", lineHeight: 1.5 },
  card: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14, padding: 20, boxShadow: "0 2px 10px rgba(15,39,74,.05)" },
  lab: { fontSize: 11, fontWeight: 800, color: "#94a3b8", textTransform: "uppercase", letterSpacing: ".05em", display: "block", margin: "0 0 6px" },
  in: { width: "100%", height: 42, padding: "0 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 15, color: "#0f274a", fontFamily: "inherit", boxSizing: "border-box" },
  ta: { width: "100%", minHeight: 64, padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: 10, fontSize: 13.5, color: "#0f274a", fontFamily: "inherit", boxSizing: "border-box", resize: "vertical" },
  row: { display: "flex", gap: 12, alignItems: "flex-end", marginTop: 4 },
  save: { background: "#2e6cf5", color: "#fff", border: 0, borderRadius: 10, padding: "0 20px", height: 42, fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  cur: { display: "inline-flex", alignItems: "center", gap: 8, background: "#eaf1ff", color: "#2e6cf5", borderRadius: 999, padding: "6px 14px", fontSize: 15, fontWeight: 800 },
  note: { color: "#64748b", fontSize: 12.5, marginTop: 12, lineHeight: 1.5 },
  toast: { position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", background: "#0f274a", color: "#fff", borderRadius: 10, padding: "9px 16px", fontSize: 13, fontWeight: 700 },
  err: { color: "#b91c1c", fontSize: 12.5, marginTop: 8 },
};

export default function FirmwareControl() {
  const [latest, setLatest] = useState("");
  const [notes, setNotes] = useState("");
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/mainapp/firmware-config", { cache: "no-store" });
      const d = await r.json();
      if (r.ok && d.firmware) { setCurrent(d.firmware); setLatest(d.firmware.latest || ""); setNotes(d.firmware.notes || ""); }
    } catch {}
  }
  useEffect(() => { load(); }, []);
  function flash(m) { setToast(m); setTimeout(() => setToast(""), 2400); }

  async function save() {
    setMsg("");
    if (!latest.trim()) { setMsg("Enter the firmware version"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/mainapp/firmware-config", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ latest: latest.trim(), notes: notes.trim() }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || "Could not save"); return; }
      setCurrent(d.firmware);
      flash(`Latest firmware set to ${d.firmware.latest}`);
    } catch { setMsg("Network error"); } finally { setBusy(false); }
  }

  return (
    <div style={S.page}>
      <div style={S.title}>Firmware</div>
      <div style={S.sub}>
        Record the latest firmware version that's available. Firmware is hosted on the OEM servers for now,
        so this is typed manually. When a device completes an OTA update and starts reporting again, it is
        automatically labelled to this version. (Later, firmware will be hosted on our own servers.)
      </div>

      <div style={S.card}>
        {current ? (
          <div style={{ marginBottom: 16 }}>
            <span style={S.lab}>Current latest</span>
            <span style={S.cur}><i className="ti ti-cpu" style={{ fontSize: 16 }} />{current.latest}</span>
            {current.updated_at ? <span style={{ color: "#94a3b8", fontSize: 12, marginLeft: 10 }}>updated {new Date(current.updated_at).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })} EAT</span> : null}
          </div>
        ) : null}

        <label style={S.lab}>Latest firmware version</label>
        <div style={S.row}>
          <input style={S.in} value={latest} onChange={(e) => setLatest(e.target.value)} placeholder="e.g. v2.4.1" />
          <button style={S.save} onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>

        <label style={{ ...S.lab, marginTop: 16 }}>Release notes (optional)</label>
        <textarea style={S.ta} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What changed in this version…" />

        {msg && <div style={S.err}>{msg}</div>}
        <div style={S.note}>
          Devices whose firmware differs from this show “Update available” on their page and in Group devices.
          Pushing the update queues the OTA command; the device is marked to this version only after it confirms.
        </div>
      </div>

      {toast ? <div style={S.toast}>{toast}</div> : null}
    </div>
  );
}
