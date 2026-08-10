// app/mainapp/noc/components/nocData.js
// Reference data for the NOC teams page, ported from the prototype's
// AG_MONCO_STORE (monitoring companies + their NOC teams) and
// AG_SECNOC_STORE (each security company's own control-room NOC teams).
//
// A NOC team is a shared control-room desk: a code name, a shared phone and a
// shared email — never a person. It belongs to a company (monitoring OR
// security) and COVERS a set of security regions (empty = country-wide).

export const SEC_REGIONS = [
  "Nairobi North", "Nairobi South", "Coast", "Rift Valley",
  "Western", "Upper Eastern", "North Eastern",
];

// Security companies that also run their own NOC desks.
export const SEC_COMPANIES = ["Falcon Guard Ltd", "Shield Response Co.", "Simba Security Group"];

// Monitoring companies — each has an ordered list of NOC teams.
export const MON_COMPANIES = [
  {
    name: "Sentinel Monitoring Ltd",
    teams: [
      { code: "Sentinel NOC A", covers: ["Nairobi North", "Nairobi South"], phones: ["+254 711 400 101", "+254 711 400 102"], emails: ["noc.day@sentinelmon.co.ke"] },
      { code: "Sentinel NOC B", covers: ["Nairobi North", "Nairobi South"], phones: ["+254 711 400 201", "+254 711 400 202"], emails: ["noc.night@sentinelmon.co.ke"] },
    ],
  },
  {
    name: "Watchtower Control Services",
    teams: [
      { code: "Watchtower NOC 1", covers: ["Coast", "Upper Eastern"], phones: ["+254 712 500 101", "+254 712 500 102"], emails: ["control1@watchtower.co.ke"] },
      { code: "Watchtower NOC 2", covers: ["North Eastern"], phones: ["+254 712 500 201", "+254 712 500 202"], emails: ["control2@watchtower.co.ke"] },
    ],
  },
  {
    name: "Rift Control Centre",
    teams: [
      { code: "Rift NOC Alpha", covers: ["Rift Valley", "Western"], phones: ["+254 713 600 101", "+254 713 600 102"], emails: ["alpha@riftcontrol.co.ke"] },
      { code: "Rift NOC Bravo", covers: [], phones: ["+254 713 600 201"], emails: ["bravo@riftcontrol.co.ke"] },
    ],
  },
];

// Security-company NOC teams, keyed by company.
export const SEC_NOC = {
  "Falcon Guard Ltd": [
    { code: "Falcon NOC Day", covers: ["Nairobi North", "Nairobi South"], phones: ["+254 709 300 410", "+254 709 300 411"], emails: ["noc.day@falconguard.co.ke"] },
    { code: "Falcon NOC Night", covers: ["Nairobi North", "Nairobi South"], phones: ["+254 709 300 420"], emails: ["noc.night@falconguard.co.ke"] },
  ],
  "Shield Response Co.": [
    { code: "Shield NOC 1", covers: ["Coast", "Upper Eastern", "North Eastern"], phones: ["+254 709 400 510", "+254 709 400 511"], emails: ["noc1@shieldresponse.co.ke"] },
    { code: "Shield NOC 2", covers: ["Coast", "Upper Eastern", "North Eastern"], phones: ["+254 709 400 520"], emails: ["noc2@shieldresponse.co.ke"] },
  ],
  "Simba Security Group": [
    { code: "Simba NOC Alpha", covers: ["Rift Valley", "Western"], phones: ["+254 709 500 610", "+254 709 500 611"], emails: ["noc@simbasecurity.co.ke"] },
    { code: "Simba NOC Bravo", covers: ["Rift Valley", "Western"], phones: ["+254 709 500 620"], emails: ["nocnight@simbasecurity.co.ke"] },
  ],
};
