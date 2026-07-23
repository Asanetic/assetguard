// This is the ONLY file that changes when you clone this module.
// See SCHEMA-SPEC.md for the full reference — quick version below.

export const CompaniesSchema = {
  entity: 'sites',
  label: 'Sites',
  apiBase: '/api/assetguard/sites',

  //first 7 columns start with row count skip field 0 and 1 
  showInList: ['row_count', 'site_name', 'site_code', 'total_devices', 'country', 'city', 'county', 'town', 'latitude'],

  // Custom action Dropdowns for the list ui eg activate account
  rowLinks: [
    //{ key: 'view_payment_history', label: 'Payment History', icon: 'money' },
    //{ key: 'activate_user_account', label: 'Activate Account', icon: 'check-circle', type: 'action' },
   ],

  // ---- PROFILE-LEVEL BUTTONS ----
  // This is the plug-and-play piece. CompaniesProfile.jsx never hardcodes
  // a single onClick — it just loops this array and calls a.onClick,
  // which useEntityFormController resolves for you:
  //   { key: 'delete' }            -> built-in: confirm() + form.remove()
  //   { key: 'clone' }             -> built-in: form.cloneRecord()
  //   { navigateTo: '/path'|fn }   -> pure router.push, no registry entry needed
  //   { key: '<anythingElse>' }    -> routes through actionsRegistry.js —
  //                                    the SAME registry your grid's
  //                                    rowLinks already use (activate_account,
  //                                    disable_account, view_payment_history...)
  // `editOnly: true` hides the button on the "New Site" (no id) screen.
  // Swap this array (or point a different schema at the same
  // Profile.jsx and the button set changes with zero template edits.
  //required actions back to list , new , delete , clone
  profileActions: [
    { key: 'back', label: 'Back to list', icon: 'arrow-left', variant: 'outline-secondary', navigateTo: '/assetguard/companies/list' },
    { key: 'view_on_map', label: 'View on map', icon: 'map', variant: 'outline-secondary', editOnly: true },
    { key: 'activate_acdcount', label: 'Activate achananayo', icon: 'check-circle', variant: 'outline-success', editOnly: true },
    { key: 'renewsub', label: 'Renew sub', icon: 'copy', variant: 'outline-success', editOnly: true },
    { key: 'disable_account', label: 'Disable', icon: 'ban', variant: 'outline-warning', editOnly: true },
    { key: 'clone', label: 'Clone Record', icon: 'copy', variant: 'outline-secondary', editOnly: true },
    { key: 'delete', label: 'Delete', icon: 'trash', variant: 'outline-danger', confirm: 'Are you sure you want to delete this site?', editOnly: true },
    { key: 'new', label: 'New Site', icon: 'plus', variant: 'outline-danger', navigateTo: '/assetguard/companies/profile' },
    { key: 'filterByDate', label: 'Filter by date', icon: 'calendar', variant: 'outline-primary' },

  ],

  //these are action buttons that will appear on top of the list ui eg filter by date send to all etc 
  actions: [
    { key: 'activate_account', label: 'Activate Account', icon: 'check-circle', variant: 'outline-primary' },
    { key: 'filterByDate', label: 'Filter by date', icon: 'calendar', variant: 'outline-primary' },
    // { key: 'some_action', label: 'Do Something', appliesTo: { status: 'x' } },
  ],

  // Linked-contact rows (name -> auto-filled phone/email). Requires each
  // *_name field to have matching *_phone/*_email sibling fields — NOT
  // enabled below yet since your real fields still store phone+email
  // combined in one *_contacts field. Split those columns before turning
  // this on, or the name dropdown will fire but phone/email will stay blank.
  fieldGroups: [
    // {
    //   key: 'response_team_linked',
    //   label: 'Response contacts',
    //   icon: 'headset',
    //   rows: [
    //     { nameField: 'response_contact_1_name', phoneField: 'response_contact_1_phone', emailField: 'response_contact_1_email', label: 'Response 1', required: true },
    //   ],
    // },
  ],

  // Plain grouped-field layout (profile). Matches
  // Profile.jsx's section breakdown 1:1.
  //pick first 7 columns skip 0 and 1 i.e primkey and record_id put it under basic information label dump the rest on other details
  sections: [
    {
      key: 'site_details',
      label: 'Site Details',
      columns: 3,
      fields: ['site_name', 'site_code',"manager"],
    },
    {
      key: 'manager_contact',
      label: 'Manager And Contact Person',
      columns: 3,
      fields: ['management_company', 'manager', 'manager_mobile', 'manager_email', 'contact_person', 'contact_person_mobile', 'contact_person_email'],
    },
    {
      key: 'security_vendor',
      label: 'Company Security & Vendor',
      columns: 3,
      fields: ['vendor', 'vendor_contact_person', 'vendor_contacts', 'company_security_manager', 'company_security_contacts'],
    },
    {
      key: 'response_team',
      label: 'Response Team',
      columns: 3,
      fields: ['response_team_contact_person', 'response_team_contacts', 'crew_commander_contact_person', 'crew_commander_contacts', 'vehicle_registration_number', 'alternate_phone_number'],
    },
    {
      key: 'location',
      label: 'Location Details',
      columns: 3,
      fields: ['country', 'county', 'town', 'location_address', 'latitude', 'longitude', 'total_devices', 'remark'],
    },
  ],

  // Column fields for all 
  fields: [
    // key: DB column name | label: shown on screen | type: drives input + SQL type
    { key: 'row_count', label: '#', type: 'number', computed: true, editable: false },
    { key: 'primkey', label: 'Primkey', type: 'number', system: true, editable: false, primkey: true },
    { key: 'record_id', label: 'Record Id', type: 'text', system: true, editable: false },
    { key: 'site_name', label: 'Site Name', type: 'text', required: true, searchable: true, title: true },
    { key: 'total_devices', label: 'Total devices', type: 'text', searchable: true, computed: true, sum: true },
    { key: 'site_code', label: 'Site Code', type: 'text', searchable: true, title: true },

    // Dropdowns — distinct-values pattern, matches legacy SmartDropdown usage
    { key: 'country', label: 'Country', title: true, type: 'groupedSelect', endpoint: '/api/assetguard/sites', groupByField: 'country', searchable: true },
    { key: 'city', label: 'City', type: 'text', searchable: true },
    { key: 'county', label: 'County', type: 'groupedSelect', endpoint: '/api/assetguard/sites', groupByField: 'county', searchable: true },
    { key: 'town', label: 'Distribution region', type: 'groupedSelect', endpoint: '/api/assetguard/sites', groupByField: 'town', searchable: true },

    { key: 'latitude', label: 'Latitude', type: 'money' },
    { key: 'longitude', label: 'Longitude', type: 'money' },
    { key: 'location_address', label: 'Address description', type: 'text', searchable: true, colSpan: 3 },
    { key: 'remark', label: 'Remark / Notes', type: 'textarea', searchable: true, colSpan: 3 },
    { key: 'created_on', label: 'Created On', type: 'datetime' },
    { key: 'manager', label: 'Manager', type: 'text', searchable: true },
    { key: 'manager_mobile', label: 'Manager Mobile', type: 'text', searchable: true },
    { key: 'manager_email', label: 'Manager Email', type: 'text', searchable: true },
    { key: 'contact_person', label: 'Contact Person', type: 'text', searchable: true },
    { key: 'contact_person_mobile', label: 'Contact Person Mobile', type: 'text', searchable: true },
    { key: 'contact_person_email', label: 'Contact Person Email', type: 'text', searchable: true },
    { key: 'company_security_manager', label: 'Security Manager', type: 'text', searchable: true },
    { key: 'company_security_contacts', label: 'Security Manager contacts', type: 'text', searchable: true },
    { key: 'vendor_contact_person', label: 'Vendor contact person', type: 'text', searchable: true },
    { key: 'vendor_contacts', label: 'Vendor contacts', type: 'text', searchable: true },
    { key: 'response_team_contact_person', label: 'Response Team Contact Person', type: 'text', searchable: true },
    { key: 'response_team_contacts', label: 'Response Team Contacts', type: 'text', searchable: true },
    { key: 'crew_commander_contact_person', label: 'Crew Commander Contact Person', type: 'text', searchable: true },
    { key: 'crew_commander_contacts', label: 'Crew Commander Contacts', type: 'text', searchable: true },
    // ⚠️ legacy RegisteredsitesProfile.jsx writes to "vehicle_reg_number" —
    // confirm which key matches the real DB column before shipping this.
    { key: 'vehicle_registration_number', label: 'Vehicle Reg Number', type: 'text', searchable: true },
    { key: 'alternate_phone_number', label: 'Alternate Phone Number', type: 'text', searchable: true },
    { key: 'vendor', label: 'Vendor company', type: 'groupedSelect', endpoint: '/api/assetguard/sites', groupByField: 'vendor', searchable: true },
    { key: 'management_company', label: 'Company', type: 'groupedSelect', endpoint: '/api/assetguard/sites', groupByField: 'management_company', searchable: true },
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
  ],

  filters: [
    { key: 'all', label: 'All', query: {} },
  ],

  // Bulk grid-toolbar actions (unrelated to profileActions above — these
  // target a filtered set of rows from the LIST view, e.g. "SMS all inactive").
  // TestGrid renders one button per entry here, styled via `variant`
  // (same vocabulary as profileActions: outline-success/outline-warning/
  // outline-danger/dark) and wired straight to actionsRegistry.js via
  // g.runAction(key) — the same registry rowLinks/profileActions use.

  batchMutations: {
    // "_staff_full_name_staff_id": {
    //   type: "join", table: "staff", link: "staff_id:record_id",
    //   select: { "_staff_full_name_staff_id": "full_name" }
    // },
  },

  // roles: { view: 'view_sites', manage: 'manage_sites' },
};