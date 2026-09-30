# NOC team members + team on Acknowledge

## Deploy
```bash
cd /var/www/html/baseapps/assetguard
python3 -c "import zipfile; zipfile.ZipFile('noc-team-ack.zip').extractall('.')"
psql "postgresql://assetguard:admin001@localhost:5432/assetguard" -f db/ack_team.sql
npm run build
pm2 restart assetguard-3010
```

## What changed
1. NOC teams can now have MEMBER USERS (like response teams). On the NOC teams page,
   registering/editing a team has a "Team members" search + multi-select. Membership is
   persisted to team_members (keyed by the team code) via the existing shared endpoint
   /api/mainapp/response/teams/{code}/members — even though the NOC team record itself is
   still in-memory.
2. When a NOC-team member ACKNOWLEDGES an alarm, the alarm lifecycle now shows their name
   AND their team — "Acknowledged — Monitoring · by <name> · <team> — <finding>" — mirroring
   the response log. The acking user's team is resolved with teamForUser() and stored in new
   alarm columns ack_monitoring_team / ack_security_team.

Migration (db/ack_team.sql) adds ack_monitoring_team + ack_security_team. Idempotent.

## Files
db/ack_team.sql · alarms.js (acknowledgeSide + lifecycle) · alarms/[id]/ack/route.js · NocTeams.jsx
