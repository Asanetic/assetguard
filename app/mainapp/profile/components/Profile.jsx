// app/mainapp/profile/components/Profile.jsx
// My profile — view your account (read-only) and change your password. Name, phone,
// role, email and company are managed by an administrator.
"use client";

import { useEffect, useState } from "react";
import styles from "./profile.module.css";

function initials(name) { return String(name || "").trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join(""); }
function fmtEAT(v) {
  if (!v) return "—";
  try { return new Date(v).toLocaleString("en-GB", { timeZone: "Africa/Nairobi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) + " EAT"; }
  catch { return "—"; }
}

export default function Profile() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [toast, setToast] = useState("");

  const [cur, setCur] = useState(""); const [nw, setNw] = useState(""); const [cf, setCf] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwMsg, setPwMsg] = useState("");

  async function load() {
    try {
      const r = await fetch("/api/mainapp/profile", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) { setErr(d.error || "Failed to load"); return; }
      setData(d);
    } catch { setErr("Network error"); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);
  function flash(m) { setToast(m); setTimeout(() => setToast(""), 2400); }

  async function changePassword() {
    setPwMsg("");
    if (nw !== cf) { setPwMsg("New passwords don’t match"); return; }
    if (nw.length < 8) { setPwMsg("New password must be at least 8 characters"); return; }
    setSavingPw(true);
    try {
      const r = await fetch("/api/mainapp/profile/password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ current: cur, next: nw }) });
      const d = await r.json();
      if (!r.ok) { setPwMsg(d.error || "Could not change password"); return; }
      setCur(""); setNw(""); setCf(""); flash("Password changed");
    } catch { setPwMsg("Network error"); } finally { setSavingPw(false); }
  }

  if (loading && !data) return <div className={styles.page}><div className={styles.muted}>Loading…</div></div>;
  if (err && !data) return <div className={styles.page}><div className={styles.err}>{err}</div></div>;

  const u = data?.user || {};
  const org = data?.org || null;
  const regions = Array.isArray(u.regions) ? u.regions : [];

  return (
    <div className={styles.page}>
      <div className={styles.title}>My profile</div>

      <div className={styles.hero}>
        <div className={styles.avatar}>{initials(u.name) || "AG"}</div>
        <div className={styles.heroBody}>
          <div className={styles.heroName}>{u.name || "—"}</div>
          <div className={styles.heroSub}>{u.role_name || u.role || "—"}{org?.company ? ` · ${org.company}` : ""}</div>
        </div>
        <span className={styles.statusPill} data-s={u.status}>{u.status || "—"}</span>
      </div>

      <div className={styles.cols}>
        {/* account details (read-only) */}
        <div className={styles.card}>
          <div className={styles.cardHead}>Account</div>
          <ContactRow channel="email" label="Email" value={u.email} verified={!!u.email_verified} onSaved={load} flash={flash} />
          <ContactRow channel="phone" label="Phone" value={u.phone} verified={!!u.phone_verified} onSaved={load} flash={flash} />
          <Row k="Role" v={u.role_name || u.role || "—"} />
          <Row k="Company" v={org?.company || "—"} sub={org?.type || undefined} />
          <Row k="Regions" v={regions.length ? <span className={styles.chips}>{regions.map((rg) => <span key={rg} className={styles.chip}>{rg}</span>)}</span> : "All / none"} />
          <Row k="Member since" v={fmtEAT(u.created_at)} />
          <Row k="Last seen" v={fmtEAT(u.last_seen)} last />
          <div className={styles.note}>You can change your email and phone here — each is confirmed by a one-time code. Name, role and company are managed by an administrator.</div>
        </div>

        {/* change password (the only editable thing) */}
        <div className={styles.card}>
          <div className={styles.cardHead}>Change password</div>
          <label className={styles.lab}>Current password</label>
          <input className={styles.in} type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" />
          <label className={styles.lab}>New password</label>
          <input className={styles.in} type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" />
          <label className={styles.lab}>Confirm new password</label>
          <input className={styles.in} type="password" value={cf} onChange={(e) => setCf(e.target.value)} autoComplete="new-password" />
          {pwMsg && <div className={styles.inlineErr}>{pwMsg}</div>}
          <button className={styles.save} onClick={changePassword} disabled={savingPw || !cur || !nw || !cf}>{savingPw ? "Updating…" : "Update password"}</button>
        </div>
      </div>

      {toast ? <div className={styles.toast}>{toast}</div> : null}
    </div>
  );
}

function Row({ k, v, sub, tag, last }) {
  return (
    <div className={`${styles.row} ${last ? styles.rowLast : ""}`}>
      <span className={styles.rowK}>{k}</span>
      <span className={styles.rowV}>{v}{sub ? <span className={styles.rowSub}> · {sub}</span> : null}{tag ? <span className={`${styles.vtag} ${tag === "verified" ? styles.vok : styles.vno}`}>{tag}</span> : null}</span>
    </div>
  );
}

// Editable Email / Phone with the same OTP flow as the mobile app:
//   enter new value → Send code (/api/auth/verify/send) → enter code →
//   Verify & save (/api/auth/verify/confirm then /api/mainapp/profile/contact).
const IN = { width: "100%", height: 38, padding: "0 11px", border: "1px solid #e2e8f0", borderRadius: 9, fontSize: 13.5, color: "#0f274a", fontFamily: "inherit", boxSizing: "border-box" };
const BTN = { border: 0, borderRadius: 9, padding: "9px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" };
function ContactRow({ channel, label, value, verified, onSaved, flash }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value || "");
  const [phase, setPhase] = useState("idle"); // idle | sent
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  function reset() { setEditing(false); setPhase("idle"); setCode(""); setMsg(""); setVal(value || ""); }

  async function sendCode() {
    setMsg("");
    const t = String(val || "").trim();
    if (!t) { setMsg(`Enter your new ${label.toLowerCase()}`); return; }
    if (t.replace(/\s+/g, "") === String(value || "").replace(/\s+/g, "")) { setMsg(`That's already your ${label.toLowerCase()}`); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/auth/verify/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, target: t }) });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || "Could not send the code"); return; }
      setPhase("sent");
      flash(`Code sent to your new ${label.toLowerCase()}`);
    } catch { setMsg("Network error"); } finally { setBusy(false); }
  }

  async function verifySave() {
    setMsg("");
    const t = String(val || "").trim();
    if (!code.trim()) { setMsg("Enter the code"); return; }
    setBusy(true);
    try {
      const c = await fetch("/api/auth/verify/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, target: t, code: code.trim() }) });
      const cd = await c.json();
      if (!c.ok) { setMsg(cd.error || "That code is not right"); return; }
      const s = await fetch("/api/mainapp/profile/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel, target: t }) });
      const sd = await s.json();
      if (!s.ok) { setMsg(sd.error || "Could not save"); return; }
      flash(`${label} updated and verified`);
      reset();
      onSaved();
    } catch { setMsg("Network error"); } finally { setBusy(false); }
  }

  return (
    <div className={styles.row}>
      <span className={styles.rowK}>{label}</span>
      {!editing ? (
        <span className={styles.rowV}>
          {value || "—"}
          <span className={`${styles.vtag} ${verified ? styles.vok : styles.vno}`}>{verified ? "verified" : "unverified"}</span>
          <button style={{ ...BTN, background: "transparent", color: "#2e6cf5", padding: "2px 8px", fontSize: 12.5 }} onClick={() => { setEditing(true); setVal(value || ""); }}>
            <i className="ti ti-pencil" style={{ fontSize: 13, marginRight: 4 }} />Edit
          </button>
        </span>
      ) : (
        <span className={styles.rowV} style={{ display: "block", width: "100%", maxWidth: 340 }}>
          <input
            style={IN}
            type={channel === "email" ? "email" : "tel"}
            value={val}
            onChange={(e) => setVal(e.target.value)}
            placeholder={channel === "email" ? "you@example.com" : "+2547XXXXXXXX"}
            disabled={phase === "sent"}
            autoComplete="off"
          />
          {phase === "sent" && (
            <input style={{ ...IN, marginTop: 8, letterSpacing: 3, fontWeight: 700 }} inputMode="numeric" value={code} onChange={(e) => setCode(e.target.value)} placeholder="6-digit code" autoComplete="one-time-code" />
          )}
          {msg && <div style={{ color: "#b91c1c", fontSize: 12, marginTop: 6 }}>{msg}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 9 }}>
            {phase === "idle" ? (
              <button style={{ ...BTN, background: "#2e6cf5", color: "#fff" }} onClick={sendCode} disabled={busy}>{busy ? "Sending…" : "Send code"}</button>
            ) : (
              <>
                <button style={{ ...BTN, background: "#2e6cf5", color: "#fff" }} onClick={verifySave} disabled={busy}>{busy ? "Saving…" : "Verify & save"}</button>
                <button style={{ ...BTN, background: "#fff", color: "#334155", border: "1px solid #e2e8f0" }} onClick={sendCode} disabled={busy}>Resend</button>
              </>
            )}
            <button style={{ ...BTN, background: "#fff", color: "#64748b", border: "1px solid #e2e8f0" }} onClick={reset} disabled={busy}>Cancel</button>
          </div>
        </span>
      )}
    </div>
  );
}
