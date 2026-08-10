// app/mainapp/admin/settings/components/settingsData.js
// Reference + seed data for the System settings page, ported from the
// prototype (AG_TZ_BY_COUNTRY, AG_LOC_STORE, AG_ORG, AG_CLUSTER_STORE, AG_CFG).
//
// The Locations section is the single place these things are registered; every
// other screen reads them as dropdowns. Timezone is DERIVED from the country,
// never typed.

// Country -> timezone. A country can only be registered if its timezone is
// known here (matches the prototype's addCountry guard).
export const TZ_BY_COUNTRY = {
  Kenya: { tz: "Africa/Nairobi", off: "UTC+03:00", abbr: "EAT" },
  Uganda: { tz: "Africa/Kampala", off: "UTC+03:00", abbr: "EAT" },
  Tanzania: { tz: "Africa/Dar_es_Salaam", off: "UTC+03:00", abbr: "EAT" },
  Rwanda: { tz: "Africa/Kigali", off: "UTC+02:00", abbr: "CAT" },
  Ethiopia: { tz: "Africa/Addis_Ababa", off: "UTC+03:00", abbr: "EAT" },
  Somalia: { tz: "Africa/Mogadishu", off: "UTC+03:00", abbr: "EAT" },
};

export const SEED_COUNTRIES = [
  { name: "Kenya", tz: "Africa/Nairobi", off: "UTC+03:00", abbr: "EAT" },
];

// The 47 counties of Kenya (prototype seed).
export const SEED_COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta", "Garissa",
  "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru", "Tharaka-Nithi", "Embu",
  "Kitui", "Machakos", "Makueni", "Nyandarua", "Nyeri", "Kirinyaga", "Murang'a",
  "Kiambu", "Turkana", "West Pokot", "Samburu", "Trans Nzoia", "Uasin Gishu",
  "Elgeyo-Marakwet", "Nandi", "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado",
  "Kericho", "Bomet", "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu",
  "Homa Bay", "Migori", "Kisii", "Nyamira", "Nairobi",
].map((name) => ({ name, country: "Kenya" }));

export const SEED_DIST_REGIONS = [
  "Nairobi Metro", "Central", "Coast", "Rift Valley", "Western", "Eastern",
  "North Eastern", "Nyanza",
];

export const SEED_SEC_REGIONS = [
  "Nairobi North", "Nairobi South", "Coast", "Rift Valley", "Western",
  "Upper Eastern", "North Eastern",
];

export const SEC_COMPANIES = ["Falcon Guard Ltd", "Shield Response Co.", "Simba Security Group"];

// Response clusters, with a regional manager and control-room contacts.
export const SEED_CLUSTERS = [
  { name: "Cluster A — Nairobi North", company: "Falcon Guard Ltd", rm: "Daniel Kiprop", rmPhones: ["+254 722 300 401"], rmEmails: ["d.kiprop@falconguard.co.ke"] },
  { name: "Cluster B — Nairobi South", company: "Falcon Guard Ltd", rm: "Mercy Achieng", rmPhones: ["+254 722 300 402"], rmEmails: ["m.achieng@falconguard.co.ke"] },
  { name: "Cluster C — Coast", company: "Shield Response Co.", rm: "Brian Otieno", rmPhones: ["+254 722 400 501"], rmEmails: ["b.otieno@shieldresponse.co.ke"] },
  { name: "Cluster D — Rift", company: "Simba Security Group", rm: "Alice Njeri", rmPhones: ["+254 722 500 601"], rmEmails: ["a.njeri@simbasecurity.co.ke"] },
  { name: "Cluster E — Western", company: "Simba Security Group", rm: "Grace Wambui", rmPhones: ["+254 722 500 602"], rmEmails: ["g.wambui@simbasecurity.co.ke"] },
  { name: "Cluster F — Eastern", company: "Shield Response Co.", rm: "James Mwangi", rmPhones: ["+254 722 400 502"], rmEmails: ["j.mwangi@shieldresponse.co.ke"] },
  { name: "Cluster G — North Eastern", company: "Shield Response Co.", rm: "Nancy Wairimu", rmPhones: ["+254 722 400 503"], rmEmails: ["n.wairimu@shieldresponse.co.ke"] },
];

// The client company that owns this system — NOT one of the registered
// companies. One manager + two assistants.
export const SEED_ORG = {
  name: "Symphony Technologies Limited",
  domain: "assetguard.symphony.co.ke",
  country: "Kenya",
  manager: { name: "Jane Wanjiku", phones: ["+254 720 114 880"], emails: ["jane.wanjiku@symphony.co.ke"] },
  assistant1: { name: "Peter Kimani", phones: ["+254 733 902 415"], emails: ["peter.kimani@symphony.co.ke"] },
  assistant2: { name: "Alice Njeri", phones: ["+254 733 902 416"], emails: ["alice.njeri@symphony.co.ke"] },
};

// Runtime configuration (prototype AG_CFG) — how the platform behaves.
export const SEED_CFG = {
  alarms: {
    priorities: [
      { key: "Critical", colour: "#EF4444", escalateMin: 5, autoDispatch: true },
      { key: "High", colour: "#F59E0B", escalateMin: 15, autoDispatch: true },
      { key: "Medium", colour: "#2E6CF5", escalateMin: 60, autoDispatch: false },
      { key: "Low", colour: "#94A3B8", escalateMin: 240, autoDispatch: false },
    ],
    ackWindowMin: 10,
    autoCloseHrs: 24,
    duplicateWindowMin: 5,
    suppressDuringMaintenance: true,
  },
  notify: {
    channels: [
      { key: "Critical", app: true, sms: true, email: true, call: true },
      { key: "High", app: true, sms: true, email: true, call: false },
      { key: "Medium", app: true, sms: false, email: true, call: false },
      { key: "Low", app: true, sms: false, email: false, call: false },
    ],
    quietFrom: "22:00",
    quietTo: "06:00",
    quietOverrideCritical: true,
    retryMin: 10,
    maxRetries: 3,
  },
  devices: {
    uploadIntervalMin: 60,
    heartbeatGraceHrs: 26,
    motionSensitivity: 55,
    offlineAfterHrs: 26,
    lowBatteryPct: 20,
    targetFirmware: "v2.4.1",
    autoStageFirmware: false,
  },
  map: {
    centreLat: -1.2864, centreLng: 36.8172, zoom: 7,
    units: "Metric (km)",
    dateFormat: "DD MMM YYYY",
    timeFormat: "24-hour",
    clusterPins: true,
    showGeofences: true,
  },
  retention: {
    playbackDays: 90,
    alarmHistoryDays: 365,
    auditLogDays: 730,
    exportsDays: 30,
    autoPurge: true,
  },
  security: {
    sessionTimeoutMin: 30,
    require2FA: true,
    passwordMinLen: 12,
    passwordExpiryDays: 90,
    lockoutAttempts: 5,
    allowApiKeys: true,
    ipAllowlist: "",
  },
};

// Location tabs, in order.
export const LOC_TABS = [
  { key: "country", label: "Countries" },
  { key: "county", label: "Counties" },
  { key: "dist", label: "Distribution regions" },
  { key: "sec", label: "Security regions" },
  { key: "cluster", label: "Response clusters" },
];

// Expected spreadsheet columns per location type — shown in the import dialog
// and used to map rows. The first matching header wins; order is a fallback.
export const IMPORT_COLUMNS = {
  country: ["Country"],
  county: ["County", "Country"],
  dist: ["Region name"],
  sec: ["Region name"],
  cluster: ["Cluster name", "Security company", "Regional manager", "Phone(s)"],
};
