// app/mainapp/shell/AppShell.jsx
// The AssetGuard app shell (from the prototype): navy rail, red alarm bar,
// floating speaker, and a slide-out drawer menu. Wraps authenticated pages.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./shell.module.css";

// Rail quick-nav (collapsed icons). Sections not yet built open the drawer.
const RAIL = [
  { key: "sites", label: "Sites", icon: "ti-map-pin" },
  { key: "devices", label: "Devices", icon: "ti-cpu" },
  { key: "alarms", label: "Alarms", icon: "ti-bell-ringing", badge: true },
  { key: "playback", label: "Playback", icon: "ti-player-play" },
];

// Full drawer menu. `children` makes an expandable group.
// Icon colors match the prototype exactly.
const MENU = [
  { key: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard", color: "#2E6CF5", href: "/mainapp/dashboard" },
  { key: "sites", label: "Sites", icon: "ti-map-pin", color: "#10B981", children: [
      { key: "all_sites", label: "All sites", href: "/mainapp/sites" },
      { key: "add_site", label: "Add site", href: "/mainapp/sites/add" },
    ] },
  { key: "devices", label: "Devices", icon: "ti-cpu", color: "#F59E0B", children: [
      { key: "all_devices", label: "All devices", href: "/mainapp/devices" },
      { key: "add_device", label: "Add device", href: "/mainapp/devices/add" },
      { key: "ingest", label: "Live logs", href: "/mainapp/ingest" },
    ] },
  { key: "alarms", label: "Alarms", icon: "ti-bell-ringing", color: "#EF4444", children: [
      { key: "all_alarms", label: "All alarms", href: "/mainapp/alarms" },
    ] },
  { key: "playback", label: "Playback", icon: "ti-player-play", color: "#8B5CF6", href: "/mainapp/playback" },
  { key: "field", label: "Field Response", icon: "ti-run", color: "#EC4899", children: [
      { key: "response", label: "Response teams", href: "/mainapp/response" },
      { key: "noc", label: "NOC teams", href: "/mainapp/noc" },
    ] },
  { key: "notifications", label: "Notifications", icon: "ti-bell", color: "#0EA5E9", href: "/mainapp/notifications" },
  { key: "logs", label: "Device logs", icon: "ti-file-text", color: "#64748B", href: "/mainapp/logs" },
  { key: "reports", label: "Reports", icon: "ti-report-analytics", color: "#059669", href: "/mainapp/reports" },
  { key: "profile", label: "My profile", icon: "ti-user", color: "#14315D", href: "/mainapp/profile" },
  { key: "admin", label: "Admin", icon: "ti-shield-cog", color: "#14315D", children: [
      { key: "users", label: "Users & Roles", href: "/mainapp/admin/users" },
      { key: "access", label: "Access control", href: "/mainapp/admin/access" },
      { key: "companies", label: "Companies", href: "/mainapp/admin/companies" },
      { key: "settings", label: "Settings", href: "/mainapp/admin/settings" },
      { key: "audit", label: "Audit logs", href: "/mainapp/admin/audit" },
    ] },
];

// AssetGuard app logo (public/assetguard-logo.svg).
function AgLogo({ size = 28 }) {
  return (
    <img
      src="/assetguard-logo.svg"
      alt="AssetGuard"
      style={{ height: size, width: "auto", display: "block" }}
    />
  );
}

function initials(name) {
  return String(name || "")
    .split(/\s+/)
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export default function AppShell({ children, active, openAlarms = 0, criticalAlarms = 0 }) {
  const router = useRouter();
  const [drawer, setDrawer] = useState(false);
  const [expanded, setExpanded] = useState(() => {
    // Expand whichever group contains the active item.
    const open = {};
    for (const m of MENU) {
      if (m.children && m.children.some((c) => c.key === active)) open[m.key] = true;
    }
    if (!Object.keys(open).length && active) open.admin = true;
    return open;
  });
  const [user, setUser] = useState(null);
  const [muted, setMuted] = useState(false);
  const [alarms, setAlarms] = useState({ open: openAlarms, critical: criticalAlarms });
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let ok = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => ok && d?.user && setUser(d.user))
      .catch(() => {});
    // Alarm summary is optional; hide the bar if the endpoint isn't there.
    if (!openAlarms) {
      fetch("/api/mainapp/alarms/summary")
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => ok && d && setAlarms({ open: d.open || 0, critical: d.critical || 0 }))
        .catch(() => {});
    }
    return () => { ok = false; };
  }, [openAlarms]);

  function go(href) {
    setDrawer(false);
    if (href) router.push(href);
  }
  function toggle(key) {
    setExpanded((e) => ({ ...e, [key]: !e[key] }));
  }
  function requestLogout() {
    setDrawer(false);
    setConfirmLogout(true);
  }
  async function signOut() {
    setLoggingOut(true);
    try { await fetch("/api/auth/logout", { method: "POST" }); } catch {}
    router.push("/mainapp/login");
  }

  const showBar = alarms.open > 0;

  return (
    <div className={styles.shell}>
      {showBar && (
        <div className={styles.alarmBar}>
          <i className={`ti ti-alert-triangle ${styles.barIcon}`} aria-hidden="true" />
          <span className={styles.barTxt}>
            {alarms.open} open alarms{alarms.critical ? ` — ${alarms.critical} critical` : ""}
          </span>
          <button className={styles.alarmBarBtn} onClick={() => go("/mainapp/alarms")}>
            View all alarms
          </button>
        </div>
      )}

      <div className={styles.body}>
        {/* Rail */}
        <nav className={styles.rail}>
          <button
            className={styles.burger}
            aria-label="Open menu"
            onClick={() => setDrawer(true)}
          >
            <i className="ti ti-menu-2" style={{ fontSize: 21 }} aria-hidden="true" />
          </button>
          {RAIL.map((r) => (
            <button
              key={r.key}
              className={`${styles.railBtn} ${active === r.key ? styles.railBtnActive : ""}`}
              onClick={() => setDrawer(true)}
            >
              <i className={`ti ${r.icon}`} style={{ fontSize: 19 }} aria-hidden="true" />
              {r.label}
              {r.badge && alarms.open > 0 && (
                <span className={styles.railBadge}>{alarms.open}</span>
              )}
            </button>
          ))}

          {/* bottom cluster — fills the rail base */}
          <div className={styles.railSpacer} />
          <button
            className={styles.railAvatar}
            aria-label="Open menu"
            title={user?.name || "Account"}
            onClick={() => setDrawer(true)}
          >
            {initials(user?.name) || "AG"}
          </button>
          <button className={styles.railBottomBtn} onClick={requestLogout}>
            <i className="ti ti-logout" style={{ fontSize: 18 }} aria-hidden="true" />
            Log out
          </button>
        </nav>

        {/* Content */}
        <main className={styles.content}>{children}</main>
      </div>

      {/* Floating speaker */}
      <button
        className={`${styles.speaker} ${alarms.open > 0 && !muted ? styles.speakerLive : ""}`}
        aria-label={muted ? "Unmute alarm sound" : "Mute alarm sound"}
        onClick={() => setMuted((m) => !m)}
      >
        <i
          className={muted ? "ti ti-volume-off" : "ti ti-volume"}
          style={{ fontSize: 22 }}
          aria-hidden="true"
        />
      </button>

      {/* Drawer */}
      {drawer && (
        <>
          <div className={styles.scrim} onClick={() => setDrawer(false)} />
          <aside className={styles.drawer}>
            <div className={styles.drawerBrand}>
              <AgLogo size={28} />
              <span className={styles.drawerBrandName}>
                Asset<span className={styles.drawerBrandNameB}>Guard</span>
              </span>
            </div>

            <div className={styles.menu}>
              {MENU.map((m) => {
                if (m.children) {
                  const open = !!expanded[m.key];
                  return (
                    <div key={m.key}>
                      <button className={styles.menuItem} onClick={() => toggle(m.key)}>
                        <i className={`ti ${m.icon} ${styles.menuIcon}`} style={{ color: m.color }} aria-hidden="true" />
                        <span className={styles.menuLabel}>{m.label}</span>
                        <i className={`ti ti-chevron-down ${styles.chev} ${open ? styles.chevOpen : ""}`} aria-hidden="true" />
                      </button>
                      {open && (
                        <div className={styles.submenu}>
                          {m.children.map((c) => (
                            <button
                              key={c.key}
                              className={`${styles.subItem} ${active === c.key ? styles.subItemActive : ""}`}
                              onClick={() => go(c.href)}
                            >
                              {c.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                }
                return (
                  <button
                    key={m.key}
                    className={`${styles.menuItem} ${active === m.key ? styles.menuItemActive : ""}`}
                    onClick={() => go(m.href)}
                  >
                    <i className={`ti ${m.icon} ${styles.menuIcon}`} style={{ color: m.color }} aria-hidden="true" />
                    <span className={styles.menuLabel}>{m.label}</span>
                  </button>
                );
              })}

              <button className={`${styles.menuItem} ${styles.logout}`} onClick={requestLogout}>
                <i className={`ti ti-logout ${styles.menuIcon}`} aria-hidden="true" />
                <span className={styles.menuLabel}>Log out</span>
              </button>
            </div>
          </aside>
        </>
      )}

      {/* Logout confirmation */}
      {confirmLogout && (
        <div className={styles.confirmScrim} onClick={() => !loggingOut && setConfirmLogout(false)}>
          <div className={styles.confirmCard} onClick={(e) => e.stopPropagation()}>
            <span className={styles.confirmIcon}>
              <i className="ti ti-logout" style={{ fontSize: 24 }} aria-hidden="true" />
            </span>
            <div className={styles.confirmTitle}>Log out?</div>
            <div className={styles.confirmText}>
              You&apos;ll need to sign in again to continue{user?.name ? `, ${user.name}` : ""}.
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.confirmCancel} onClick={() => setConfirmLogout(false)} disabled={loggingOut}>
                Cancel
              </button>
              <button className={styles.confirmLogout} onClick={signOut} disabled={loggingOut}>
                <i className="ti ti-logout" style={{ fontSize: 16 }} aria-hidden="true" />
                {loggingOut ? "Logging out…" : "Log out"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
