# Disturbance notifications → NOC + site response team (push & SMS)

Disturbance warnings AND the final disturbance alarm now reach, by **push and
SMS/email** (on top of the site's own typed contacts):

- **Every active NOC user** — the monitoring control room covers all sites, so
  NOC is not scoped by site or region.
- **The response team tied to the site** — a response/manager user (field_resp,
  sec_*, company_mgr/asst_mgr, or a Response-purpose company) who is either
  **assigned to the site** (user_sites) **OR** whose **region** covers the site's
  `security_region` (country-wide = every region).

Scope: this broader audience applies to **disturbance** only. Other alarm types
keep their existing routing.

## Deploy (web-only, no migration, no app change)

```bash
cd /var/www/html/baseapps/assetguard
python3 -m zipfile -e disturbance-noc-response.zip .
npm run build
pm2 restart gps-3000 assetguard-3010 --update-env
```

(The disturbance dispatch runs in the ingest process, `gps-3000`, so that one
must be restarted; restarting both is simplest.)

## Files

- `app/api/apiUtils/notify/disturbanceTeam.js` — NEW: the audience (contacts for SMS/email, tokens for push)
- `app/api/apiUtils/notify/alarmNotify.js` — warning + final-alarm SMS/email + warning push now include the team
- `app/api/apiUtils/notify/alarmPush.js` — final-alarm push now includes the team (disturbance only)

## Notes

- De-duped everywhere: a person who is both a site contact and a responder is
  texted/pushed once.
- NOC users get **push** only if they have a registered (non-technician) device
  token; they always get **SMS/email** from their user record regardless.
- Test/muted/disarmed disturbances are unchanged — they never page the team.
