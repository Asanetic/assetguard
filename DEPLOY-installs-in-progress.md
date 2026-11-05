# "Installs in progress" — whole-install tracking

Makes the admin Installation page list an install for its **entire** duration
(site pick → done), instead of only during the ~30-minute on-site alarm window.
It reads a new "active job" signal the technician app reports as it works.

## 1. Migration (once)

```bash
psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/technician_active_jobs.sql
```

## 2. Deploy the code

```bash
cd /var/www/html/baseapps/assetguard
python3 -m zipfile -e installs-in-progress-web.zip .
npm run build
pm2 restart assetguard-3010 --update-env
```

## 3. Rebuild the technician app

The panel only fills once the **updated app** is posting its active job. Rebuild
the APK from `techapp-installation-feature.zip` (refreshed) and deploy it.

## Files in the web zip

- `db/technician_active_jobs.sql` — new table (one row per technician's current job)
- `app/api/mainapp/technician/active-job/route.js` — the app posts here
- `app/api/apiUtils/dataControl/technician.js` — `upsertActiveJob` / `clearActiveJob`
- `app/api/apiUtils/dataControl/installation.js` — the panel now reads the active-job table

## Notes

- The on-site alarm session (`technician_work_sessions`) is **unchanged** — it
  still opens at Settle for 30 min, because that's about alarm safety, not
  display. This new signal is separate and gates nothing.
- A row shows while it's fresh; the app clears it on submit/abandon, and a
  crashed/abandoned one ages out of the page's 2-hour window on its own.
