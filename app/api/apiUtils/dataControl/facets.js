// app/api/apiUtils/dataControl/facets.js
// -----------------------------------------------------------------------------
// Live option lists for every ENTITY dropdown in the system. Each list is the
// UNION of: the registry tables + the values already in use on records (site
// columns, the site `details` JSONB contacts, device configs) + a small default
// fallback. Deduped + sorted. So a picker always has everything in the system and
// stays in sync — nothing referenced anywhere is left behind.
//
// Enums (status, priority, mute units, orientation, radii, intervals) are NOT here
// — those are fixed and defined at the component.
// -----------------------------------------------------------------------------
import { query } from "../s_env/db.js";
import { getFirmwareConfig, getOrgConfig } from "./appConfig.js";

// Small fallbacks so an empty DB still offers sensible options. Folded into the
// union — never override live data.
// NO hardcoded companies / vendors / security-regions / clusters here — those must
// come only from what's registered (companies, response_regions/clusters tables) or
// already in use on records, so deleting a registration removes it from the pickers.
// Only genuinely-fixed reference geography / device enums keep a small fallback.
const DEF = {
  regions: ["Nairobi Metro", "Central", "Coast", "Rift Valley", "Western", "Eastern", "North Eastern", "Nyanza"],
  securityRegions: [],
  clusters: [],
  vendors: [],
  counties: [],
  clientCompanies: [],
  securityCompanies: [],
  monitoringCompanies: [],
  nocTeams: [],
  responseTeams: [],
  firmwares: ["v2.4.1", "v2.3.8", "v2.2.5"],
  simProviders: ["Safaricom", "Airtel", "Telkom"],
  dataPlans: ["1GB monthly", "2GB monthly", "5GB monthly", "10GB monthly"],
};

const clean = (arr) => [...new Set((arr || []).map((v) => String(v ?? "").trim()).filter(Boolean))]
  .sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }));

// Run a single-column query; return [] on any error (table may not exist yet).
async function col(sql, params = []) {
  try { const { rows } = await query(sql, params); return rows.map((r) => r.v); }
  catch { return []; }
}

/** All entity option lists, live + in sync. */
export async function getFacets() {
  const [
    regionA, regionB, secRegions, secRegionReg, clusterReg, clusterSite, vendors, counties,
    clientCo, secCo, monCo, teamNames, nocReg, respReg, siteDetails, deviceFw, simProv, dataPlan,
  ] = await Promise.all([
    col(`SELECT region AS v FROM sites WHERE region IS NOT NULL AND btrim(region) <> ''`),
    col(`SELECT dist_region AS v FROM sites WHERE dist_region IS NOT NULL AND btrim(dist_region) <> ''`),
    col(`SELECT security_region AS v FROM sites WHERE security_region IS NOT NULL AND btrim(security_region) <> ''`),
    col(`SELECT name AS v FROM response_regions WHERE name IS NOT NULL AND btrim(name) <> ''`),
    col(`SELECT name AS v FROM response_clusters WHERE name IS NOT NULL AND btrim(name) <> ''`),
    col(`SELECT response_cluster AS v FROM sites WHERE response_cluster IS NOT NULL AND btrim(response_cluster) <> ''`),
    col(`SELECT smpms_vendor AS v FROM sites WHERE smpms_vendor IS NOT NULL AND btrim(smpms_vendor) <> ''`),
    col(`SELECT county AS v FROM sites WHERE county IS NOT NULL AND btrim(county) <> ''`),
    // companies by purpose
    col(`SELECT name AS v FROM companies WHERE 'Client' = ANY(purposes)`),
    col(`SELECT name AS v FROM companies WHERE 'Response' = ANY(purposes) AND 'NOC' = ANY(purposes)`),
    col(`SELECT name AS v FROM companies WHERE 'NOC' = ANY(purposes)`),
    // team registry
    col(`SELECT DISTINCT team_name AS v FROM team_members WHERE team_name IS NOT NULL AND btrim(team_name) <> ''`),
    col(`SELECT code AS v FROM noc_teams WHERE code IS NOT NULL AND btrim(code) <> ''`),
    col(`SELECT code AS v FROM response_teams WHERE code IS NOT NULL AND btrim(code) <> ''`),
    // company/team + vendor values stored on sites (columns already covered) + details JSONB
    (async () => { try { const { rows } = await query(`SELECT details FROM sites WHERE details IS NOT NULL`); return rows.map((r) => r.details); } catch { return []; } })(),
    col(`SELECT DISTINCT firmware AS v FROM devices WHERE firmware IS NOT NULL AND btrim(firmware) <> ''`),
    col(`SELECT DISTINCT config->>'sim_provider' AS v FROM devices WHERE COALESCE(config->>'sim_provider','') <> ''`),
    col(`SELECT DISTINCT config->>'data_plan' AS v FROM devices WHERE COALESCE(config->>'data_plan','') <> ''`),
  ]);

  // Security / monitoring COMPANIES come only from the companies registry (below),
  // NOT from stale values on sites — so deleting a company removes it from every
  // company picker. Client company + team names are still gathered from site details.
  const jClient = [], jNoc = [], jResp = [];
  const teamName = (t) => (t && typeof t === "object" ? (t.name || t.code) : t);
  for (const d of siteDetails) {
    if (!d || typeof d !== "object") continue;
    if (d.company?.name) jClient.push(d.company.name);
    for (const t of d.securityCompany?.nocTeams || []) jNoc.push(teamName(t));
    for (const t of d.noc?.nocTeams || []) jNoc.push(teamName(t));
    for (const t of d.securityCompany?.responseTeams || []) jResp.push(teamName(t));
  }

  let fwLatest = [];
  try { const c = await getFirmwareConfig(); if (c?.latest) fwLatest = [c.latest]; } catch {}
  let orgName = [];
  try { const o = await getOrgConfig(); if (o?.name) orgName = [o.name]; } catch {}

  return {
    regions: clean([...regionA, ...regionB, ...DEF.regions]),
    securityRegions: clean([...secRegionReg, ...secRegions, ...DEF.securityRegions]),
    clusters: clean([...clusterReg, ...clusterSite, ...DEF.clusters]),
    vendors: clean([...vendors, ...DEF.vendors]),
    counties: clean([...counties, ...DEF.counties]),
    clientCompanies: clean([...clientCo, ...jClient, ...orgName, ...DEF.clientCompanies]),
    securityCompanies: clean([...secCo, ...DEF.securityCompanies]),
    monitoringCompanies: clean([...monCo, ...DEF.monitoringCompanies]),
    nocTeams: clean([...teamNames, ...nocReg, ...jNoc, ...DEF.nocTeams]),
    responseTeams: clean([...teamNames, ...respReg, ...jResp, ...DEF.responseTeams]),
    firmwares: clean([...deviceFw, ...fwLatest, ...DEF.firmwares]),
    simProviders: clean([...simProv, ...DEF.simProviders]),
    dataPlans: clean([...dataPlan, ...DEF.dataPlans]),
  };
}
