# Company watermark on all generated spreadsheets

Every spreadsheet the app generates is now a real **.xlsx with the company logo
and name across the top** (the Excel equivalent of the report watermark), built
server-side from the live branding config. Covers: Route Playback & Response
Playback exports, Audit log, Group sites selection, Group devices selection.
(Reports already carry the watermark. Import *templates* stay plain CSV on
purpose — adding branding would break re-import.)

## Deploy — NOTE the `npm install`

This adds the `exceljs` dependency, so you must install before building:

```bash
cd /var/www/html/baseapps/assetguard
python3 -m zipfile -e branded-exports.zip .
npm install
npm run build
pm2 restart assetguard-3010 --update-env
```

## Logo format

The logo embeds in Excel only if it's a **PNG or JPG**. If your current branding
logo is an SVG, the exports show the company-name header but no image — re-upload
a PNG/JPG in **Admin → Settings → Branding**.

## Files

New:
- `app/api/apiUtils/export/brandedWorkbook.js` — builds the branded workbook (logo + name)
- `app/api/mainapp/export/xlsx/route.js` — POST CSV/sheets → branded .xlsx
- `app/mainapp/lib/brandedExport.js` — client helper every export calls

Changed:
- `package.json` — adds `exceljs`
- `app/mainapp/admin/audit/components/AuditLogs.jsx`
- `app/mainapp/sites/group/components/GroupSites.jsx`
- `app/mainapp/devices/group/components/GroupDevices.jsx`
- `app/mainapp/playbackmap/components/PlaybackMap.jsx`
- `app/mainapp/responseplayback/components/ResponsePlaybackMap.jsx`
- `app/mainapp/playback/exports/components/Exports.jsx` — label CSV → Excel
- `app/mainapp/admin/settings/components/BrandingSettings.jsx` — updated help text
