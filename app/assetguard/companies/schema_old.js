// This is the ONLY file that changes when you clone this module.
// See SCHEMA-SPEC.md for the full reference — quick version below.

export const CompaniesSchema = {
  entity: 'sites',
  label: 'All sites',
  description: 'Manage all registered locations and their operational status.',
  apiBase: '/api/assetguard/companies',

  fields: [
    // key: DB column name | label: shown on screen | type: drives input + SQL type
    { key: 'primkey', label: 'Primkey', type: 'number', system: true, editable: false, showInList: false },
    { key: 'company_id', label: 'Company Id', type: 'text', system: true, editable: false, showInList: false },
    { key: 'company_name', label: 'Company Name', type: 'text', required: true, searchable: true },
    { key: 'company_code', label: 'Company Code', type: 'text', searchable: true, showInList: false },
    { key: 'phone_number', label: 'Phone Number', type: 'text', searchable: true },
    { key: 'email', label: 'Email', type: 'text', searchable: true, showInList: false  },
    { key: 'address', label: 'Address', type: 'textarea' , showInList: false },
    { key: 'status', label: 'Status', type: 'text', searchable: true },
    { key: 'reg_date', label: 'Reg Date', type: 'datetime', showInList: false },
    { key: 'row_count', label: 'Row Count', type: 'number', computed: true, editable: false, showInList: true, showInList: false },
    // more fields... see SCHEMA-SPEC.md for the full field option list
    // (searchable, showInList, editable, options, priority, db overrides)
  ],

  filters: [
    { key: 'all', label: 'All', query: {} },
  ],

  actions: [
    // { key: 'some_action', label: 'Filter by status', appliesTo: { status: 'x' } },
    // "key" must match a function registered in lib/actionsRegistry.js
  ],

  // Optional: joins enriching each row with data from another table.
  // Same shape as your existing *BatchMutations.js files.
  batchMutations: {
    // "_staff_full_name_staff_id": {
    //   type: "join", table: "staff", link: "staff_id:record_id",
    //   select: { "_staff_full_name_staff_id": "full_name" }
    // },
  },
 // Independent dropdown filters — each maps to engine.setFilterValue(key, value)
 advancedFilters: [
  {
    key: 'region',
    label: 'Regions',
    placeholder: 'All Regions',
    options: [
      { value: 'nairobi', label: 'Nairobi' },
      { value: 'coast', label: 'Coast' },
      { value: 'rift_valley', label: 'Rift Valley' },
    ],
  },
  {
    key: 'status',
    label: 'Status',
    placeholder: 'All Status',
    options: [
      { value: 'live', label: 'Live' },
      { value: 'offline', label: 'Offline' },
      { value: 'maintenance', label: 'Maintenance' },
    ],
  },
],
  // Optional: only needed if permission keys don't follow the
  // view_<entity> / manage_<entity> default.
  // roles: { view: 'view_companies', manage: 'manage_companies' },
};
