// This is the ONLY file that changes when you clone this module.
// See SCHEMA-SPEC.md for the full reference — quick version below.

export const PaymentsSchema = {
  entity: 'payments',              // DB table name; also drives default role names
                                     // (view_payments / manage_payments) and apiBase
  label: 'Payments',                 // optional, defaults to entity capitalized
  apiBase: '/api/assetguard/payments',

  // Field keys shown as columns in list view, in display order.
  showInList: ['supplier_id', 'amount_paid', 'row_count'],

  fields: [
    // key: DB column name | label: shown on screen | type: drives input + SQL type
    { key: 'id', label: 'Id', type: 'number', system: true, editable: false },
    { key: 'record_id', label: 'Record Id', type: 'text', system: true, editable: false },
    { key: 'vendor', label: 'Supplier ', type: 'text', searchable: true , computed: true},
    { key: 'amount_paid', label: 'Amount Paid', type: 'text', searchable: true },
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
  // roles: { view: 'view_payments', manage: 'manage_payments' },
};
