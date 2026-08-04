// sidebarConfigPOS.js

export const sidebarConfig = [
  // Products
  {
    type: "submenu",
    label: "Inventory",
    icon: "fa fa-cube",
    roles: [],
    items: [
      { label: "Add Item", href: (routes) => `${routes.cms}/inventory/profile`, roles: [] },
      { label: "All items", href: (routes) => `${routes.cms}/inventory/list`, roles: [] },
      { label: "Products list", href: (routes) => `${routes.cms}/inventory/products`, roles: [] },
      { label: "Service list", href: (routes) => `${routes.cms}/inventory/services`, roles: [] },
      { label: "Import items", href: (routes) => `${routes.cms}/inventory/import`, roles: [] },
    ],
  },

  // Inventory
  {
    type: "submenu",
    label: "Stock history",
    icon: "fa fa-history",
    roles: [],
    items: [
      { label: "Stock history", href: (routes) => `${routes.cms}/stockhistory/list`, roles: [] },
      { label: "Suppliers", href: (routes) => `${routes.cms}/suppliersledger/list`, roles: [] },
      { label: "Restock items", href: (routes) => `${routes.cms}/stockhistory/restock`, roles: [] },
      { label: "Restock history", href: (routes) => `${routes.cms}/stockhistory/purchases`, roles: [] },
      { label: "Stock audit report", href: (routes) => `${routes.cms}/stockaudit/list`, roles: [] },
    ],
  },

  // Sales / POS
  {
    type: "submenu",
    label: "Sales",
    icon: "fa fa-shopping-cart",
    roles: [],
    items: [
      { label: "New Sale", href: (routes) => `${routes.cms}/pos/dry`, roles: [] },
      { label: "Sales History", href: (routes) => `${routes.cms}/saleshistory/list`, roles: [] },
      { label: "Sales Orders", href: (routes) => `${routes.cms}/saleshistory/orderlist`, roles: [] },      
      { label: "Credit Sales", href: (routes) => `${routes.cms}/saleshistory/creditsales`, roles: [] },      
      { label: "Order payments", href: (routes) => `${routes.cms}/orderpayments/list`, roles: [] },    
      { label: "Shift reports", href: (routes) => `${routes.cms}/saleordershifts/list`, roles: [] },    
      { label: "Import sales orders", href: (routes) => `${routes.cms}/salesitems/import`, roles: [] },
    ],
  },

  // Branches
  // {
  //   type: "submenu",
  //   label: "Branches",
  //   icon: "fa fa-building",
  //   roles: [],
  //   items: [
  //     { label: "Branch List", href: (routes) => `${routes.cms}/branches/list`, roles: [] },
  //     { label: "Add Branch", href: (routes) => `${routes.cms}/branches/add`, roles: [] },
  //   ],
  // },

    // Branches
    {
      type: "submenu",
      label: "Accounting",
      icon: "fa fa-briefcase",
      roles: [],
      items: [
        { label: "Shift closing", href: (routes) => `${routes.cms}/banking/list`, roles: [] },
        { label: "Expenses", href: (routes) => `${routes.cms}/expenses/list`, roles: [] },
        { label: "Sales revenue", href: (routes) => `${routes.cms}/saleshistory/orderlist`, roles: [] },
      ],
    },

  // Staff
  {
    type: "submenu",
    label: "Suppliers",
    icon: "fa fa-truck",
    roles: [],
    items: [
      { label: "Suppliers List", href: (routes) => `${routes.cms}/suppliersledger/list`, roles: [] },
      { label: "Add supplier", href: (routes) => `${routes.cms}/suppliersledger/profile`, roles: [] },
      { label: "Import suppliers", href: (routes) => `${routes.cms}/suppliersledger/import`, roles: [] },
    ],
  },

    // 
    {
      type: "submenu",
      label: "Customers",
      icon: "fa fa-users",
      roles: [],
      items: [
        { label: "Client List", href: (routes) => `${routes.cms}/clientlist/list`, roles: [] },
        { label: "Add customer", href: (routes) => `${routes.cms}/clientlist/profile`, roles: [] },
        { label: "Import clients", href: (routes) => `${routes.cms}/clientlist/import`, roles: [] },
      ],
    },

  // Reports
  // {
  //   type: "submenu",
  //   label: "Reports",
  //   icon: "fa fa-bar-chart",
  //   roles: [],
  //   items: [
  //     { label: "Sales Reports", href: (routes) => `${routes.cms}/salesrevenue/list`, roles: [] },
  //     { label: "Inventory Reports", href: (routes) => `${routes.cms}/reports/inventory`, roles: [] },
  //     { label: "Profit & Loss", href: (routes) => `${routes.cms}/pnl`, roles: [] },
  //   ],
  // },

  // Settings
  {
    type: "submenu",
    label: "Settings",
    icon: "fa fa-cogs",
    roles: [],
    items: [
      { label: "Business Profile", href: (routes) => `${routes.cms}/companies/list`, roles: [] },
      { label: "Branches", href: (routes) => `${routes.cms}/branches/list`, roles: [] },
      { label: "Sales points", href: (routes) => `${routes.cms}/salespoints/list`, roles: [] },
      { label: "System Shifts", href: (routes) => `${routes.cms}/systemshifts/list`, roles: [] },
      { label: "System users", href: (routes) => `${routes.cms}/sysusers/list`, roles: [] },
    ],
  },

];
