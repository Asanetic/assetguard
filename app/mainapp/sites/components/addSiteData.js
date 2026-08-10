// app/mainapp/sites/components/addSiteData.js
// -----------------------------------------------------------------------------
// Reference data + resolver for the Add-site form, ported from the prototype's
// contact hierarchy:
//   Country          -> the client company (national, constant)
//   Security region  -> security-company regional managers + heads, NOC teams
//   Response cluster -> the response team that actually rolls to the site
// Pick a security region and a cluster and everything below fills itself; every
// filled value stays editable for the exceptions.
// -----------------------------------------------------------------------------

export const COUNTRIES = ["Kenya"];

export const COUNTIES = [
  "Mombasa", "Kwale", "Kilifi", "Tana River", "Lamu", "Taita-Taveta",
  "Garissa", "Wajir", "Mandera", "Marsabit", "Isiolo", "Meru",
  "Tharaka-Nithi", "Embu", "Kitui", "Machakos", "Makueni", "Nyandarua",
  "Nyeri", "Kirinyaga", "Murang'a", "Kiambu", "Turkana", "West Pokot",
  "Samburu", "Trans Nzoia", "Uasin Gishu", "Elgeyo-Marakwet", "Nandi",
  "Baringo", "Laikipia", "Nakuru", "Narok", "Kajiado", "Kericho", "Bomet",
  "Kakamega", "Vihiga", "Bungoma", "Busia", "Siaya", "Kisumu", "Homa Bay",
  "Migori", "Kisii", "Nyamira", "Nairobi",
];

export const DIST_REGIONS = [
  "Nairobi Metro", "Central", "Coast", "Rift Valley", "Western",
  "Eastern", "North Eastern", "Nyanza",
];

export const SEC_REGIONS = [
  "Nairobi North", "Nairobi South", "Coast", "Rift Valley",
  "Western", "Upper Eastern", "North Eastern",
];

export const VENDORS = ["SMPMS East Africa", "SMPMS Coast Ltd", "SMPMS Rift Ltd"];

// --- the client company (national — same for every site) ---------------------
export const COMPANY = {
  name: "Symphony Technologies Limited",
  manager:    { name: "Jane Wanjiku", phones: ["+254 720 114 880"], emails: ["jane.wanjiku@symphony.co.ke"] },
  assistant1: { name: "Peter Kimani", phones: ["+254 733 902 415", "+254 720 114 881"], emails: ["peter.kimani@symphony.co.ke"] },
  assistant2: { name: "Alice Njeri",  phones: ["+254 733 902 416"], emails: ["alice.njeri@symphony.co.ke", "ops@symphony.co.ke"] },
};

// --- security companies: country tier + regional tier ------------------------
const SECCO = [
  {
    name: "Falcon Guard Ltd",
    country: {
      opsMgr:  { name: "Samuel Ndungu", phones: ["+254 733 110 001"], emails: ["s.ndungu@falconguard.co.ke"] },
      opsAsst: { name: "Ruth Kamau",    phones: ["+254 733 110 002"], emails: ["r.kamau@falconguard.co.ke"] },
    },
    regions: {
      "Nairobi North": { fieldMgr: { name: "Daniel Kiprop", phones: ["+254 722 300 401"], emails: ["d.kiprop@falconguard.co.ke"] }, fieldAsst: { name: "Eunice Wafula", phones: ["+254 722 300 411"], emails: ["e.wafula@falconguard.co.ke"] } },
      "Nairobi South": { fieldMgr: { name: "Mercy Achieng", phones: ["+254 722 300 402"], emails: ["m.achieng@falconguard.co.ke"] }, fieldAsst: { name: "Victor Omondi", phones: ["+254 722 300 412"], emails: ["v.omondi@falconguard.co.ke"] } },
    },
  },
  {
    name: "Shield Response Co.",
    country: {
      opsMgr:  { name: "Caroline Muthoni", phones: ["+254 733 220 001"], emails: ["c.muthoni@shieldresponse.co.ke"] },
      opsAsst: { name: "Kevin Ouma",       phones: ["+254 733 220 002"], emails: ["k.ouma@shieldresponse.co.ke"] },
    },
    regions: {
      "Coast":         { fieldMgr: { name: "Brian Otieno",  phones: ["+254 722 400 501"], emails: ["b.otieno@shieldresponse.co.ke"] }, fieldAsst: { name: "Halima Said", phones: ["+254 722 400 511"], emails: ["h.said@shieldresponse.co.ke"] } },
      "Upper Eastern": { fieldMgr: { name: "James Mwangi",  phones: ["+254 722 400 502"], emails: ["j.mwangi@shieldresponse.co.ke"] }, fieldAsst: { name: "Fatuma Abdi", phones: ["+254 722 400 512"], emails: ["f.abdi@shieldresponse.co.ke"] } },
      "North Eastern": { fieldMgr: { name: "Nancy Wairimu", phones: ["+254 722 400 503"], emails: ["n.wairimu@shieldresponse.co.ke"] }, fieldAsst: { name: "Ahmed Noor", phones: ["+254 722 400 513"], emails: ["a.noor@shieldresponse.co.ke"] } },
    },
  },
  {
    name: "Simba Security Group",
    country: {
      opsMgr:  { name: "George Kariuki", phones: ["+254 733 330 001"], emails: ["g.kariuki@simbasecurity.co.ke"] },
      opsAsst: { name: "Lydia Chebet",   phones: ["+254 733 330 002"], emails: ["l.chebet@simbasecurity.co.ke"] },
    },
    regions: {
      "Rift Valley": { fieldMgr: { name: "Alice Njeri",  phones: ["+254 722 500 601"], emails: ["a.njeri@simbasecurity.co.ke"] }, fieldAsst: { name: "Joseph Rono",  phones: ["+254 722 500 611"], emails: ["j.rono@simbasecurity.co.ke"] } },
      "Western":     { fieldMgr: { name: "Grace Wambui", phones: ["+254 722 500 602"], emails: ["g.wambui@simbasecurity.co.ke"] }, fieldAsst: { name: "Silas Barasa", phones: ["+254 722 500 612"], emails: ["s.barasa@simbasecurity.co.ke"] } },
    },
  },
];

