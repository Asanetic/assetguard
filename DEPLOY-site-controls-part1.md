# Site controls — Part 1 (status interlink · arm/disarm · mute · sync)

## 1. Run the migration (once)
```
psql "$DATABASE_URL" -f db/sites_control.sql
```
Adds `sites.armed` (default true) and `sites.mute_until`. Idempotent.

## 2. Files changed
- `db/sites_control.sql` .......... NEW migration
- `app/api/apiUtils/dataControl/sites.js` .......... interlink (recompute/cascade), arm, mute, getSitePolicy
- `app/api/apiUtils/dataControl/devices.js` ........ setDeviceStatus now rolls up to its site
- `app/api/apiUtils/dataControl/deviceCommands.js` . syncDevicesConfig() shared by device + site sync
- `app/api/mainapp/sites/batch/route.js` ........... wired status/arm/disarm/mute/sync
- `app/api/apiUtils/notify/alarmNotify.js` ......... testing→test, mute→Low, disarm→suppress + routing
- `app/api/apiUtils/ingest/store.js` ............... passes device status into the notify policy (3 sites)
- `app/api/apiUtils/ingest/offlineSweep.js` ........ reconciles site status from devices each sweep
- `app/api/mainapp/devices/batch/route.js` ......... rolls a device status/site change up to the site
- `app/mainapp/sites/group/components/GroupSites.jsx` UI: status(3), arm/disarm/mute(unit)/sync + chips

## 3. What each does
**Status interlink** — Change status on a site pushes **Live/Testing/Maintenance** down to all its
devices. A site whose devices ALL share one effective state (Offline when overdue past their own wake
interval, else stored status) auto-switches to that state; mixed → Live. So **all devices Inactive →
site Inactive**, **all Offline → site Offline**. Recompute fires on device status change, on the batch
routes, and every offline sweep.

**Arm / Disarm** — Disarm suppresses all alarm paging for the site (alarms are still recorded and
visible). Arm restores it. Shown as a chip in Group sites.

**Mute (minutes/hours/days)** — while the window is open, the site's alarms are downgraded to **Low**
(recorded, no critical paging). Set 0 to unmute. Auto-expires. Shown as a chip.

**Testing/Maintenance = test alarms** — while a site or device is Testing/Maintenance, real events
become **"<name> – test"**, priority **Low**, routed **only to NOC + field technicians** (roles matching
NOC / response / field). No client/security-company paging.

**Sync device configurations** — pushes every device (at each selected site) its stored config as
downlink commands (GS motion sensitivity, update upload-interval, UPT wake-interval). IMEI is never sent.

## 4. Not in Part 1 (coming in Part 2)
Manual **Send test alarm** (pick device + alarm type, all-types one-by-one) and **Generate PDF report**.
Export CSV and Delete are unchanged. Request technician (Accyss), Schedule maintenance window, and the
company transfer remain placeholders by design.

## Note on "field technicians"
Test alarms currently route to Monitoring NOC + Security NOC/response/field roles (there is no dedicated
"field technician" contact list on a site yet). When the Accyss integration adds one, point `isTestRole`
in `alarmNotify.js` at it.
