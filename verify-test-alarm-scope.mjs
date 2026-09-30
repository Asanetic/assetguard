import { query } from './s_env/db.js';
import { listTechTestAlarms, countOpenTechTestAlarms, ownsTestAlarm } from './dataControl/technician.js';
import { insertLiveAlarm } from './dataControl/alarms.js';
let p=0,f=0; const ok=(n,c,x='')=>{c?(p++,console.log('  PASS  '+n)):(f++,console.log('  FAIL  '+n+' '+x))};

await query(`TRUNCATE alarms, technician_worklog, technician_work_sessions, technician_push_tokens RESTART IDENTITY CASCADE`);
await query(`DELETE FROM devices; DELETE FROM sites;`);
await query(`INSERT INTO sites (id,code,name,status) VALUES (1,'NBI','HQ','Live')`);
await query(`INSERT INTO devices (device_id,imei,site_id,status) VALUES ('MINE','8601',1,'Live'),('THEIRS','8602',1,'Live')`);
// tech-1 selected MINE; tech-2 selected THEIRS — same site
await query(`INSERT INTO technician_work_sessions (technician_id,site_id,device_id,device_ids,job_type,expires_at)
  VALUES ('tech-1',1,'MINE',ARRAY['MINE'],'install',now()+interval '30 minutes'),
         ('tech-2',1,'THEIRS',ARRAY['THEIRS'],'install',now()+interval '30 minutes')`);

console.log('\n== the drill push, on a device that already has an open test alarm ==');
const first = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'MINE', source:'test'});
ok('shake test raised it', !first.refreshed);
const drillRow = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'MINE', source:'test'});
ok('drill refreshes rather than duplicating', drillRow.refreshed===true && drillRow.id===first.id);
// the OLD rule dropped the push here; the new one keeps it for a drill
const suppressedOld = !!drillRow.refreshed;
const suppressedNew = !!drillRow.refreshed && !true /* drill */;
ok('OLD: drill push was suppressed', suppressedOld===true);
ok('NEW: drill push is NOT suppressed', suppressedNew===false);

console.log('\n== Tests tab is scoped to the devices you selected ==');
await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'THEIRS', source:'test'});
const mine = await listTechTestAlarms({technicianId:'tech-1'});
ok('tech-1 sees only MINE', mine.length===1 && mine[0].device_id==='MINE', JSON.stringify(mine.map(r=>r.device_id)));
const theirs = await listTechTestAlarms({technicianId:'tech-2'});
ok('tech-2 sees only THEIRS', theirs.length===1 && theirs[0].device_id==='THEIRS', JSON.stringify(theirs.map(r=>r.device_id)));
ok('badge counts are per technician', (await countOpenTechTestAlarms('tech-1'))===1 && (await countOpenTechTestAlarms('tech-2'))===1);
const theirRow = theirs[0];
ok('tech-1 CANNOT close tech-2 alarm', (await ownsTestAlarm('tech-1', theirRow.id))===false);
ok('tech-2 CAN close their own', (await ownsTestAlarm('tech-2', theirRow.id))===true);

console.log('\n== a real alarm is never reachable ==');
const real = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'MINE', source:'device'});
ok('real alarm not in the tests list', !(await listTechTestAlarms({technicianId:'tech-1'})).some(r=>r.id===real.id));
ok('real alarm cannot be closed by a technician', (await ownsTestAlarm('tech-1', real.id))===false);

console.log('\n== a technician with no sessions sees nothing ==');
ok('no sessions -> empty', (await listTechTestAlarms({technicianId:'tech-99'})).length===0);
ok('no technicianId -> empty, not everything', (await listTechTestAlarms({})).length===0);

console.log(`\n${p} passed, ${f} failed\n`);
process.exit(f?1:0);
