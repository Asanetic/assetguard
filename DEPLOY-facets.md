# Live entity dropdowns (facets) — always in sync

No DB migration.

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('facets.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010
```

## What this does
A new endpoint `GET /api/mainapp/facets` returns every ENTITY option list computed live,
each as the UNION of the registry + the values already in use + a small default fallback —
deduped and sorted. So a picker always has everything in the system and nothing referenced
anywhere is left behind. Sources per list:
- regions ← sites.region + dist_region
- securityRegions ← sites.security_region
- clusters ← response_clusters + sites.response_cluster
- vendors ← sites.smpms_vendor · counties ← sites.county
- clientCompanies ← companies(Client) + sites.details.company + org
- securityCompanies ← companies(Response+NOC) + sites.security_company + details
- monitoringCompanies ← companies(NOC) + sites.monitoring_company + details
- nocTeams / responseTeams ← team_members + sites.details team arrays
- firmwares ← devices.firmware + latest-firmware config
- simProviders / dataPlans ← device configs
(Missing registry tables are guarded — they just contribute nothing.)

A cached `useFacets()` hook feeds the pickers. Wired: GroupSites transfers (region, security
region, cluster, vendor, security co, monitoring co, client co), GroupDevices (data plan, SIM
provider), AddSite (region/security region/cluster/vendor/county), AllSites region filter.

Fixed ENUMS stay static (status, priority, mute units, orientation, radii, intervals) — those
aren't data-driven.

## Files
facets.js (new) · facets/route.js (new) · useFacets.js (new) · GroupSites.jsx · GroupDevices.jsx · AllSites.jsx · AddSite.jsx
