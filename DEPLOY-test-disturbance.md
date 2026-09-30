# Fix: disturbances during Testing/Maintenance log as plain "Disturbance – test"

No migration. One file.

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('test-disturbance.zip').extractall('.')"
npm run build
pm2 restart gps-3000 assetguard-3010
```

## Why "Disturbance Tech" appeared
DISTURBANCE_TECH is a disturbance downgraded to Low because a technician is on site (isTechOnSite
returns true). During Testing/Maintenance the device is treated as "tech on site" (someone is
installing/servicing it), so a disturbance came through as the tech variant, then got tagged
"– test" → "Disturbance — tech on site – test".

## Change (ingest/store.js)
While in test mode (device OR site Testing/Maintenance), any DISTURBANCE_TECH is remapped to the
plain DISTURBANCE type before it's raised — so it logs as "Disturbance – test". The tech-on-site
tier still applies for a real booked tech visit on a LIVE site.

## Files
app/api/apiUtils/ingest/store.js
