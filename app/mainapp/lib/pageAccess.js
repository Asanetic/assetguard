// app/mainapp/lib/pageAccess.js
// ---------------------------------------------------------------------------
// PAGE-LEVEL access control — the single source of truth shared by the nav
// (AppShell hides what you can't open) and the route guard (a direct URL to a
// page you can't open sends you away).
//
// EVERY page in the menu is covered here and appears in Admin > Access control,
// so a role's page set can be built for the whole app. Access is by PAGE only;
// the buttons/actions that must stay restricted keep their own HARD-CODED checks
// in the APIs (requireAdmin, alarmPerms, …) — untouched. So a non-admin can be
// granted, say, the Companies page and see it, but its admin-only API still
// guards the data.
//
// Rules:
//   • Admins (superadmin/admin) open everything — never gated here.
//   • A route with no rule below is UNGATED (fail-open) — there is no menu page
//     like that, so this only ever covers stray/utility URLs, whose sensitive
//     actions are still blocked by their own hard-coded API gates. No silent
//     lock-outs.
// ---------------------------------------------------------------------------

// Nav leaf key -> page module_key. Covers every item in AppShell's RAIL + MENU.
export const NAV_MODULE = {
  // rail
  "rail:sites": "sites_map",
  "rail:devices": "devices_map",
  "rail:alarms": "alarms_map",
  "rail:playback": "playback",
  // dashboard
  dashboard: "dashboard",
  // sites
  all_sites: "sites_all",
  group_sites: "sites_group",
  add_site: "site_add",
  // devices
  all_devices: "devices_all",
  group_devices: "devices_group",
  add_device: "device_add",
  ports: "device_logs",
  tcplogs: "tcplogs",
  simulator: "simulator",
  // alarms
  all_alarms: "alarms_all",
  missed_alarms: "alarms_missed",
  alarmconfig: "alarm_config",
  // playback
  route_playback: "playback",
  playback_exports: "playback_exports",
  // standalone
  notifications: "notifications",
  logs: "heartbeats",
  reports: "reports",
  profile: "profile",
  // admin group children
  users: "users_roles",
  access: "access_control",
  companies: "companies",
  response: "response",
  noc: "noc_teams",
  settings: "settings",
  maps: "google_maps",
  firmware: "firmware",
  messaging: "messaging",
  audit: "audit",
};

// Ordered, longest-prefix-first path rules for the route guard — every menu route.
const ROUTE_RULES = [
  ["/mainapp/sitemaps", "sites_map"],
  ["/mainapp/sites/group", "sites_group"],
  ["/mainapp/sites/add", "site_add"],
  ["/mainapp/sites", "sites_all"],             // incl. /mainapp/sites/view/<id> — viewing a site rolls up to All Sites
  ["/mainapp/devicemap", "devices_map"],
  ["/mainapp/devices/group", "devices_group"],
  ["/mainapp/devices/add", "device_add"],
  ["/mainapp/devices", "devices_all"],         // incl. /mainapp/devices/view/<id> — rolls up to All Devices
  ["/mainapp/ports", "device_logs"],
  ["/mainapp/tcplogs", "tcplogs"],
  ["/mainapp/simulator", "simulator"],
  ["/mainapp/alarmmaps", "alarms_map"],
  ["/mainapp/alarmconfig", "alarm_config"],
  ["/mainapp/alarms/missed", "alarms_missed"],
  ["/mainapp/alarms", "alarms_all"],           // /mainapp/alarms and /mainapp/alarms/<id>
  ["/mainapp/playbackmap", "playback"],
  ["/mainapp/playback/exports", "playback_exports"],
  ["/mainapp/playback", "playback"],
  ["/mainapp/response", "response"],
  ["/mainapp/notifications", "notifications"],
  ["/mainapp/logs", "heartbeats"],
  ["/mainapp/reports", "reports"],
  ["/mainapp/dashboard", "dashboard"],
  ["/mainapp/profile", "profile"],
  ["/mainapp/noc", "noc_teams"],
  ["/mainapp/admin/users", "users_roles"],
  ["/mainapp/admin/access", "access_control"],
  ["/mainapp/admin/companies", "companies"],
  ["/mainapp/admin/settings", "settings"],
  ["/mainapp/admin/maps", "google_maps"],
  ["/mainapp/admin/firmware", "firmware"],
  ["/mainapp/admin/messaging", "messaging"],
  ["/mainapp/admin/audit", "audit"],
];

const isAdmin = (access) =>
  access?.all || ["superadmin", "admin"].includes(String(access?.role || "").toLowerCase());

/**
 * The page module_key that governs a path, or undefined when the path is ungated.
 * Alarm detail (/mainapp/alarms/<id>) rolls up to the All Alarms grant.
 */
export function moduleForPath(pathname = "") {
  const p = String(pathname || "").split("?")[0].replace(/\/+$/, "") || "/";
  for (const [prefix, mod] of ROUTE_RULES) {
    if (p === prefix || p.startsWith(prefix + "/")) return mod;
  }
  return undefined; // no rule → ungated
}

/**
 * Whether a viewer may open a page.
 * @param {{all?:boolean, pages?:string[], role?:string}} access  from /permissions/mine
 */
export function canOpenPath(pathname, access) {
  if (isAdmin(access)) return true;
  const mod = moduleForPath(pathname);
  if (!mod) return true;                            // ungated
  const pages = Array.isArray(access?.pages) ? access.pages : [];
  return pages.includes(mod);
}

/** Whether a nav leaf (by its key) should be shown to this viewer. */
export function canSeeNav(navKey, access) {
  if (isAdmin(access)) return true;
  const mod = NAV_MODULE[navKey];
  if (!mod) return true;                            // unmapped leaf → always shown
  const pages = Array.isArray(access?.pages) ? access.pages : [];
  return pages.includes(mod);
}
