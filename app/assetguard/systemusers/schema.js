// This is the ONLY file that changes when you clone this module.
// See SCHEMA-SPEC.md for the full reference — quick version below.

export const systemusersSchema = {
  entity: 'system_users',              // DB table name; also drives default role names
                                     // (view_systemusers / manage_systemusers) and apiBase
  label: 'Systemusers',                 // optional, defaults to entity capitalized
  apiBase: '/api/assetguard/systemusers',

  fields: [
    // key: DB column name | label: shown on screen | type: drives input + SQL type
    { key: 'name', label: 'Name', type: 'text', required: true, searchable: true },
    { key: 'email', label: 'Email', type: 'text', required: true, searchable: true },
    { key: 'tel', label: 'Tel', type: 'text', required: true, searchable: true },
    { key: 'login_password', label: 'Login Password', type: 'text', required: true, searchable: true },
    { key: 'ref_id', label: 'Ref Id', type: 'text', required: true, searchable: true },
    { key: 'regdate', label: 'Regdate', type: 'datetime', required: true },
    { key: 'user_no', label: 'User No', type: 'text', required: true, searchable: true },
    { key: 'user_pic', label: 'User Pic', type: 'text', required: true, searchable: true },
    { key: 'user_gender', label: 'User Gender', type: 'text', required: true, searchable: true },
    { key: 'last_seen', label: 'Last Seen', type: 'text', required: true, searchable: true },
    { key: 'about', label: 'About', type: 'textarea', required: true },
    { key: 'hive_site_id', label: 'Hive Site Id', type: 'text', required: true, searchable: true },
    { key: 'hive_site_name', label: 'Hive Site Name', type: 'text', required: true, searchable: true },
    { key: 'auth_token', label: 'Auth Token', type: 'text', required: true, searchable: true },
    { key: 'token_status', label: 'Token Status', type: 'text', required: true, searchable: true },
    { key: 'token_expiring_in', label: 'Token Expiring In', type: 'text', required: true, searchable: true },
    { key: 'project_id', label: 'Project Id', type: 'text', required: true, searchable: true },
    { key: 'project_name', label: 'Project Name', type: 'text', required: true, searchable: true },
    { key: 'user_role', label: 'User Role', type: 'text', required: true, searchable: true },
    // more fields... see SCHEMA-SPEC.md for the full field option list
    // (searchable, showInList, editable, options, priority, db overrides)
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
  // roles: { view: 'view_systemusers', manage: 'manage_systemusers' },
};
