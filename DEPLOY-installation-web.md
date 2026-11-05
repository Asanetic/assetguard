# Installation admin page — web deploy

Adds **Admin → Installation**: a live map of technicians, the installs in
progress (with the stage each is at and, per tracker, on / GPS-fix / satellites),
and completed installations with timestamps.

## 1. Run the migration (once)

```bash
psql "$DATABASE_URL" -f db/technician_tracking.sql
```

Adds `step` / `step_at` to `technician_work_sessions` and a new
`technician_positions` table. Additive and idempotent — safe to re-run.

## 2. Deploy the code

From the app root (`/var/www/html/baseapps/assetguard`):

```bash
python3 -m zipfile -e installation-web.zip .
npm run build
pm2 restart gps-3000 assetguard-3010 --update-env
```

## What's in it

- `db/technician_tracking.sql` — migration
- `app/api/apiUtils/dataControl/installation.js` — read layer for the page
- `app/api/apiUtils/dataControl/technician.js` — adds `upsertTechnicianPosition`, `updateSessionStep`
- `app/api/mainapp/admin/installation/route.js` — the page feed (admin only)
- `app/api/mainapp/technician/position/route.js` — app posts handset GPS here
- `app/api/mainapp/technician/device-status/route.js` — live on/fix/satellites for a device
- `app/api/mainapp/technician/session/route.js` — adds `action:"step"`
- `app/api/mainapp/track/live/route.js` — now also returns fix + satellites
- `app/mainapp/shell/AppShell.jsx`, `app/mainapp/lib/pageAccess.js` — nav + access
- `app/mainapp/admin/installation/*` — the page

## Note

The **completed installations** list works immediately (it reads the existing
work log). The **technician map** and the **live stage / per-device GPS** on
in-progress installs fill in once the updated **technician app** ships — that
app is what posts positions, the current step, and keeps streaming while a
device is being fitted. Until then those two panels simply show "none in
progress".
