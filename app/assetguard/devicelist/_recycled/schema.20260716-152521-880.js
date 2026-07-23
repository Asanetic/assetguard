// This is the ONLY file that changes when you clone this module.
// See SCHEMA-SPEC.md for the full reference — quick version below.

export const DevicelistSchema = {
  entity: 'device_list',              // DB table name; also drives default role names
                                     // (view_devicelist / manage_devicelist) and apiBase
  label: 'Devicelist',                 // optional, defaults to entity capitalized
  apiBase: '/api/assetguard/devicelist',

  fields: [
    // key: DB column name | label: shown on screen | type: drives input + SQL type
    { key: 'primkey', label: 'Primkey', type: 'number', system: true, editable: false, showInList: false },
    { key: 'record_id', label: 'Record Id', type: 'text', system: true, editable: false, showInList: false },
    { key: 'device_name', label: 'Device Name', type: 'text', required: true, searchable: true },
    { key: 'date_installed', label: 'Date Installed', type: 'datetime' },
    { key: 'serial_number', label: 'Serial Number', type: 'text', searchable: true },
    { key: 'remark', label: 'Remark', type: 'text', searchable: true },
    { key: 'registered_on', label: 'Registered On', type: 'datetime' },
    { key: 'geofence', label: 'Geofence', type: 'text', searchable: true },
    { key: 'site_id', label: 'Site Id', type: 'text', searchable: true },
    { key: 'site_name', label: 'Site Name', type: 'text', searchable: true },
    { key: 'low_battery_level', label: 'Low Battery Level', type: 'text', searchable: true },
    { key: 'geofence_limit_distance', label: 'Geofence Limit Distance', type: 'text', searchable: true },
    { key: 'device_location', label: 'Device Location', type: 'text', searchable: true },
    { key: 'speed_alert_value', label: 'Speed Alert Value', type: 'text', searchable: true },
    { key: 'device_type', label: 'Device Type', type: 'text', searchable: true },
    { key: 'status', label: 'Status', type: 'text', searchable: true },
    { key: 'last_seen', label: 'Last Seen', type: 'datetime' },
    { key: 'hive_site_id', label: 'Hive Site Id', type: 'text', searchable: true },
    { key: 'hive_site_name', label: 'Hive Site Name', type: 'text', searchable: true },
    { key: 'row_count', label: 'Row Count', type: 'number', computed: true, editable: false, showInList: true },
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
  // roles: { view: 'view_devicelist', manage: 'manage_devicelist' },
};
