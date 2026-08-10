// app/mainapp/admin/components/AdminShell.jsx
"use client";

import { usePathname, useRouter } from "next/navigation";
import styles from "./admin.module.css";

const NAV = [
  { href: "/mainapp/admin/users", label: "Users & Roles", icon: "ti-users" },
  { href: "/mainapp/admin/companies", label: "Companies", icon: "ti-building" },
];

export default function AdminShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();

  async function signOut() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/mainapp/login");
  }

  return (
    <div className={styles.shell}>
      <aside className={styles.rail}>
        <div className={styles.railBrand}>
          <svg width="30" height="30" viewBox="0 0 96 96" aria-hidden="true">
            <rect width="96" height="96" rx="24" fill="#2E6CF5" />
            <g transform="translate(1.04,3.76) scale(3.881)">
              <path d="M11.9 2 C11.9 2 9.1 5.9 3.3 6.2 L3.3 12.8 C3.3 16.2 6.2 19 10.4 20.8 M11.9 2 C11.9 2 14.9 5.9 20.9 6.2 L20.9 12.8" fill="none" stroke="#fff" strokeWidth="1.45" strokeLinejoin="round" strokeLinecap="round" />
              <path d="M14.4 18 L16.8 20.6 L20.8 15.8" fill="none" stroke="#fff" strokeWidth="1.45" strokeLinejoin="round" strokeLinecap="round" />
            </g>
          </svg>
          <span className={styles.railName}>
            Asset<span className={styles.railNameB}>Guard</span>
          </span>
        </div>

        {NAV.map((n) => {
          const active = pathname?.startsWith(n.href);
          return (
            <a
              key={n.href}
              href={n.href}
              className={`${styles.navItem} ${active ? styles.navItemActive : ""}`}
            >
              <i className={`ti ${n.icon}`} style={{ fontSize: 17 }} aria-hidden="true" />
              {n.label}
            </a>
          );
        })}

        <div className={styles.railSpacer} />
        <button className={styles.signOut} onClick={signOut}>
          <i className="ti ti-logout" style={{ fontSize: 17 }} aria-hidden="true" />
          Sign out
        </button>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
