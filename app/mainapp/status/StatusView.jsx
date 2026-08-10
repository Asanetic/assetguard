// app/mainapp/status/StatusView.jsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../authui/auth.module.css";

export default function StatusView() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [res, setRes] = useState(null); // { found, status, name } | { notFound:true }
  const [checking, setChecking] = useState(false);
  const [err, setErr] = useState("");

  // Prefill from ?e=<email/phone> if present (register/login pass it through).
  useEffect(() => {
    try {
      const e = new URLSearchParams(window.location.search).get("e");
      if (e) setIdentity(e);
    } catch {}
  }, []);

  async function check() {
    if (!identity.trim()) return setErr("Enter your email or phone number");
    setErr(""); setChecking(true); setRes(null);
    try {
      const r = await fetch(`/api/auth/status?identity=${encodeURIComponent(identity.trim())}`);
      const d = await r.json();
      if (r.status === 404) setRes({ notFound: true });
      else if (!r.ok) setErr(d.error || "Could not check status");
      else setRes(d);
    } catch { setErr("Network error. Please try again."); }
    finally { setChecking(false); }
  }

  const status = res && !res.notFound ? res.status : null;

  // Icon + heading + sub reflect the result (defaults to the pending look).
  let icon = "ti-hourglass-high", iconColor = "#B45309";
  let h1 = "Check your approval status";
  let sub = "Enter the email or phone you registered with.";
  if (res?.notFound) { icon = "ti-search-off"; iconColor = "#64748B"; h1 = "No registration found"; sub = "We couldn't find an account for that email or phone number."; }
  else if (status === "Active") { icon = "ti-circle-check"; iconColor = "#059669"; h1 = "You're approved!"; sub = `Your account is active${res.name ? `, ${res.name}` : ""} — you can now log in.`; }
  else if (status === "Pending") { icon = "ti-hourglass-high"; iconColor = "#B45309"; h1 = "Waiting for admin verification"; sub = "Your registration is still under review."; }
  else if (status === "Rejected") { icon = "ti-user-x"; iconColor = "#DC2626"; h1 = "Registration not approved"; sub = "The administrator was unable to verify your account."; }
  else if (status === "Suspended") { icon = "ti-lock"; iconColor = "#DC2626"; h1 = "Account suspended"; sub = "Your account has been suspended — contact an administrator."; }

  // Progress nodes state
  const nodes = (() => {
    if (status === "Active") return ["done", "done", "done"];
    if (status === "Rejected") return ["done", "bad", "wait"];
    return ["done", "now", "wait"]; // pending / default
  })();
  const nodeCls = { done: styles.nodeDone, now: styles.nodeNow, wait: styles.nodeWait, bad: styles.nodeBad };
  const nodeIco = { done: "ti-check", now: "ti-user-check", wait: "ti-lock", bad: "ti-x" };

  return (
    <div className={styles.center}>
      <i className={`ti ${icon} ${styles.bigIcon}`} style={{ color: iconColor }} aria-hidden="true" />
      <div className={styles.h1}>{h1}</div>
      <div className={styles.sub}>{sub}</div>

      {(status || res?.notFound) && (
        <div className={styles.steps}>
          <span className={`${styles.node} ${nodeCls[nodes[0]]}`}><i className={`ti ${nodeIco[nodes[0]]}`} /></span>
          <span className={`${styles.bar} ${nodes[0] === "done" ? styles.barDone : ""}`} />
          <span className={`${styles.node} ${nodeCls[nodes[1]]}`}><i className={`ti ${nodeIco[nodes[1]]}`} /></span>
          <span className={`${styles.bar} ${nodes[1] === "done" ? styles.barDone : ""}`} />
          <span className={`${styles.node} ${nodeCls[nodes[2]]}`}><i className={`ti ${nodeIco[nodes[2]]}`} /></span>
        </div>
      )}

      {/* result banners */}
      {status === "Pending" && (
        <div className={`${styles.banner} ${styles.bannerWarn}`}>Still pending — hang tight, we&apos;ll notify you once approved</div>
      )}
      {status === "Active" && (
        <div className={`${styles.banner}`} style={{ background: "#D1FAE5", border: "1px solid #A7F3D0", color: "#065F46" }}>
          Approved — sign in with the credentials you registered with
        </div>
      )}
      {status === "Rejected" && (
        <div className={`${styles.banner} ${styles.bannerBad}`}>Your registration was declined by the administrator</div>
      )}

      {/* identity input + check */}
      <div style={{ textAlign: "left", marginTop: 18 }}>
        <label className={styles.lab}>Email or phone number</label>
        <input
          className={styles.in}
          type="text"
          placeholder="you@company.co.ke"
          value={identity}
          onChange={(e) => setIdentity(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && check()}
        />
      </div>
      {err && <div className={styles.msg} style={{ marginTop: 10 }}>{err}</div>}

      <div style={{ marginTop: 16 }}>
        {status === "Active" ? (
          <button className={styles.submit} onClick={() => router.push("/mainapp/login")}>Log in</button>
        ) : (
          <button className={styles.submit} onClick={check} disabled={checking}>
            {checking ? "Checking…" : "Check status"}
          </button>
        )}
      </div>

      <div className={styles.notifyRow}>
        <i className="ti ti-bell" style={{ fontSize: 15 }} aria-hidden="true" />
        <span className={styles.notifyText}>We&apos;ll email and SMS you the moment your account is approved</span>
      </div>

      <div className={styles.linkRow}>
        <button className={styles.link} onClick={() => router.push("/mainapp/request-access")}>Contact administrator</button>
        {"  ·  "}
        <button className={styles.link} onClick={() => router.push("/mainapp/login")}>Back to log in</button>
      </div>

      <div className={styles.secured}>
        <i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" /> Secured by Symphony Technologies Limited — AssetGuard v1.0
      </div>
    </div>
  );
}
