// app/mainapp/forgot-password/ForgotPasswordForm.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "../authui/auth.module.css";

export default function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [mode, setMode] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const target = () => (mode === "email" ? email.trim() : "+254" + phone.replace(/\s+/g, "").replace(/^0+/, ""));
  const dest = () => (mode === "email" ? email.trim() : target());

  async function sendCode() {
    const val = mode === "email" ? email : phone;
    if (!val.trim()) return setMsg(mode === "email" ? "Enter your email" : "Enter your phone");
    setMsg(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/verify/send", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: mode, target: target() }),
      });
      const d = await res.json();
      if (!res.ok) return setMsg(d.error || "Could not send the code");
      setStep(2);
    } catch { setMsg("Network error"); } finally { setBusy(false); }
  }

  function verifyStep() {
    if (code.trim().length < 6) return setMsg("Enter the 6-digit code");
    setMsg(""); setStep(3);
  }

  async function resetPassword() {
    if (pw.length < 8 || !/[0-9]/.test(pw)) return setMsg("Password must be at least 8 characters and include a number");
    if (pw !== pw2) return setMsg("The two passwords do not match");
    setMsg(""); setBusy(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: mode, target: target(), code: code.trim(), password: pw }),
      });
      const d = await res.json();
      if (!res.ok) { setBusy(false); return setMsg(d.error || "Could not reset password"); }
      setStep(4);
    } catch { setMsg("Network error"); } finally { setBusy(false); }
  }

  return (
    <>
      {step === 1 && (
        <>
          <div className={styles.titleSm}>Reset your password</div>
          <div className={styles.sub}>Choose how to receive your reset code</div>
          <div className={styles.seg} role="tablist">
            <button type="button" className={mode === "email" ? styles.on : undefined} onClick={() => setMode("email")}>
              <span className={styles.chip} style={{ background: "#FEF3C7", color: "#B45309" }}>
                <i className="ti ti-mail" style={{ fontSize: 14 }} /></span>Email
            </button>
            <button type="button" className={mode === "phone" ? styles.on : undefined} onClick={() => setMode("phone")}>
              <span className={styles.chip} style={{ background: "#D1FAE5", color: "#047857" }}>
                <i className="ti ti-phone" style={{ fontSize: 14 }} /></span>Phone
            </button>
          </div>
          {mode === "email" ? (
            <div className={styles.field}>
              <label className={styles.lab}>Email address</label>
              <input className={styles.in} type="email" placeholder="you@company.co.ke" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
          ) : (
            <div className={styles.field}>
              <label className={styles.lab}>Phone number</label>
              <div className={styles.phoneRow}>
                <span className={styles.phonePrefix}>+254 <i className="ti ti-chevron-down" style={{ fontSize: 14 }} /></span>
                <input className={styles.in} type="tel" inputMode="tel" placeholder="712 345 678" style={{ flex: 1, width: "auto" }} value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>
          )}
          {msg && <div className={styles.msg}>{msg}</div>}
          <button className={styles.submit} onClick={sendCode} disabled={busy}>{busy ? "Sending…" : "Send reset code"}</button>
        </>
      )}

      {step === 2 && (
        <>
          <div className={styles.titleSm}>Enter verification code</div>
          <div className={styles.sub}>We sent a 6-digit code to <b style={{ color: "#334155" }}>{dest()}</b></div>
          <input className={styles.code} maxLength={6} inputMode="numeric" placeholder="••••••" value={code} onChange={(e) => setCode(e.target.value)} />
          <div className={styles.resendRow}>Didn&apos;t get it? <button className={styles.resendLink} onClick={sendCode} disabled={busy}>Resend code</button></div>
          {msg && <div className={styles.msg}>{msg}</div>}
          <button className={styles.submit} onClick={verifyStep}>Verify code</button>
        </>
      )}

      {step === 3 && (
        <>
          <div className={styles.titleSm}>Create new password</div>
          <div className={styles.sub}>Choose a strong password for your account</div>
          <div className={styles.field}>
            <label className={styles.lab}>New password</label>
            <div className={styles.passWrap}>
              <input className={styles.in} type={showPw ? "text" : "password"} placeholder="Enter new password" style={{ paddingRight: 44 }} value={pw} onChange={(e) => setPw(e.target.value)} />
              <button type="button" className={styles.eye} onClick={() => setShowPw((s) => !s)} aria-label="Show password">
                <i className={showPw ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 19 }} /></button>
            </div>
          </div>
          <div className={styles.field}>
            <label className={styles.lab}>Confirm password</label>
            <div className={styles.passWrap}>
              <input className={styles.in} type={showPw2 ? "text" : "password"} placeholder="Repeat new password" style={{ paddingRight: 44 }} value={pw2} onChange={(e) => setPw2(e.target.value)} />
              <button type="button" className={styles.eye} onClick={() => setShowPw2((s) => !s)} aria-label="Show password">
                <i className={showPw2 ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 19 }} /></button>
            </div>
          </div>
          {msg && <div className={styles.msg}>{msg}</div>}
          <button className={styles.submit} onClick={resetPassword} disabled={busy}>{busy ? "Resetting…" : "Reset password"}</button>
        </>
      )}

      {step === 4 && (
        <div className={styles.center}>
          <i className="ti ti-circle-check" style={{ fontSize: 64, color: "#059669" }} aria-hidden="true" />
          <div className={styles.h1}>Password reset successfully</div>
          <div className={styles.sub}>You can now log in with your new password</div>
          <button className={styles.submit} onClick={() => router.push("/mainapp/login")}>Back to log in</button>
        </div>
      )}

      {step < 4 && (
        <div className={styles.linkRow}>
          Remember your password?{" "}
          <button className={styles.link} onClick={() => router.push("/mainapp/login")}>Log in</button>
        </div>
      )}
      <div className={styles.secured}>
        <i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" /> Secured by Symphony Technologies Limited — AssetGuard v1.0
      </div>
    </>
  );
}
