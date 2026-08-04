import {
    LayoutDashboard,
    MapPin,
    Cpu,
    BellRing,
    PlayCircle,
    Bell,
    FileText,
    ShieldCog,
  } from "lucide-react";
  
  /**
   * Mirrors the drawer / rail menu structure from the AssetGuard prototype:
   * Dashboard, Sites, Devices, Alarms (badged), Playback, Notifications,
   * Device logs, Admin. "My profile" and "Log out" render separately
   * in the component footer, same as the prototype.
   *
   * Each item is either a direct link (`href`) or a group (`children`).
   */
  export const assetGuardNav = [
    {
      key: "dashboard",
      label: "Dashboard",
      href: "/dashboard",
      icon: LayoutDashboard,
      iconColor: "#2E6CF5",
    },
    {
      key: "sites",
      label: "Sites",
      icon: MapPin,
      iconColor: "#10B981",
      children: [
        { label: "All sites", href: "/sites" },
        { label: "Group sites", href: "/sites/groups" },
        { label: "Add site", href: "/sites/new" },
      ],
    },
    {
      key: "devices",
      label: "Devices",
      icon: Cpu,
      iconColor: "#F59E0B",
      children: [
        { label: "All devices", href: "/devices" },
        { label: "Add device", href: "/devices/new" },
        { label: "Device types", href: "/devices/types" },
      ],
    },
    {
      key: "alarms",
      label: "Alarms",
      icon: BellRing,
      iconColor: "#EF4444",
      children: [
        { label: "Active alarms", href: "/alarms" },
        { label: "Alarm history", href: "/alarms/history" },
        { label: "Alarm rules", href: "/alarms/rules" },
      ],
    },
    {
      key: "playback",
      label: "Playback",
      icon: PlayCircle,
      iconColor: "#8B5CF6",
      children: [
        { label: "Recordings", href: "/playback/recordings" },
        { label: "Live view", href: "/playback/live" },
        { label: "Exports", href: "/playback/exports" },
      ],
    },
    {
      key: "notifications",
      label: "Notifications",
      href: "/notifications",
      icon: Bell,
      iconColor: "#0EA5E9",
    },
    {
      key: "device-logs",
      label: "Device logs",
      href: "/device-logs",
      icon: FileText,
      iconColor: "#64748B",
    },
    {
      key: "admin",
      label: "Admin",
      icon: ShieldCog,
      iconColor: "#14315D",
      children: [
        { label: "Pending approvals", href: "/admin/pending-approvals" },
        { label: "Users and roles", href: "/admin/users-roles" },
        { label: "Companies", href: "/admin/companies" },
        { label: "System settings", href: "/admin/settings" },
        { label: "Audit logs", href: "/admin/audit-logs" },
      ],
    },
  ];