// app/mainapp/register/components/RegisterForm.jsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import styles from "./register.module.css";

export default function RegisterForm() {
  const router = useRouter();

  // Company list comes from the DB (falls back to empty until loaded).
  const [companies, setCompanies] = useState([]);
  useEffect(() => {
    fetch("/api/auth/companies")
      .then((r) => r.json())
      .then((d) => setCompanies(d.companies || []))
      .catch(() => setCompanies([]));
  }, []);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    password: "",
    password2: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [showPw2, setShowPw2] = useState(false);

  // Real OTP verification via /api/auth/verify/send + /confirm.
  const [verified, setVerified] = useState({ email: false, phone: false });
  const [otpOpen, setOtpOpen] = useState({ email: false, phone: false });
  const [code, setCode] = useState({ email: "", phone: "" });
  const [sending, setSending] = useState({ email: false, phone: false });

  const [msg, setMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  function set(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  // E.164 phone the way the API expects it.
  function phoneE164() {
    return "+254" + form.phone.replace(/\s+/g, "").replace(/^0+/, "");
  }
  function targetFor(key) {
    return key === "email" ? form.email.trim() : phoneE164();
  }

  async function sendCode(key) {
    // Step-wise: phone can't be verified until the email is verified.
    if (key === "phone" && !verified.email)
      return setMsg("Verify your email address first");
    const val = key === "email" ? form.email : form.phone;
    if (!val.trim())
      return setMsg(key === "email" ? "Enter your email first" : "Enter your phone first");
    setMsg("");
    setSending((s) => ({ ...s, [key]: true }));
    try {
      const res = await fetch("/api/auth/verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: key, target: targetFor(key) }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error || "Could not send the code");
      setOtpOpen((o) => ({ ...o, [key]: true }));
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setSending((s) => ({ ...s, [key]: false }));
    }
  }

  async function confirmCode(key) {
    if ((code[key] || "").length < 6) return setMsg("Enter the 6-digit code");
    setMsg("");
    try {
      const res = await fetch("/api/auth/verify/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: key, target: targetFor(key), code: code[key] }),
      });
      const data = await res.json();
      if (!res.ok) return setMsg(data.error || "That code is not right");
      setVerified((v) => ({ ...v, [key]: true }));
      setOtpOpen((o) => ({ ...o, [key]: false }));
    } catch {
      setMsg("Network error. Please try again.");
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();

    const required = ["firstName", "lastName", "email", "phone", "company", "password", "password2"];
    if (required.some((k) => !String(form[k]).trim()))
      return setMsg("Fill in all required fields");
    if (!verified.email || !verified.phone)
      return setMsg("Verify your email and phone number to continue");
    if (form.password.length < 8 || !/[0-9]/.test(form.password))
      return setMsg("Password must be at least 8 characters and include a number");
    if (form.password !== form.password2)
      return setMsg("The two passwords do not match");

    setMsg("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: form.firstName,
          lastName: form.lastName,
          email: form.email,
          phone: "+254" + form.phone.replace(/\s+/g, "").replace(/^0+/, ""),
          company: form.company,
          password: form.password,
          emailVerified: verified.email,
          phoneVerified: verified.phone,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMsg(data.error || "Unable to create account");
        return;
      }
      // Success — show confirmation, then go to pending-approval screen.
      setDone(true);
      setTimeout(() => router.push(`/mainapp/status?e=${encodeURIComponent(form.email.trim())}`), 1400);
    } catch {
      setMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className={styles.formPanel}>
      <form className={styles.formInner} onSubmit={handleSubmit} noValidate>
        <div className={styles.title}>Create your account</div>
        <div className={styles.sub}>
          Join AssetGuard to monitor and protect your assets
        </div>
        <div className={styles.mandatory}>
          <span className={styles.req}>*</span> All fields are mandatory
        </div>

        {/* Names */}
        <div className={styles.nameGrid}>
          <div>
            <label className={styles.lab} htmlFor="agrFirst">
              First name <span className={styles.req}>*</span>
            </label>
            <input
              className={styles.in}
              id="agrFirst"
              type="text"
              placeholder="Jane"
              value={form.firstName}
              onChange={(e) => set("firstName", e.target.value)}
            />
          </div>
          <div>
            <label className={styles.lab} htmlFor="agrLast">
              Last name <span className={styles.req}>*</span>
            </label>
            <input
              className={styles.in}
              id="agrLast"
              type="text"
              placeholder="Wanjiku"
              value={form.lastName}
              onChange={(e) => set("lastName", e.target.value)}
            />
          </div>
        </div>

        {/* Email + verify */}
        <div className={styles.field}>
          <label className={styles.lab} htmlFor="agrEmail">
            Email address <span className={styles.req}>*</span>
          </label>
          <div className={styles.rel}>
            <input
              className={styles.in}
              id="agrEmail"
              type="email"
              placeholder="jane@symphony.com"
              style={{ paddingRight: 86 }}
              value={form.email}
              disabled={verified.email}
              onChange={(e) => set("email", e.target.value)}
            />
            {verified.email ? (
              <span className={styles.vchip}>
                <i className="ti ti-circle-check" style={{ fontSize: 15 }} aria-hidden="true" />{" "}
                Verified
              </span>
            ) : (
              <button
                className={styles.vbtn}
                type="button"
                disabled={sending.email}
                onClick={() => sendCode("email")}
              >
                {sending.email ? "Sending…" : otpOpen.email ? "Resend" : "Verify"}
              </button>
            )}
          </div>
          {otpOpen.email && (
            <div className={styles.otp}>
              <input
                className={styles.code}
                maxLength={6}
                inputMode="numeric"
                placeholder="6-digit code"
                value={code.email}
                onChange={(e) => setCode((c) => ({ ...c, email: e.target.value }))}
              />
              <button className={styles.go} type="button" onClick={() => confirmCode("email")}>
                Confirm
              </button>
              <span className={styles.hint}>Code sent to your email</span>
            </div>
          )}
        </div>

        {/* Phone + verify */}
        <div className={styles.field}>
          <label className={styles.lab} htmlFor="agrPhone">
            Phone number <span className={styles.req}>*</span>
          </label>
          <div className={styles.phoneRow}>
            <span className={styles.phonePrefix}>
              +254{" "}
              <i className="ti ti-chevron-down" style={{ fontSize: 14 }} aria-hidden="true" />
            </span>
            <div className={styles.rel} style={{ flex: 1 }}>
              <input
                className={styles.in}
                id="agrPhone"
                type="tel"
                inputMode="tel"
                placeholder="712 345 678"
                style={{ paddingRight: 86, opacity: verified.email ? 1 : 0.6 }}
                value={form.phone}
                disabled={verified.phone || !verified.email}
                onChange={(e) => set("phone", e.target.value)}
              />
              {verified.phone ? (
                <span className={styles.vchip}>
                  <i className="ti ti-circle-check" style={{ fontSize: 15 }} aria-hidden="true" />{" "}
                  Verified
                </span>
              ) : (
                <button
                  className={styles.vbtn}
                  type="button"
                  disabled={sending.phone}
                  title={!verified.email ? "Verify your email first" : undefined}
                  onClick={() => sendCode("phone")}
                >
                  {sending.phone ? "Sending…" : otpOpen.phone ? "Resend" : "Verify"}
                </button>
              )}
            </div>
          </div>
          {!verified.email && (
            <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 6 }}>
              <i className="ti ti-lock" style={{ fontSize: 12, verticalAlign: -1 }} aria-hidden="true" />{" "}
              Verify your email first to unlock phone verification
            </div>
          )}
          {otpOpen.phone && (
            <div className={styles.otp}>
              <input
                className={styles.code}
                maxLength={6}
                inputMode="numeric"
                placeholder="6-digit code"
                value={code.phone}
                onChange={(e) => setCode((c) => ({ ...c, phone: e.target.value }))}
              />
              <button className={styles.go} type="button" onClick={() => confirmCode("phone")}>
                Confirm
              </button>
              <span className={styles.hint}>Code sent by SMS</span>
            </div>
          )}
        </div>

        {/* Company */}
        <div className={styles.field20}>
          <label className={styles.lab} htmlFor="agrCo">
            Company <span className={styles.req}>*</span>
          </label>
          <select
            className={styles.in}
            id="agrCo"
            value={form.company}
            onChange={(e) => set("company", e.target.value)}
          >
            <option value="">Select your company</option>
            {companies.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        {/* Password */}
        <div className={styles.field}>
          <label className={styles.lab} htmlFor="agrPw">
            Password <span className={styles.req}>*</span>
          </label>
          <div className={styles.rel}>
            <input
              className={styles.in}
              id="agrPw"
              type={showPw ? "text" : "password"}
              placeholder="At least 8 characters, one number"
              style={{ paddingRight: 44 }}
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              <i className={showPw ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 18 }} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Confirm password */}
        <div className={styles.field20}>
          <label className={styles.lab} htmlFor="agrPw2">
            Confirm password <span className={styles.req}>*</span>
          </label>
          <div className={styles.rel}>
            <input
              className={styles.in}
              id="agrPw2"
              type={showPw2 ? "text" : "password"}
              placeholder="Repeat your password"
              style={{ paddingRight: 44 }}
              value={form.password2}
              onChange={(e) => set("password2", e.target.value)}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowPw2((s) => !s)}
              aria-label={showPw2 ? "Hide password" : "Show password"}
            >
              <i className={showPw2 ? "ti ti-eye-off" : "ti ti-eye"} style={{ fontSize: 18 }} aria-hidden="true" />
            </button>
          </div>
        </div>

        {msg ? <div className={styles.msg}>{msg}</div> : null}

        <button
          className={`${styles.submit} ${done ? styles.ok : ""}`}
          type="submit"
          disabled={submitting || done}
        >
          {done ? "Account created" : submitting ? "Creating account…" : "Register"}
        </button>

        <div className={styles.helpBox}>
          Email or phone will not verify, or your company is not on the list?{" "}
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => router.push("/mainapp/request-access")}
          >
            Contact administrator
          </button>
        </div>

        <div className={styles.loginRow}>
          Already have an account?{" "}
          <button
            type="button"
            className={styles.loginBtn}
            onClick={() => router.push("/mainapp/login")}
          >
            Log in
          </button>
        </div>

        <div className={styles.secured}>
          <i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" /> Secured by
          Symphony Technologies Limited — AssetGuard v1.0
        </div>
      </form>
    </section>
  );
}
