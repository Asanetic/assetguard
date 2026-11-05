# Disturbance notifications — region leak fix

Problem: response/manager users with NO region set were being treated as
country-wide (the empty-regions = all-sites convention leaked in from site
visibility), so they received disturbance warnings/alarms for sites in regions
they don't cover.

Fix: on the RESPONSE side the audience is now strict — a response/manager user
is paged only if they are ASSIGNED to the site, or the site's security_region is
EXPLICITLY one of their regions. Empty regions no longer means "all sites" for
notifications. NOC users stay global (control room), and company-purpose
matching is unchanged.

## Deploy (web-only, no migration, no app change)

```bash
cd /var/www/html/baseapps/assetguard
python3 -m zipfile -e disturbance-region-fix.zip .
# clean restart — kills only the two app processes/ports, never 9000 (ingest)
pm2 delete all
fuser -k 3000/tcp 3010/tcp; sleep 2
PORT=3000 pm2 start npm --name gps-3000 -- start
PORT=3010 pm2 start npm --name assetguard-3010 -- start
```
(Run `npm run build` first if you haven't rebuilt since the last change.)

## File
- `app/api/apiUtils/notify/disturbanceTeam.js` — removed the empty-regions
  country-wide shortcut from the response branch.
