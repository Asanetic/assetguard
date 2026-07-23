// sidebarConfigPOS.js

export const sidebarConfig = [

  {
    type: "link",
    label: "Dashboard",
    icon: "fa fa-dashboard",
    href: (routes) => `${routes.assettracker}/dashboard/main`,
    roles: []
  },

  {
    type: "submenu",
    label: "Sites",
    icon: "fa fa-map-marker",
    roles: [],
    items: [
      { label: "All Sites", href: (routes) => `${routes.assettracker}/sites/list`, roles: [] },
      { label: "Add Site", href: (routes) => `${routes.assettracker}/sites/profile`, roles: [] },
    ],
  },

  {
    type: "submenu",
    label: "Devices",
    icon: "fa fa-microchip",
    roles: [],
    items: [
      { label: "All Devices", href: (routes) => `${routes.assettracker}/device_list/list`, roles: [] },
      { label: "Register Device", href: (routes) => `${routes.assettracker}/device_list/profile`, roles: [] },
    ],
  },

  {
    type: "submenu",
    label: "GPS Logs",
    icon: "fa fa-location-arrow",
    roles: [],
    items: [
      { label: "Location History", href: (routes) => `${routes.assettracker}/gps_logs/list`, roles: [] },
    ],
  },

  {
    type: "submenu",
    label: "Device Pings",
    icon: "fa fa-heartbeat",
    roles: [],
    items: [
      { label: "Device Pings", href: (routes) => `${routes.assettracker}/device_pings/list`, roles: [] },
    ],
  },

  {
    type: "submenu",
    label: "Alarms",
    icon: "fa fa-exclamation-triangle",
    roles: [],
    items: [
      { label: "Active Alarms", href: (routes) => `${routes.assettracker}/asset_alarms/list`, roles: [] },
      { label: "Alarm History", href: (routes) => `${routes.assettracker}/asset_alarms/history`, roles: [] },
    ],
  },

  {
    type: "submenu",
    label: "Users & Roles",
    icon: "fa fa-users",
    roles: [],
    items: [
      { label: "System Users", href: (routes) => `${routes.assettracker}/system_users/list`, roles: [] },
      { label: "Add User", href: (routes) => `${routes.assettracker}/system_users/profile`, roles: [] },
      { label: "Role Bundles", href: (routes) => `${routes.assettracker}/system_role_bundles/list`, roles: [] },
      { label: "Add Bundle", href: (routes) => `${routes.assettracker}/system_role_bundles/profile`, roles: [] },
      { label: "Bundle Roles", href: (routes) => `${routes.assettracker}/user_bundle_role_functions/list`, roles: [] },
      { label: "User Permissions", href: (routes) => `${routes.assettracker}/user_manifest_/list`, roles: [] },
    ],
  },

  {
    type: "submenu",
    label: "Page Manifest",
    icon: "fa fa-file",
    roles: [],
    items: [
      { label: "Application Pages", href: (routes) => `${routes.assettracker}/page_manifest_/list`, roles: [] },
    ],
  },

  {
    type: "submenu",
    label: "Settings",
    icon: "fa fa-cogs",
    roles: [],
    items: [
      { label: "General Settings", href: (routes) => `${routes.assettracker}/dashboard/settings`, roles: [] },
    ],
  }

];
