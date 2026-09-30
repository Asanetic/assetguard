# Task 1 — Users & Roles: region + security region now real from DB

No migration. One file. (Relies on the existing /api/mainapp/facets + useFacets, already in the build.)

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('users-regions.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010
```

## What changed (app/mainapp/admin/users/components/UsersAdmin.jsx)
The hardcoded SCOPE_REGIONS/REGIONS prototype list is replaced with the LIVE list from
GET /api/mainapp/facets → facets.securityRegions (distinct sites.security_region). Applied in
all four spots: the per-user Region select, and the region-scope pickers in Create user,
Approve, and Edit user. The old array remains only as a fallback (until facets load / empty DB),
so nothing breaks if there are no sites yet. "Country-wide" is still the first option.
