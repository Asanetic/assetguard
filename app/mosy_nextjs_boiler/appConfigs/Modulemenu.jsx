// appConfigs/moduleMenu.js
//
// Single source of truth for the app's navigation tree. Import this from
// AssetGuardSidebar.jsx (instead of a local `menu` const) AND from
// app/registry.js (which flattens it for the module-coming-soon page).
// Add/remove modules here only — both places update automatically.

import {
    LayoutDashboard,
    MapPin,
    Cpu,
    BellRing,
    PlayCircle,
    Bell,
    FileText,
    ShieldCog,
    Truck,
    Shield,
  } from "lucide-react";
  import { hiveRoutes } from "./hiveRoutes";
  
  const NAVY = "#14315D";
  const BLUE = "#2E6CF5";
  
  const mainroute = hiveRoutes.assettracker;
  const authroute = hiveRoutes.auth;
  
  export const moduleMenu = [
    // {
    //   key: "dashboard",
    //   label: "Dashboard",
    //   href: `${mainroute}/dashboard`,
    //   icon: LayoutDashboard,
    //   color: BLUE,
    // },
    {
        key: "admin",
        label: "Admin",
        icon: ShieldCog,
        color: NAVY,
        children: [
          { label: "System users", href: `${mainroute}/systemusers/list` },
          { label: "Pending approvals", href: `${mainroute}/pendingapproval/list` },
          { label: "Users and roles", href: `${mainroute}/systemroles/list` },
          { label: "Companies", href: `${mainroute}/companies/list` },
          { label: "Regions", href: `${mainroute}/regions/list` },
          { label: "Clusters", href: `${mainroute}/clusters/list` },
          { label: "Role matrix", href: `${mainroute}/accessmatrix` },
          { label: "Modules", href: `${mainroute}/systemmodules/list` },
        ],
      }, 
      {
        key: "auth",
        label: "Authemtication",
        icon: Shield,
        color: "#EF4444",
        children: [
            { label: "Login", href: `${authroute}/userlogin` },
            { label: "Request access", href: `${authroute}/registration` },
            { label: "Check account status", href: `${authroute}/accstatus` },
            { label: "Request access", href: `${mainroute}/registration` },
        ],
      },

    {
      key: "sites0",
      label: "Sites",
      icon: MapPin,
      color: "#10B981",
      children: [
        { label: "Site map", href: `${mainroute}/sitemap` },
        { label: "All sites", href: `${mainroute}/sites/list` },
        { label: "Add site", href: `${mainroute}/sites/profile` },
      ],
    },
    {
      key: "devices",
      label: "Devices",
      icon: Cpu,
      color: "#F59E0B",
      children: [
        { label: "Devices", href: `${mainroute}/devicemap` },
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


  ];
  
  export default moduleMenu;