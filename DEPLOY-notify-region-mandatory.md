# Disturbance / alarm notifications — region is mandatory for EVERYONE (NOC included)

There were TWO global senders making "everybody" get paged regardless of region:

1. NOC was unscoped in the disturbance audience (`disturbanceTeam.js`): every NOC
   user — and every user of a company tagged NOC/Response — received every site's
   disturbance, in any region.

2. The base alarm-push query (`alarmPushTokens.js tokensForAlarm`) treated a user
   with an EMPTY regions list as country-wide. Disturbance is a Critical-priority
   alarm, so this branch was active for it — every response/manager user (and
   Response-purpose company user) with no region set got every disturbance, in any
   region.

Now, for the whole notification audience (push + SMS), **a recipient is paged only
when they are ASSIGNED to the site OR the site's security_region is EXPLICITLY one
of their regions** — NOC included. An empty regions list is NO LONGER country-wide
for alarms.

## IMPORTANT consequence — set regions / assignments
A user with no region set and no site assignment now receives NOTHING. To page
someone for a region, give them that region (or assign them to the site). This is
deliberate: it is what stops cross-region paging. NOC users in particular must be
assigned to their sites or given the region.

(Platform admins/superadmins still receive alarms globally — that is unchanged. Say
the word if you also want admins region-scoped.)

## Files
- app/api/apiUtils/notify/disturbanceTeam.js   (NOC + everyone scoped by assignment/region)
- app/api/apiUtils/dataControl/alarmPushTokens.js (empty-region country-wide removed)

## Deploy (web-only, no migration) — clean restart, never touches port 9000
```bash
cd /var/www/html/baseapps/assetguard
python3 -m zipfile -e notify-region-mandatory.zip .
npm run build
pm2 delete all
fuser -k 3000/tcp 3010/tcp; sleep 2
PORT=3000 pm2 start npm --name gps-3000 -- start
PORT=3010 pm2 start npm --name assetguard-3010 -- start
```
(Notifications are dispatched from the ingest process gps-3000 — restart both.)
