"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  LayoutDashboard,
  MapPin,
  Cpu,
  BellRing,
  PlayCircle,
  Bell,
  FileText,
  ShieldCog,
} from "lucide-react";
import { Brand } from "./AssetGuard/Brand";
import { hiveRoutes } from "../appConfigs/hiveRoutes";
import { destroyAppSession } from "../auth/AuthUtils";

const NAVY = "#14315D";
const BLUE = "#2E6CF5";
const RAIL_WIDTH = 80;
const DRAWER_WIDTH = 280;
// Height of the top bar shown in place of the rail on mobile (< md breakpoint).
const MOBILE_BAR_HEIGHT = 56;

const mainroute = hiveRoutes.assettracker

/**
 * Full labeled menu shown in the drawer. Matches the prototype's
 * #awcDrawer / #aweDrawer structure: Dashboard, then expandable
 * Sites / Devices / Alarms / Playback groups, then flat Notifications
 * and Device logs, then Admin (also expandable). Profile + Log out
 * render separately in the drawer footer.
 */
const menu = [
  {
    key: "dashboard",
    label: "Dashboard",
    href: `${mainroute}/dashboard`,
    icon: LayoutDashboard,
    color: BLUE,
  },
  {
    key: "sites0",
    label: "Sites",
    icon: MapPin,
    color: "#10B981",
    children: [
      { label: "All sites", href: `${mainroute}/sites/list` },
      { label: "Group sites", href: `${mainroute}/sites/#` },
      { label: "Add site", href: `${mainroute}/sites/profile` },
    ],
  },
  {
    key: "devices",
    label: "Devices",
    icon: Cpu,
    color: "#F59E0B",
    children: [
      { label: "All devices", href: `${mainroute}/devices/list` },
      { label: "Add device", href: `${mainroute}/devices/profile` },
    ],
  },
  {
    key: "alarms",
    label: "Alarms",
    icon: BellRing,
    color: "#EF4444",
    children: [
      { label: "Active alarms", href: `${mainroute}/alarms/active` },
      { label: "Alarm history", href: `${mainroute}/alarms/list` },
    ],
  },
  {
    key: "playback",
    label: "Playback",
    icon: PlayCircle,
    color: "#8B5CF6",
    children: [
      { label: "Recordings", href: `${mainroute}/playback/recordings` },
      { label: "Live view", href: `${mainroute}/playback/live` },
      { label: "Exports", href: `${mainroute}/playback/exports` },
    ],
  },
  {
    key: "notifications",
    label: "Notifications",
    href: `${mainroute}/notifications`,
    icon: Bell,
    color: "#0EA5E9",
  },
  {
    key: "device-logs",
    label: "Device logs",
    href: `${mainroute}/device-logs`,
    icon: FileText,
    color: "#64748B",
  },
  {
    key: "admin",
    label: "Admin",
    icon: ShieldCog,
    color: NAVY,
    children: [
      { label: "Pending approvals", href: `${mainroute}/systemusers/list` },
      { label: "Users and roles", href: `${mainroute}/admin/users-roles` },
      { label: "Companies", href: `${mainroute}/companies/list` },
      { label: "System settings", href: `${mainroute}/#` },
      { label: "Audit logs", href: `${mainroute}/##` },
    ],
  },
];

const railItems = [
  {
    key: "sites",
    href: `${mainroute}/sites`,
    icon: MapPin,
    label: "Sites",
  },
  {
    key: "devices",
    href: `${mainroute}/devices`,
    icon: Cpu,
    label: "Devices",
  },
  {
    key: "alarms",
    href: `${mainroute}/alarms`,
    icon: BellRing,
    label: "Alarms",
    showBadge: true,
  },
  {
    key: "playback",
    href: `${mainroute}/playback`,
    icon: PlayCircle,
    label: "Playback",
  },
];



// Fixed-width box every drawer row's icon sits in, so labels line up
// regardless of each lucide icon's actual glyph width — this, plus the
// shared rowStyle/rowClass below, is what keeps the drawer rows from
// looking ragged/inconsistent.
const DRAWER_ICON_BOX = 22;
const DRAWER_ROW_PAD_X = 12; // px, left inset of each drawer row
const DRAWER_ROW_GAP = 8; // px, gap between icon box and label

