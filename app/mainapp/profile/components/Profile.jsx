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
          <Row k="Email" v={u.email || "—"} tag={u.email_verified ? "verified" : "unverified"} />
          <Row k="Phone" v={u.phone || "—"} tag={u.phone_verified ? "verified" : undefined} />
          <Row k="Role" v={u.role_name || u.role || "—"} />
          <Row k="Company" v={org?.company || "—"} sub={org?.type || undefined} />
          <Row k="Regions" v={regions.length ? <span className={styles.chips}>{regions.map((rg) => <span key={rg} className={styles.chip}>{rg}</span>)}</span> : "All / none"} />
          <Row k="Member since" v={fmtEAT(u.created_at)} />
          <Row k="Last seen" v={fmtEAT(u.last_seen)} last />
          <div className={styles.note}>Name, phone, role, email and company are managed by an administrator.</div>
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
