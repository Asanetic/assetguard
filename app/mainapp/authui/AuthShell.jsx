// app/mainapp/authui/AuthShell.jsx
// Shared brand panel + responsive grid for every auth screen.
import styles from "./auth.module.css";

export default function AuthShell({ children }) {
  return (
    <main className={styles.screen}>
      <div className={styles.grid}>
        <section className={styles.brand}>
          <div className={styles.orb} aria-hidden="true">
            <span style={{ inset: 0 }} />
            <span style={{ inset: "64px" }} />
            <span style={{ inset: "128px" }} />
            <i className={styles.ping} />
          </div>
          <div className={styles.brandInner}>
            <div className={styles.brandLogoRow}>
              <img src="/assetguard-logo.svg" alt="AssetGuard" style={{ height: 42, width: "auto", display: "block" }} />
              <span className={styles.brandName}>
                <span className={styles.brandNameA}>Asset</span>
                <span className={styles.brandNameB}>Guard</span>
              </span>
            </div>
            <div className={styles.brandHeadline}>Asset monitoring<br />and protection</div>
            <div className={styles.brandSub}>
              Real-time visibility, protection, and reporting for your assets, field teams, and operations — from a single platform.
            </div>
            <div className={styles.brandPills}>
              <span className={styles.pill}>Live tracking</span>
              <span className={styles.pill}>Smart alerts</span>
              <span className={styles.pill}>Reporting</span>
              <span className={styles.pill}>Field ops</span>
            </div>
          </div>
        </section>
        <section className={styles.formPanel}>
          <div className={styles.formInner}>{children}</div>
        </section>
      </div>
    </main>
  );
}
