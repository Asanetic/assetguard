# Technician data — wired into Site & Device pages

No migration. Frontend only. Reads the existing media + worklog APIs.
(Prereq: the backend visibility patch must be deployed, and test as a NON-admin.)

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('technician-data.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010
```

## What changed
SITE page (ViewSite.jsx):
- The old placeholder "Site photos" (which read device install_photo) is REPLACED by the
  real <SitePhotos siteId={site.id}/> — reads /api/mainapp/media?site_id=, now GROUPED by
  stage (Before works → Device installation → After works), each newest-first by taken_at,
  with the full-screen viewer + download preserved.
- New "Technician activity" section = <TechActivity siteId={site.id}/> (the worklog).

DEVICE page (ViewDevice.jsx):
- The old "Installation photo" mock is REPLACED by <PhotoGallery deviceId={device.device_id}/>
  — fetches the device's OWN photos server-side (device_id is the HUMAN id), grouped with
  Device installation first.
- New "Service history" section = <TechActivity deviceId={device.device_id}/>.

Behaviour baked in: taken_at ordering (not created_at); accuracy_m null → "from site record";
captured_by trusted over technician; activity entries expand to full checklist (missing key =
"n/r"), the WHOLE tests array (each alarm_id linked to /mainapp/alarms/<id>), job photos
(ids → /api/mainapp/media/<id>), location, notes; abandoned outcomes shown, not hidden.

## Files
app/mainapp/sites/[id]/components/SitePhotos.jsx   (enhanced: siteId|deviceId + stage grouping)
app/mainapp/sites/[id]/components/ViewSite.jsx     (wired)
app/mainapp/devices/view/components/ViewDevice.jsx (wired)
app/mainapp/lib/TechActivity.jsx                   (new — worklog log)
app/mainapp/lib/PhotoGallery.jsx                   (new — device gallery, self-contained)
