// app/mainapp/login/components/LoginForm.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./login.module.css";

export default function LoginForm() {
  const router = useRouter();

  const [mode, setMode] = useState("email"); // "email" | "phone"
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Identity is either the email or the +254 phone number, matching the app.
  function currentIdentity() {
    if (mode === "email") return email.trim();
    const digits = phone.replace(/\s+/g, "");
    return digits ? "+254" + digits.replace(/^0+/, "") : "";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const identity = currentIdentity();
    if (!identity)
      return setError(
        mode === "email"
          ? "Enter your email address"
          : "Enter your phone number"
      );
    if (!password) return setError("Enter your password");

    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identity, password, remember }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Unable to log in");
        if (data.status === "Pending") router.push(`/mainapp/status?e=${encodeURIComponent(identity)}`);
        else if (data.status === "Rejected") router.push("/mainapp/registration-rejected");
        return;
      }

      router.push("/mainapp");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className={styles.formPanel}>
      <form className={styles.formInner} onSubmit={handleSubmit} noValidate>
        <div className={styles.welcome}>Welcome back</div>
        <div className={styles.welcomeSub}>Log in to your AssetGuard account</div>

        {/* Email / Phone toggle */}
        <div className={styles.seg} role="tablist">
          <button
            type="button"
            className={mode === "email" ? styles.on : undefined}
            aria-pressed={mode === "email"}
            onClick={() => setMode("email")}
          >
            <span
              className={styles.chip}
              style={{ background: "#FEF3C7", color: "#B45309" }}
            >
              <i className="ti ti-mail" style={{ fontSize: 14 }} aria-hidden="true" />
            </span>
            Email
          </button>
          <button
            type="button"
            className={mode === "phone" ? styles.on : undefined}
            aria-pressed={mode === "phone"}
            onClick={() => setMode("phone")}
          >
            <span
              className={styles.chip}
              style={{ background: "#D1FAE5", color: "#047857" }}
            >
              <i className="ti ti-phone" style={{ fontSize: 14 }} aria-hidden="true" />
            </span>
            Phone
          </button>
        </div>

        {/* Email field */}
        {mode === "email" && (
          <div className={styles.field}>
            <label className={styles.lab} htmlFor="agwEmail">
              Email address
            </label>
            <input
              className={styles.in}
              id="agwEmail"
              type="email"
              autoComplete="username"
              placeholder="admin@symphony.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        )}

        {/* Phone field */}
        {mode === "phone" && (
          <div className={styles.field}>
            <label className={styles.lab} htmlFor="agwPhone">
              Phone number
            </label>
            <div className={styles.phoneRow}>
              <span className={styles.phonePrefix}>
                +254{" "}
                <i
                  className="ti ti-chevron-down"
                  style={{ fontSize: 14 }}
                  aria-hidden="true"
                />
              </span>
              <input
                className={`${styles.in} ${styles.phoneInput}`}
                id="agwPhone"
                type="tel"
                inputMode="tel"
                placeholder="712 345 678"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Password */}
        <div>
          <label className={styles.lab} htmlFor="agwPass">
            Password
          </label>
          <div className={styles.passWrap}>
            <input
              className={styles.in}
              id="agwPass"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              style={{ paddingRight: 44 }}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className={styles.eye}
              onClick={() => setShowPw((s) => !s)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
              <i
                className={showPw ? "ti ti-eye-off" : "ti ti-eye"}
                style={{ fontSize: 19 }}
                aria-hidden="true"
              />
            </button>
          </div>
        </div>

        {/* Remember + forgot */}
        <div className={styles.row}>
          <label className={styles.remember}>
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            Remember me
          </label>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => router.push("/mainapp/forgot-password")}
          >
            Forgot password?
          </button>
        </div>

        {error ? <div className={styles.error}>{error}</div> : null}

        <button className={styles.submit} type="submit" disabled={loading}>
          {loading ? "Verifying…" : "Log in"}
        </button>

        <div className={styles.createRow}>
          New to AssetGuard?{" "}
          <button
            type="button"
            className={styles.createBtn}
            onClick={() => router.push("/mainapp/register")}
          >
            Create account
          </button>
        </div>

        <div className={styles.statusRow}>
          <button
            type="button"
            className={styles.statusBtn}
            onClick={() => router.push("/mainapp/status")}
          >
            <i
              className="ti ti-hourglass-high"
              style={{ fontSize: 14, color: "#B45309" }}
              aria-hidden="true"
            />
            Check approval status
          </button>
        </div>

        <div className={styles.secured}>
          <i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" />{" "}
          Secured by Symphony Technologies Limited — AssetGuard v1.0
        </div>
      </form>
    </section>
  );
}
