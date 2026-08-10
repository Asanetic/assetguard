// app/mainapp/status/components/StatusChecker.jsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./status.module.css";

export default function StatusChecker() {
  const router = useRouter();
  const [identity, setIdentity] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { status, name, email, company }

  async function check(e) {
    e?.preventDefault();
    setError("");
    if (!identity.trim()) return setError("Enter your email or phone number");
    setLoading(true);
    try {
      const res = await fetch(
        `/api/auth/status?identity=${encodeURIComponent(identity.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not check status");
        setResult(null);
        return;
      }
      setResult(data);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const status = result?.status;
  const approved = status === "Active";
  const rejected = status === "Rejected";
  const pending = status === "Pending" || status === "Suspended";

  const icoClass = approved
    ? styles.icoApproved
    : rejected
    ? styles.icoRejected
    : styles.icoPending;
  const icoName = approved
    ? "ti ti-circle-check"
    : rejected
    ? "ti ti-circle-x"
    : "ti ti-hourglass-high";

  const heading = !result
    ? "Check your account status"
    : approved
    ? "You're approved"
    : rejected
    ? "Registration not approved"
    : "Waiting for admin verification";

  const subtext = !result
    ? "Enter the email or phone number you registered with to see whether your account has been approved."
    : approved
    ? `Welcome, ${result.name}. Your account at ${result.company} is active — you can log in now.`
    : rejected
    ? "An administrator did not approve this registration. Please contact them for details."
    : `Thanks for registering, ${result.name?.split(" ")[0] || ""}. An administrator at ${result.company} must verify your account before you can log in. This usually takes less than 24 hours.`;

  return (
    <section className={styles.formPanel}>
      <div className={styles.formInner}>
        <div className={`${styles.icoW} ${icoClass}`}>
          <i className={icoName} style={{ fontSize: 36 }} aria-hidden="true" />
        </div>

        <div className={styles.h1}>{heading}</div>
        <div className={styles.sub}>{subtext}</div>

        {/* progress steps */}
        <div className={styles.steps}>
          <div className={`${styles.node} ${styles.nodeDone}`}>
            <i className="ti ti-check" aria-hidden="true" />
          </div>
          <div className={`${styles.conn} ${approved ? styles.connDone : styles.connTodo}`} />
          <div
            className={`${styles.node} ${
              approved ? styles.nodeDone : styles.nodeCur
            }`}
          >
            <i className="ti ti-user-check" aria-hidden="true" />
          </div>
          <div className={`${styles.conn} ${approved ? styles.connDone : styles.connTodo}`} />
          <div
            className={`${styles.node} ${approved ? styles.nodeDone : styles.nodeTodo}`}
          >
            <i className="ti ti-lock" aria-hidden="true" />
          </div>
        </div>
        <div className={styles.stepLabels}>
          <span>Registered</span>
          <span>Admin verification</span>
          <span>Log in</span>
        </div>

        {result && (
          <div
            className={`${styles.banner} ${
              approved ? styles.banApproved : rejected ? styles.banRejected : styles.banPending
            }`}
          >
            {approved
              ? "Approved — you can log in now"
              : rejected
              ? "Not approved"
              : "Still pending — hang tight, we'll notify you once approved"}
          </div>
        )}

        {result && (
          <div className={styles.identityBox}>
            Registered as <b>{result.name}</b> — {result.email}
            <br />
            Company: {result.company}
          </div>
        )}

        <form onSubmit={check}>
          {!approved && (
            <>
              <label className={styles.lab} htmlFor="identity">
                Email or phone number
              </label>
              <input
                id="identity"
                className={styles.in}
                type="text"
                placeholder="you@company.co.ke"
                value={identity}
                onChange={(e) => setIdentity(e.target.value)}
              />
            </>
          )}

          {error ? <div className={styles.err}>{error}</div> : null}

          {approved ? (
            <button
              type="button"
              className={`${styles.btn} ${styles.btnApproved}`}
              onClick={() => router.push("/mainapp/login")}
            >
              Go to login
            </button>
          ) : (
            <button className={styles.btn} type="submit" disabled={loading}>
              {loading ? "Checking…" : "Check status"}
            </button>
          )}
        </form>

        <div className={styles.link}>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => router.push("/mainapp/login")}
          >
            Back to login
          </button>
        </div>

        <div className={styles.secured}>
          <i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" /> Secured by
          Symphony Technologies Limited — AssetGuard v1.0
        </div>
      </div>
    </section>
  );
}