// --- security-company NOC desks (by security region) -------------------------
const SECNOC = {
  "Falcon Guard Ltd": [
    { code: "Falcon NOC Day",   regions: ["Nairobi North", "Nairobi South"], phones: ["+254 709 300 410", "+254 709 300 411"], emails: ["noc.day@falconguard.co.ke"] },
    { code: "Falcon NOC Night", regions: ["Nairobi North", "Nairobi South"], phones: ["+254 709 300 420"], emails: ["noc.night@falconguard.co.ke"] },
  ],
  "Shield Response Co.": [
    { code: "Shield NOC 1", regions: ["Coast", "Upper Eastern", "North Eastern"], phones: ["+254 709 400 510", "+254 709 400 511"], emails: ["noc1@shieldresponse.co.ke"] },
    { code: "Shield NOC 2", regions: ["Coast", "Upper Eastern", "North Eastern"], phones: ["+254 709 400 520"], emails: ["noc2@shieldresponse.co.ke"] },
  ],
  "Simba Security Group": [
    { code: "Simba NOC Alpha", regions: ["Rift Valley", "Western"], phones: ["+254 709 500 610", "+254 709 500 611"], emails: ["noc@simbasecurity.co.ke"] },
    { code: "Simba NOC Bravo", regions: ["Rift Valley", "Western"], phones: ["+254 709 500 620"], emails: ["nocnight@simbasecurity.co.ke"] },
  ],
};

// --- monitoring companies (per security region) + their NOC teams ------------
const MONCO = [
  {
    name: "Sentinel Monitoring Ltd", regions: ["Nairobi North", "Nairobi South"],
    teams: [
      { code: "Sentinel NOC A", covers: ["Nairobi North", "Nairobi South"], phones: ["+254 711 400 101", "+254 711 400 102"], emails: ["noc.day@sentinelmon.co.ke"] },
      { code: "Sentinel NOC B", covers: ["Nairobi North", "Nairobi South"], phones: ["+254 711 400 201", "+254 711 400 202"], emails: ["noc.night@sentinelmon.co.ke"] },
    ],
  },
  {
    name: "Watchtower Control Services", regions: ["Coast", "Upper Eastern", "North Eastern"],
    teams: [
      { code: "Watchtower NOC 1", covers: ["Coast", "Upper Eastern"], phones: ["+254 712 500 101", "+254 712 500 102"], emails: ["control1@watchtower.co.ke"] },
      { code: "Watchtower NOC 2", covers: ["North Eastern"], phones: ["+254 712 500 201", "+254 712 500 202"], emails: ["control2@watchtower.co.ke"] },
    ],
  },
  {
    name: "Rift Control Centre", regions: ["Rift Valley", "Western"],
    teams: [
      { code: "Rift NOC Alpha", covers: ["Rift Valley", "Western"], phones: ["+254 713 600 101", "+254 713 600 102"], emails: ["alpha@riftcontrol.co.ke"] },
      { code: "Rift NOC Bravo", phones: ["+254 713 600 201"], emails: ["bravo@riftcontrol.co.ke"] },
    ],
  },
];

// --- response clusters + response teams --------------------------------------
export const CLUSTERS = [
  "Cluster A — Nairobi North", "Cluster B — Nairobi South", "Cluster C — Coast",
  "Cluster D — Rift", "Cluster E — Western", "Cluster F — Eastern",
  "Cluster G — North Eastern",
];

