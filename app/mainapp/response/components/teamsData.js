// app/mainapp/response/components/teamsData.js
// Reference data for the Response teams page (ported from the prototype's
// AG_TEAM_STORE / AG_CLUSTER_STORE). A team is a vehicle + shared phone + email.

export const SEC_REGIONS = [
  "Nairobi North", "Nairobi South", "Coast", "Rift Valley",
  "Western", "Upper Eastern", "North Eastern",
];

export const CLUSTERS = [
  "Cluster A — Nairobi North", "Cluster B — Nairobi South", "Cluster C — Coast",
  "Cluster D — Rift", "Cluster E — Western", "Cluster F — Eastern",
  "Cluster G — North Eastern",
];

export const COMPANIES = ["Falcon Guard Ltd", "Shield Response Co.", "Simba Security Group"];

export const SEED_TEAMS = [
  { code: "Bravo 14",  sec: "Nairobi North", clusters: ["Cluster A — Nairobi North"], vehicle: "KDA 123B", phones: ["+254 700 140 014"], emails: ["bravo14@falconguard.co.ke"], company: "Falcon Guard Ltd" },
  { code: "Bravo 7",   sec: "Nairobi North", clusters: ["Cluster B — Nairobi South"], vehicle: "KDG 771C", phones: ["+254 700 140 007"], emails: ["bravo7@falconguard.co.ke"], company: "Falcon Guard Ltd" },
  { code: "Charlie 2", sec: "Nairobi South", clusters: ["Cluster B — Nairobi South"], vehicle: "KCX 220A", phones: ["+254 700 220 002"], emails: ["charlie2@falconguard.co.ke"], company: "Falcon Guard Ltd" },
  { code: "Charlie 9", sec: "Nairobi South", clusters: ["Cluster B — Nairobi South"], vehicle: "KCY 909F", phones: ["+254 700 220 009"], emails: ["charlie9@falconguard.co.ke"], company: "Falcon Guard Ltd" },
  { code: "Whiskey 5", sec: "Coast",         clusters: ["Cluster C — Coast"],          vehicle: "KBZ 505M", phones: ["+254 700 505 005"], emails: ["whiskey5@shieldresponse.co.ke"], company: "Shield Response Co." },
  { code: "Whiskey 12",sec: "Coast",         clusters: ["Cluster F — Eastern"],        vehicle: "KBQ 812M", phones: ["+254 700 505 012"], emails: ["whiskey12@shieldresponse.co.ke"], company: "Shield Response Co." },
  { code: "Delta 3",   sec: "Rift Valley",   clusters: ["Cluster D — Rift"],           vehicle: "KDD 303R", phones: ["+254 700 303 003"], emails: ["delta3@simbasecurity.co.ke"], company: "Simba Security Group" },
  { code: "Echo 8",    sec: "Western",       clusters: ["Cluster E — Western"],        vehicle: "KDE 808W", phones: ["+254 700 808 008"], emails: ["echo8@simbasecurity.co.ke"], company: "Simba Security Group" },
  { code: "Foxtrot 1", sec: "Upper Eastern", clusters: ["Cluster F — Eastern"],        vehicle: "KDF 101E", phones: ["+254 700 101 001"], emails: ["foxtrot1@shieldresponse.co.ke"], company: "Shield Response Co." },
  { code: "Golf 6",    sec: "North Eastern", clusters: ["Cluster G — North Eastern"],  vehicle: "KDG 606N", phones: ["+254 700 606 006"], emails: ["golf6@shieldresponse.co.ke"], company: "Shield Response Co." },
  { code: "Delta 9",   sec: "Rift Valley",   clusters: ["Cluster D — Rift"],           vehicle: "KDD 909R", phones: ["+254 700 303 009"], emails: ["delta9@simbasecurity.co.ke"], company: "Simba Security Group" },
  { code: "Echo 2",    sec: "Western",       clusters: ["Cluster E — Western"],        vehicle: "KDE 202W", phones: ["+254 700 808 002"], emails: ["echo2@simbasecurity.co.ke"], company: "Simba Security Group" },
  { code: "Foxtrot 7", sec: "Upper Eastern", clusters: ["Cluster F — Eastern"],        vehicle: "KDF 707E", phones: ["+254 700 101 007"], emails: ["foxtrot7@shieldresponse.co.ke"], company: "Shield Response Co." },
  { code: "Golf 11",   sec: "North Eastern", clusters: ["Cluster G — North Eastern"],  vehicle: "KDG 611N", phones: ["+254 700 606 011"], emails: ["golf11@shieldresponse.co.ke"], company: "Shield Response Co." },
];
