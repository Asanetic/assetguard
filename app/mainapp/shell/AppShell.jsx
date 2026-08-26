// app/mainapp/shell/AppShell.jsx
// The AssetGuard app shell (from the prototype): navy rail, red alarm bar,
// floating speaker, and a slide-out drawer menu. Wraps authenticated pages.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./shell.module.css";
import { startAlarmSound, stopAlarmSound, resumeAudio } from "../lib/alarmSound.js";

// Rail quick-nav (collapsed icons). Sections not yet built open the drawer.
// The collapsed rail icons are map shortcuts — each navigates straight to its
// map view. Only the hamburger opens the full drawer.
const RAIL = [
  { key: "sites", label: "Sites", icon: "ti-map-pin", href: "/mainapp/sitemaps" },
  { key: "devices", label: "Devices", icon: "ti-cpu", href: "/mainapp/devicemap" },
  { key: "alarms", label: "Alarms", icon: "ti-bell-ringing", badge: true, href: "/mainapp/alarmmaps" },
  { key: "playback", label: "Playback", icon: "ti-player-play", href: "/mainapp/playbackmap" },
];

// Full drawer menu. `children` makes an expandable group.
// Icon colors match the prototype exactly.
const MENU = [
  { key: "dashboard", label: "Dashboard", icon: "ti-layout-dashboard", color: "#2E6CF5", href: "/mainapp/dashboard" },
  { key: "sites", label: "Sites", icon: "ti-map-pin", color: "#10B981", children: [
      { key: "all_sites", label: "All sites", href: "/mainapp/sites" },
      { key: "group_sites", label: "Group sites", href: "/mainapp/sites/group" },
      { key: "add_site", label: "Add site", href: "/mainapp/sites/add" },
    ] },
  { key: "devices", label: "Devices", icon: "ti-cpu", color: "#F59E0B", children: [
      { key: "all_devices", label: "All devices", href: "/mainapp/devices" },
      { key: "group_devices", label: "Group devices", href: "/mainapp/devices/group" },
      { key: "add_device", label: "Add device", href: "/mainapp/devices/add" },
      { key: "ports", label: "Device logs and ports", href: "/mainapp/ports" },
      { key: "tcplogs", label: "Parsed & aligned", href: "/mainapp/tcplogs" },
      { key: "simulator", label: "Simulator", href: "/mainapp/simulator" },
    ] },
  { key: "alarms", label: "Alarms", icon: "ti-bell-ringing", color: "#EF4444", children: [
      { key: "all_alarms", label: "All alarms", href: "/mainapp/alarms" },
      { key: "missed_alarms", label: "Missed alarms", href: "/mainapp/alarms/missed" },
      { key: "alarmconfig", label: "Alarm thresholds", href: "/mainapp/alarmconfig" },
    ] },
  { key: "playback", label: "Playback", icon: "ti-player-play", color: "#8B5CF6", children: [
      { key: "route_playback", label: "Route playback", href: "/mainapp/playbackmap" },
      { key: "playback_exports", label: "Exports", href: "/mainapp/playback/exports" },
    ] },
  { key: "notifications", label: "Notifications", icon: "ti-bell", color: "#0EA5E9", href: "/mainapp/notifications" },
  { key: "logs", label: "Heartbeats", icon: "ti-heartbeat", color: "#64748B", href: "/mainapp/logs" },
  { key: "reports", label: "Reports", icon: "ti-report-analytics", color: "#059669", href: "/mainapp/reports" },
  { key: "profile", label: "My profile", icon: "ti-user", color: "#14315D", href: "/mainapp/profile" },
  { key: "admin", label: "Admin", icon: "ti-shield-cog", color: "#14315D", children: [
      { key: "users", label: "Users & Roles", href: "/mainapp/admin/users" },
      { key: "access", label: "Access control", href: "/mainapp/admin/access" },
      { key: "companies", label: "Companies", href: "/mainapp/admin/companies" },
      { key: "response", label: "Response teams", href: "/mainapp/response" },
      { key: "noc", label: "NOC teams", href: "/mainapp/noc" },
      { key: "settings", label: "Settings", href: "/mainapp/admin/settings" },
      { key: "maps", label: "Google Maps", href: "/mainapp/admin/maps" },
      { key: "firmware", label: "Firmware", href: "/mainapp/admin/firmware" },
      { key: "messaging", label: "Email & SMS", href: "/mainapp/admin/messaging" },
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

export default function AppShell({ children, active, openAlarms = 0, criticalAlarms = 0, speakerPosition = "right" }) {
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
  // The buzzer mute is sticky: it survives navigation / reloads until the operator
  // unmutes it (a new incoming alarm still force-unmutes — see the poll below).
  const [muted, setMuted] = useState(() => {
    try { return typeof window !== "undefined" && window.localStorage.getItem("ag_buzzer_muted") === "1"; }
    catch { return false; }
  });
  function setMutedPersist(next) {
    setMuted((prev) => {
      const v = typeof next === "function" ? next(prev) : next;
      try { window.localStorage.setItem("ag_buzzer_muted", v ? "1" : "0"); } catch { /* ignore */ }
      return v;
    });
  }
  const [alarms, setAlarms] = useState({ open: openAlarms, critical: criticalAlarms });
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const prevOpenRef = useRef(alarms.open);
  const firstPollRef = useRef(true);

  useEffect(() => {
    let ok = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => ok && d?.user && setUser(d.user))
      .catch(() => {});
    return () => { ok = false; };
  }, []);

  // Poll the alarm summary. When the open count RISES (a new alarm came in), the
  // buzzer force-unmutes and rings — even if the operator had muted it.
  useEffect(() => {
    let ok = true;
    async function poll() {
      try {
        const r = await fetch("/api/mainapp/alarms/summary");
        const d = r.ok ? await r.json() : null;
        if (!ok || !d) return;
        const open = d.open || 0, critical = d.critical || 0;
        // The first poll only establishes the baseline (so an initial 0 → N read
        // on page load is NOT treated as a new alarm and does not unmute). After
        // that, a genuine RISE in the open count force-unmutes and rings.
        if (!firstPollRef.current && open > prevOpenRef.current) setMutedPersist(false);
        firstPollRef.current = false;
        prevOpenRef.current = open;
        setAlarms({ open, critical });
      } catch { /* endpoint optional */ }
    }
    poll();
    const id = setInterval(poll, 15000);
    return () => { ok = false; clearInterval(id); };
  }, []);

  // Ring while there are open alarms and the buzzer isn't muted. Audio can't
  // start before a user gesture, so also arm it on the first interaction.
  useEffect(() => {
    if (alarms.open > 0 && !muted) startAlarmSound();
    else stopAlarmSound();
  }, [alarms.open, muted]);
  useEffect(() => {
    const arm = () => { resumeAudio(); if (alarms.open > 0 && !muted) startAlarmSound(); };
    window.addEventListener("pointerdown", arm, { once: true });
    return () => { window.removeEventListener("pointerdown", arm); stopAlarmSound(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
          {/* scrollable icon list — scrolls if the viewport is short, so the bottom
              cluster (avatar + Log out) below always stays pinned and fully visible */}
          <div className={styles.railTop}>
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
                onClick={() => go(r.href)}
              >
                <i className={`ti ${r.icon}`} style={{ fontSize: 19 }} aria-hidden="true" />
                {r.label}
                {r.badge && alarms.open > 0 && (
                  <span className={styles.railBadge}>{alarms.open}</span>
                )}
              </button>
            ))}
          </div>

          {/* bottom cluster — pinned to the rail base, never clipped */}
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

      {/* Floating speaker — raised on Playback so it clears the transport bar */}
      <button
        suppressHydrationWarning
        className={`${styles.speaker} ${active === "playback" ? styles.speakerRaised : ""} ${speakerPosition === "left" ? styles.speakerLeft : ""} ${alarms.open > 0 && !muted ? styles.speakerLive : ""}`}
        aria-label={muted ? "Unmute alarm sound" : "Mute alarm sound"}
        style={{ color: muted ? "#94a3b8" : "#dc2626" }}
        onClick={() => { resumeAudio(); setMutedPersist((m) => !m); }}
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
                // "My profile" gets the richer avatar + name treatment.
                if (m.key === "profile") {
                  return (
                    <button
                      key={m.key}
                      className={`${styles.profileItem} ${active === m.key ? styles.profileItemActive : ""}`}
                      onClick={() => go(m.href)}
                    >
                      <span className={styles.profileAvatar}>{initials(user?.name) || "AG"}</span>
                      <span className={styles.profileText}>
                        <span className={styles.profileLabel}>{m.label}</span>
                        <span className={styles.profileName}>{user?.name || "Account"}</span>
                      </span>
                    </button>
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