const TEAMS = [
  { code: "Bravo 14",  sec: "Nairobi North", clusters: ["Cluster A — Nairobi North"], vehicle: "KDA 123B", phones: ["+254 700 140 014"], emails: ["bravo14@falconguard.co.ke"] },
  { code: "Bravo 7",   sec: "Nairobi North", clusters: ["Cluster B — Nairobi South"], vehicle: "KDG 771C", phones: ["+254 700 140 007"], emails: ["bravo7@falconguard.co.ke"] },
  { code: "Charlie 2", sec: "Nairobi South", clusters: ["Cluster B — Nairobi South"], vehicle: "KCX 220A", phones: ["+254 700 220 002"], emails: ["charlie2@falconguard.co.ke"] },
  { code: "Charlie 9", sec: "Nairobi South", clusters: ["Cluster B — Nairobi South"], vehicle: "KCY 909F", phones: ["+254 700 220 009"], emails: ["charlie9@falconguard.co.ke"] },
  { code: "Whiskey 5", sec: "Coast",         clusters: ["Cluster C — Coast"],          vehicle: "KBZ 505M", phones: ["+254 700 505 005"], emails: ["whiskey5@shieldresponse.co.ke"] },
  { code: "Whiskey 12",sec: "Coast",         clusters: ["Cluster F — Eastern"],        vehicle: "KBQ 812M", phones: ["+254 700 505 012"], emails: ["whiskey12@shieldresponse.co.ke"] },
  { code: "Delta 3",   sec: "Rift Valley",   clusters: ["Cluster D — Rift"],           vehicle: "KDD 303R", phones: ["+254 700 303 003"], emails: ["delta3@simbasecurity.co.ke"] },
  { code: "Echo 8",    sec: "Western",       clusters: ["Cluster E — Western"],        vehicle: "KDE 808W", phones: ["+254 700 808 008"], emails: ["echo8@simbasecurity.co.ke"] },
  { code: "Foxtrot 1", sec: "Upper Eastern", clusters: ["Cluster F — Eastern"],        vehicle: "KDF 101E", phones: ["+254 700 101 001"], emails: ["foxtrot1@shieldresponse.co.ke"] },
  { code: "Golf 6",    sec: "North Eastern", clusters: ["Cluster G — North Eastern"],  vehicle: "KDG 606N", phones: ["+254 700 606 006"], emails: ["golf6@shieldresponse.co.ke"] },
  { code: "Delta 9",   sec: "Rift Valley",   clusters: ["Cluster D — Rift"],           vehicle: "KDD 909R", phones: ["+254 700 303 009"], emails: ["delta9@simbasecurity.co.ke"] },
  { code: "Echo 2",    sec: "Western",       clusters: ["Cluster E — Western"],        vehicle: "KDE 202W", phones: ["+254 700 808 002"], emails: ["echo2@simbasecurity.co.ke"] },
  { code: "Foxtrot 7", sec: "Upper Eastern", clusters: ["Cluster F — Eastern"],        vehicle: "KDF 707E", phones: ["+254 700 101 007"], emails: ["foxtrot7@shieldresponse.co.ke"] },
  { code: "Golf 11",   sec: "North Eastern", clusters: ["Cluster G — North Eastern"],  vehicle: "KDG 611N", phones: ["+254 700 606 011"], emails: ["golf11@shieldresponse.co.ke"] },
];

// --- resolver helpers --------------------------------------------------------
function seccoForRegion(region) {
  if (!region) return null;
  const c = SECCO.find((x) => x.regions[region]);
  if (!c) return null;
  return { company: c.name, country: c.country, region: c.regions[region] || null };
}

function nocTeamsForRegion(region) {
  if (!region) return [];
  const out = [];
  MONCO.forEach((c) => (c.teams || []).forEach((t) => {
    if (!t.covers || t.covers.includes(region)) out.push({ code: t.code, phones: t.phones, emails: t.emails });
  }));
  Object.keys(SECNOC).forEach((co) => SECNOC[co].forEach((t) => {
    if (!t.regions || t.regions.includes(region)) out.push({ code: t.code, phones: t.phones, emails: t.emails });
  }));
  return out;
}

function moncoForRegion(region) {
  if (!region) return null;
  return MONCO.find((c) => (c.regions || []).includes(region)) || null;
}

export function responseTeamsFor(clusterName, region) {
  if (clusterName) return TEAMS.filter((t) => (t.clusters || []).includes(clusterName));
  if (region) return TEAMS.filter((t) => t.sec === region);
  return [];
}

/** Everything the form needs for a security region (+ optional cluster). */
export function resolveSiteContacts(secRegion, clusterName) {
  const secco = seccoForRegion(secRegion);
  const monco = moncoForRegion(secRegion);
  return {
    secco,                                   // { company, country:{opsMgr,opsAsst}, region:{fieldMgr,fieldAsst} }
    secNocTeams: nocTeamsForRegion(secRegion),
    responseTeams: responseTeamsFor(clusterName, secRegion),
    monco,                                   // { name, teams:[...] }
    mncTeams: monco ? monco.teams : [],
  };
}
