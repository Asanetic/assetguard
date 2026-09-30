# Follow-up: region-scope the sites/options endpoint (technician app)

The technician app loads sites via GET /api/mainapp/sites/options (because the full
/api/mainapp/sites list was admin-only). That endpoint wasn't region-scoped, so techs saw
every site. Now it applies the SAME scope as the sites list: a scoped user only sees sites
whose security_region is in their regions; admins / no-regions users see all.

Requires regionScope.js from the region-scope zip (already deployed).

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('sites-options-scope.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010
```

## Files
app/api/mainapp/sites/options/route.js
