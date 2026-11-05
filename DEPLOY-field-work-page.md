# Installations & Maintenance page — search + both job types

Reworks the admin Installation page to cover **both installs and maintenance**:
- a live map of technicians,
- an "In progress" grid that shows **every** ongoing job at once (install and
  maintenance, ~15+), each with its stage and per-device GPS,
- a **searchable, paginated "Completed jobs"** table (technician, date range,
  type, outcome) that scales to thousands of rows.

Web-only — the technician app already reports maintenance, so no new APK.

## Prerequisite (if not already done)

The live feed reads the `technician_active_jobs` table. If you haven't run that
migration yet (the earlier "Could not load" was this table missing), run it:

```bash
cd /var/www/html/baseapps/assetguard
psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_active_jobs.sql
```

## Deploy

```bash
cd /var/www/html/baseapps/assetguard
python3 -m zipfile -e field-work-page.zip .
npm run build
pm2 restart assetguard-3010 --update-env
```

## Files

- `app/api/apiUtils/dataControl/installation.js` — `listActiveJobs` (both types), `listCompleted` (filter + paginate)
- `app/api/mainapp/admin/installation/route.js` — live feed only (technicians + active)
- `app/api/mainapp/admin/installation/completed/route.js` — NEW searchable/paginated history
- `app/mainapp/admin/installation/components/InstallationControl.jsx` — new page (map + in-progress grid + completed table with filters + pager)
