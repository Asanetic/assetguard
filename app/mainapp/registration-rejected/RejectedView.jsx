// app/mainapp/registration-rejected/RejectedView.jsx
"use client";

import { useRouter } from "next/navigation";
import styles from "../authui/auth.module.css";

export default function RejectedView() {
  const router = useRouter();
  return (
    <div className={styles.center}>
      <i className={`ti ti-user-x ${styles.bigIcon}`} style={{ color: "#DC2626" }} aria-hidden="true" />
      <div className={styles.h1}>Registration not approved</div>
      <div className={styles.sub}>The administrator was unable to verify your account.</div>

      <div className={styles.steps}>
        <span className={`${styles.node} ${styles.nodeDone}`}><i className="ti ti-check" /></span>
        <span className={`${styles.bar} ${styles.barDone}`} />
        <span className={`${styles.node} ${styles.nodeBad}`}><i className="ti ti-x" /></span>
        <span className={styles.bar} />
        <span className={`${styles.node} ${styles.nodeWait}`}><i className="ti ti-lock" /></span>
      </div>

      <div className={styles.reasonBox}>
        <b>Reason from administrator:</b> your work email does not match our company records.
        Use your official company email and register again.
      </div>

      <div style={{ marginTop: 18 }}>
        <button className={styles.submit} onClick={() => router.push("/mainapp/register")}>Register again</button>
      </div>

      <div className={styles.linkRow}>
        <button className={styles.link} onClick={() => router.push("/mainapp/request-access")}>Contact administrator</button>
        {"  ·  "}
        <button className={styles.link} onClick={() => router.push("/mainapp/login")}>Log in</button>
      </div>

      <div className={styles.secured}>
        <i className="ti ti-lock" style={{ fontSize: 14 }} aria-hidden="true" /> Secured by Symphony Technologies Limited — AssetGuard v1.0
      </div>
    </div>
  );
}
