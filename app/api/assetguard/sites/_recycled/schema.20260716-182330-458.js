// This is the ONLY file that changes when you clone this module.
// See SCHEMA-SPEC.md for the full reference — quick version below.

export const SitesSchema = {
  entity: 'sites',              // DB table name; also drives default role names
                                     // (view_sites / manage_sites) and apiBase
  label: 'Sites',                 // optional, defaults to entity capitalized
  apiBase: '/api/assetguard/sites',

  fields: [
    // key: DB column name | label: shown on screen | type: drives input + SQL type
    { key: 'primkey', label: 'Primkey', type: 'number', system: true, editable: false, showInList: false },
    { key: 'record_id', label: 'Record Id', type: 'text', system: true, editable: false, showInList: false },
    { key: 'site_name', label: 'Site Name', type: 'text', required: true, searchable: true },
    { key: 'site_code', label: 'Site Code', type: 'text', searchable: true },
    { key: 'country', label: 'Country', type: 'text', searchable: true },
    { key: 'city', label: 'City', type: 'text', searchable: true },
    { key: 'county', label: 'County', type: 'text', searchable: true },
    { key: 'town', label: 'Town', type: 'text', searchable: true },
    { key: 'latitude', label: 'Latitude', type: 'money' },
    { key: 'longitude', label: 'Longitude', type: 'money' },
    { key: 'location_address', label: 'Location Address', type: 'text', searchable: true },
    { key: 'remark', label: 'Remark', type: 'text', searchable: true },
    { key: 'created_on', label: 'Created On', type: 'datetime' },
    { key: 'manager', label: 'Manager', type: 'text', searchable: true },
    { key: 'manager_mobile', label: 'Manager Mobile', type: 'text', searchable: true },
    { key: 'manager_email', label: 'Manager Email', type: 'text', searchable: true },
    { key: 'contact_person', label: 'Contact Person', type: 'text', searchable: true },
    { key: 'contact_person_mobile', label: 'Contact Person Mobile', type: 'text', searchable: true },
    { key: 'contact_person_email', label: 'Contact Person Email', type: 'text', searchable: true },
    { key: 'company_security_manager', label: 'Company Security Manager', type: 'text', searchable: true },
    { key: 'company_security_contacts', label: 'Company Security Contacts', type: 'text', searchable: true },
    { key: 'vendor_contact_person', label: 'Vendor Contact Person', type: 'text', searchable: true },
    { key: 'vendor_contacts', label: 'Vendor Contacts', type: 'text', searchable: true },
    { key: 'response_team_contact_person', label: 'Response Team Contact Person', type: 'text', searchable: true },
    { key: 'response_team_contacts', label: 'Response Team Contacts', type: 'text', searchable: true },
    { key: 'crew_commander_contact_person', label: 'Crew Commander Contact Person', type: 'text', searchable: true },
    { key: 'crew_commander_contacts', label: 'Crew Commander Contacts', type: 'text', searchable: true },
    { key: 'vehicle_registration_number', label: 'Vehicle Registration Number', type: 'text', searchable: true },
    { key: 'alternate_phone_number', label: 'Alternate Phone Number', type: 'text', searchable: true },
    { key: 'vendor', label: 'Vendor', type: 'text', searchable: true },
    { key: 'management_company', label: 'Management Company', type: 'text', searchable: true },
    { key: 'status', label: 'Status', type: 'text', searchable: true },
    { key: 'region', label: 'Region', type: 'text', searchable: true },
    { key: 'smpms_vendor', label: 'Smpms Vendor', type: 'text', searchable: true },
    { key: 'security_company', label: 'Security Company', type: 'text', searchable: true },
    { key: 'response_cluster', label: 'Response Cluster', type: 'text', searchable: true },
    { key: 'assistant_1_name', label: 'Assistant 1 Name', type: 'text', searchable: true },
    { key: 'assistant_1_contacts', label: 'Assistant 1 Contacts', type: 'text', searchable: true },
    { key: 'assistant_2_name', label: 'Assistant 2 Name', type: 'text', searchable: true },
    { key: 'assistant_2_contacts', label: 'Assistant 2 Contacts', type: 'text', searchable: true },
    { key: 'country_manager_name', label: 'Country Manager Name', type: 'text', searchable: true },
    { key: 'country_manager_contacts', label: 'Country Manager Contacts', type: 'text', searchable: true },
    { key: 'regional_manager_name', label: 'Regional Manager Name', type: 'text', searchable: true },
    { key: 'regional_manager_contacts', label: 'Regional Manager Contacts', type: 'text', searchable: true },
    { key: 'response_contact_1_name', label: 'Response Contact 1 Name', type: 'text', searchable: true },
    { key: 'response_contact_1_contacts', label: 'Response Contact 1 Contacts', type: 'text', searchable: true },
    { key: 'response_contact_2_name', label: 'Response Contact 2 Name', type: 'text', searchable: true },
    { key: 'response_contact_2_contacts', label: 'Response Contact 2 Contacts', type: 'text', searchable: true },
    { key: 'response_contact_3_name', label: 'Response Contact 3 Name', type: 'text', searchable: true },
    { key: 'response_contact_3_contacts', label: 'Response Contact 3 Contacts', type: 'text', searchable: true },
    { key: 'noc_company', label: 'Noc Company', type: 'text', searchable: true },
    { key: 'noc_contact_1_name', label: 'Noc Contact 1 Name', type: 'text', searchable: true },
    { key: 'noc_contact_1_contacts', label: 'Noc Contact 1 Contacts', type: 'text', searchable: true },
    { key: 'noc_contact_2_name', label: 'Noc Contact 2 Name', type: 'text', searchable: true },
    { key: 'noc_contact_2_contacts', label: 'Noc Contact 2 Contacts', type: 'text', searchable: true },
    { key: 'noc_contact_3_name', label: 'Noc Contact 3 Name', type: 'text', searchable: true },
    { key: 'noc_contact_3_contacts', label: 'Noc Contact 3 Contacts', type: 'text', searchable: true },
    { key: 'noc_contact_4_name', label: 'Noc Contact 4 Name', type: 'text', searchable: true },
    { key: 'noc_contact_4_contacts', label: 'Noc Contact 4 Contacts', type: 'text', searchable: true },
    { key: 'noc_contact_5_name', label: 'Noc Contact 5 Name', type: 'text', searchable: true },
    { key: 'noc_contact_5_contacts', label: 'Noc Contact 5 Contacts', type: 'text', searchable: true },
    { key: 'additional_sms_recipients', label: 'Additional Sms Recipients', type: 'textarea' },
    { key: 'additional_email_recipients', label: 'Additional Email Recipients', type: 'textarea' },
    { key: 'last_inspection_date', label: 'Last Inspection Date', type: 'datetime' },
    { key: 'hive_site_id', label: 'Hive Site Id', type: 'text', searchable: true },
    { key: 'hive_site_name', label: 'Hive Site Name', type: 'text', searchable: true },
    { key: 'row_count', label: 'Row Count', type: 'number', computed: true, editable: false, showInList: true, searchable: true  },
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
  // roles: { view: 'view_sites', manage: 'manage_sites' },
};
