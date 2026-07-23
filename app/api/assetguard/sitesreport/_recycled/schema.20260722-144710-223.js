// This is the ONLY file that changes when you clone this module.
// See SCHEMA-SPEC.md for the full reference — quick version below.

export const SitesreportSchema = {
  entity: 'regions',              // DB table name; also drives default role names
                                     // (view_sitesreport / manage_sitesreport) and apiBase
  label: 'Sitesreport',                 // optional, defaults to entity capitalized
  apiBase: '/api/assetguard/sitesreport',

  // Field keys shown as columns in list view, in display order.
  showInList: ['company_id', 'region_name', 'region_code', 'phone_number', 'email', 'address', 'status', 'row_count'],

  fields: [
    // key: DB column name | label: shown on screen | type: drives input + SQL type
    { key: 'primkey', label: 'Primkey', type: 'number', system: true, editable: false },
    { key: 'region_id', label: 'Region Id', type: 'text', system: true, editable: false },
    { key: 'company_id', label: 'Company Id', type: 'text', required: true, searchable: true },
    { key: 'region_name', label: 'Region Name', type: 'text', required: true, searchable: true },
    { key: 'region_code', label: 'Region Code', type: 'text', searchable: true },
    { key: 'phone_number', label: 'Phone Number', type: 'text', searchable: true },
    { key: 'email', label: 'Email', type: 'text', searchable: true },
    { key: 'address', label: 'Address', type: 'textarea' },
    { key: 'status', label: 'Status', type: 'text', searchable: true },
    { key: 'reg_date', label: 'Reg Date', type: 'datetime' },
    { key: 'row_count', label: 'Row Count', type: 'number', computed: true, editable: false },
    // more fields... see SCHEMA-SPEC.md for the full field option list
    // (searchable, editable, options, priority, db overrides)
  ],

  filters: [
    { key: 'all', label: 'All', query: {} },
  ],

  actions: [
    // { key: 'some_action', label: 'Do Something', appliesTo: { status: 'x' } },
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

  // Optional: only needed if permission keys don't follow the
  // view_<entity> / manage_<entity> default.
  // roles: { view: 'view_sitesreport', manage: 'manage_sitesreport' },
};
