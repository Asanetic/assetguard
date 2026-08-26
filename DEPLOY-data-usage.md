# Data-bundle usage estimate — default 50MB annually, manual renewal

No DB migration.

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('data-usage.zip').extractall('.')"
npm run build
pm2 restart assetguard-3010 gps-3000
```

## Behaviour
- Estimated usage = uplink frame bytes + downlink command bytes + ~40B/packet, since data_reset_at.
- NEW device default bundle: 50 MB, annually (applied on manual add + import). Counter starts at add.
- Assign data bundle: amount + unit (MB/GB) + period (monthly/annually), clamped 1MB–10GB.
- NO auto-renewal — renewal is fully manual via "Reset data bundle" (button + batch op).
- View device shows remaining/assigned, used bar (red ≥90%), ↑up/↓down.

## Files
dataUsage.js · devices.js · devices/[id]/route.js · devices/batch/route.js · offlineSweep.js · GroupDevices.jsx · ViewDevice.jsx