export function AssetGuardSidebar({
  user = { name: "Jane Wanjiku", role: "Administrator", initials: "JW" },
  alarmCount = 0,
  onLogout,
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState({ sites: true });

  const isActive = (href) =>
    !!href && (pathname === href || pathname?.startsWith(href + "/"));

  const toggleGroup = (key) =>
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <>
      {/* 1a. Mobile top bar — replaces the rail below the md breakpoint */}
      <header
        className="d-flex d-md-none align-items-center justify-content-between position-fixed top-0 start-0 w-100 px-2"
        style={{ height: MOBILE_BAR_HEIGHT, backgroundColor: NAVY, zIndex: 1040 }}
      >
        <button
          type="button"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          onClick={() => setDrawerOpen((v) => !v)}
          className="btn p-2 text-white border-0"
          style={{ textDecoration: "none", lineHeight: 0 }}
        >
          {drawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <Brand variant="compact" />

        <Link
          href="/alarms"
          aria-label="Alarms"
          className="d-flex p-2 align-items-center justify-content-center position-relative text-decoration-none"
          style={{ color: "#AEC3E4" }}
        >
          <BellRing size={20} />
          {alarmCount > 0 && (
            <span
              className="badge rounded-pill bg-danger text-white position-absolute"
              style={{ top: 0, right: 0, fontSize: 8, padding: "2px 5px" }}
            >
              {alarmCount}
            </span>
          )}
        </Link>
      </header>

      {/* 1b. Persistent mini rail — visible from the md breakpoint up */}
      <aside
        className="d-none d-md-flex flex-column align-items-center position-fixed top-0 start-0 vh-100 py-3"
        style={{ width: RAIL_WIDTH, backgroundColor: NAVY, zIndex: 1040 }}
      >
        {/* <div className="mb-3">
          <Brand variant="rail" />
        </div> */}

        <button
          type="button"
          aria-label={drawerOpen ? "Close menu" : "Open menu"}
          onClick={() => setDrawerOpen((v) => !v)}
          className="btn p-2 mb-3 text-white border-0"
          style={{ textDecoration: "none", lineHeight: 0 }}
        >
          {drawerOpen ? <X size={22} /> : <Menu size={22} />}
        </button>

        <nav className="d-flex flex-column align-items-center w-100 gap-2">
          {railItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.key}
                href={item.href}
                title={item.label}
                className="d-flex flex-column mb-2 align-items-center justify-content-center position-relative text-decoration-none"
                style={{
                  width: RAIL_WIDTH - 16,
                  padding: "8px 2px",
                  borderRadius: 10,
                  backgroundColor: active ? BLUE : "transparent",
                  color: active ? "#FFFFFF" : "#AEC3E4",
                }}
              >
                <Icon size={22} strokeWidth={2} />
                <span
                  className="text-center mt-1 mb-2"
                  style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.15 }}
                >
                  {item.label}
                </span>
                {item.showBadge && alarmCount > 0 && (
                  <span
                    className="badge rounded-pill bg-danger text-white position-absolute"
                    style={{ top: 2, right: 4, fontSize: 8, padding: "2px 5px" }}
                  >
                    {alarmCount}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>

      {/* 2. Backdrop for the drawer */}
      {drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          className="position-fixed top-0 start-0 vh-100 w-100"
          style={{ backgroundColor: "rgba(15,23,42,.45)", zIndex: 1044 }}
        />
      )}

      {/* 3. Full labeled drawer — slides out beside the rail (desktop) or
             from the screen edge (mobile). Capped with maxWidth so it never
             overflows narrow phone viewports. */}
      <aside
        className="d-flex flex-column position-fixed top-0 vh-100 bg-white shadow"
        style={{
          left: "1px",
          width: DRAWER_WIDTH,
          maxWidth: "88vw",
          zIndex: 1045,
          transform: drawerOpen ? "translateX(0)" : `translateX(-${DRAWER_WIDTH + 20}px)`,
          transition: "transform .25s ease",
        }}
      >
        <div
          className="d-flex align-items-center px-3 py-3 text-white flex-shrink-0"
          style={{ backgroundColor: NAVY }}
        >
          <Brand variant="drawer" />
        </div>

        <nav className="d-flex flex-column gap-1 p-2 overflow-auto flex-grow-1">
        {menu.map((item) => {
            const Icon = item.icon;
            const hasChildren = !!item.children?.length;
            const open = !!openGroups[item.key];
            const active =
                isActive(item.href) || item.children?.some((c) => isActive(c.href));
            const badge = item.key === "alarms" ? alarmCount : undefined;

            const rowContent = (
                <>
                  <span
                    className="d-flex flex-shrink-0 align-items-center justify-content-center"
                    style={{ width: DRAWER_ICON_BOX }}
                  >
                    <Icon size={17} style={{ color: item.color }} />
                  </span>
                  <span
                    className="text-truncate mx-3"
                    style={{ fontSize: 14, fontWeight: 600, minWidth: 0, flex: "1 1 auto", textAlign: "left" }}
                    >
                    {item.label}
                    </span>
              
                  {/* badge + chevron always grouped at the far right, in normal flow */}
                  <span className="">
                    {!!badge && (
                      <span
                        className="badge rounded-pill text-white bg-danger mx-3 fw-normal"
                        style={{ fontSize: 10, padding: "4px 7px" }}
                      >
                        {badge}
                      </span>
                    )}
                    {hasChildren && (
                      <ChevronDown
                        size={14}
                        className="text-muted"
                        style={{
                          transition: "transform .15s ease",
                          transform: open ? "rotate(180deg)" : "none",
                        }}
                      />
                    )}
                  </span>
                </>
              );

            const rowClass = `d-flex align-items-center gap-3 rounded-3 fw-semibold text-decoration-none border-0 bg-transparent w-100 text-start ${
                active ? "text-primary" : "text-secondary-emphasis"
            }`;
            const rowStyle = { padding: "10px 14px" };

            if (!hasChildren) {
                return (
                <Link
                    key={item.key}
                    href={item.href}
                    onClick={() => setDrawerOpen(false)}
                    className={`${rowClass} ${active ? "bg-primary-subtle" : ""}`}
                    style={rowStyle}
                >
                    {rowContent}
                </Link>
                );
            }

            return (
                <div key={item.key}>
                <button
                    type="button"
                    onClick={() => toggleGroup(item.key)}
                    className={rowClass}
                    style={rowStyle}
                >
                    {rowContent}
                </button>

                {open && (
                    <div
                    className="d-flex flex-column gap-1 border-start pb-1"
                    style={{
                        marginLeft: DRAWER_ROW_PAD_X + DRAWER_ICON_BOX + DRAWER_ROW_GAP,
                        paddingLeft: 14,
                    }}
                    >
                    {item.children.map((child) => (
                        <Link
                        key={child.href}
                        href={child.href}
                        onClick={() => setDrawerOpen(false)}
                        className={`text-decoration-none small py-2 ${
                            isActive(child.href) ? "fw-bold text-primary" : "text-muted"
                        }`}
                        style={{ paddingLeft: 12 }}
                        >
                        {child.label}
                        </Link>
                    ))}
                    </div>
                )}
                </div>
            );
            })}
        </nav>

        <div className="border-top p-2 flex-shrink-0">
          <Link
            href="/profile"
            onClick={() => setDrawerOpen(false)}
            className="d-flex align-items-center gap-2 rounded px-2 py-2 text-decoration-none"
          >
            <span
              className="d-flex flex-shrink-0 pt-1 align-items-center justify-content-center text-white fw-bold"
              style={{ borderRadius: "50%", width: 28, height: 28, fontSize: 11, backgroundColor: BLUE }}
            >
              {user.initials}
            </span>
            <span className="min-w-0 mx-1">
              <span className="d-block text-truncate fw-semibold text-dark small">My profile</span>
              <span className="d-block text-truncate text-muted" style={{ fontSize: 11 }}>
                {user.name} — {user.role}
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => destroyAppSession()}
            className="btn d-flex w-100 align-items-center gap-2 rounded fw-semibold px-3 py-2 border-0 text-danger"
          >
            <LogOut size={17} className="flex-shrink-0" />
            Log out
          </button>
        </div>
      </aside>
    </>
  );
}

/** Fixed width of the persistent rail, in px — import this to offset page content on desktop (>= md). */
AssetGuardSidebar.RAIL_WIDTH = RAIL_WIDTH;
/** Height of the mobile top bar, in px — import this to offset page content on mobile (< md). */
AssetGuardSidebar.MOBILE_BAR_HEIGHT = MOBILE_BAR_HEIGHT;