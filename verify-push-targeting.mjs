import { query } from './s_env/db.js';
import { techniciansOnSiteFor } from './dataControl/push.js';
import { insertLiveAlarm } from './dataControl/alarms.js';
let p=0,f=0; const ok=(n,c,x='')=>{c?(p++,console.log('  PASS  '+n)):(f++,console.log('  FAIL  '+n+' '+x))};

await query(`TRUNCATE alarms, technician_worklog, technician_work_sessions RESTART IDENTITY CASCADE`);
await query(`DELETE FROM devices; DELETE FROM sites;`);
await query(`INSERT INTO sites (id, code, name, status) VALUES (1,'NBI','HQ','Live')`);
await query(`INSERT INTO devices (device_id, imei, site_id, status) VALUES
  ('DEV-IN','8601',1,'Live'), ('DEV-OUT','8602',1,'Live')`);
// a wizard covering DEV-IN only — DEV-OUT is at the SAME SITE but not selected
await query(`INSERT INTO technician_work_sessions (technician_id, site_id, device_id, device_ids, job_type, expires_at)
             VALUES ('tech-1', 1, 'DEV-IN', ARRAY['DEV-IN'], 'install', now() + interval '30 minutes')`);

console.log('\n== 3. only SELECTED devices push ==');
ok('selected device -> technician is a recipient', (await techniciansOnSiteFor({deviceIdText:'DEV-IN'})).includes('tech-1'));
const out = await techniciansOnSiteFor({deviceIdText:'DEV-OUT'});
ok('UNSELECTED device at the same site -> NOBODY', out.length===0, JSON.stringify(out));

console.log('\n== 2. only the FIRST shot pushes ==');
const a1 = await insertLiveAlarm({alarmType:'DISTURBANCE', value:'00100008', deviceIdText:'DEV-IN', source:'test'});
ok('first shot is not flagged as refreshed', !a1.refreshed, JSON.stringify({id:a1.id,r:a1.refreshed}));
const a2 = await insertLiveAlarm({alarmType:'DISTURBANCE', value:'00100008', deviceIdText:'DEV-IN', source:'test'});
ok('second shot IS flagged refreshed', a2.refreshed===true && a2.id===a1.id);
const a3 = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'DEV-IN', source:'test'});
ok('third shot too', a3.refreshed===true);
ok('still exactly one row', (await query(`SELECT count(*)::int n FROM alarms WHERE device_id='DEV-IN'`)).rows[0].n===1);
// closing re-arms: the next shot is a first shot again and SHOULD push
await query(`UPDATE alarms SET status='Closed' WHERE id=$1`,[a1.id]);
const a4 = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'DEV-IN', source:'test'});
ok('after closing, the next shot pushes again', !a4.refreshed && a4.id!==a1.id);

console.log('\n== 1. a DRILL reaches the person who fired it ==');
// no session covers DEV-OUT, so only the explicit recipient should be used
const onSite = await techniciansOnSiteFor({deviceIdText:'DEV-OUT'});
const extra = ['admin-9'];
const recips = [...new Set([...onSite, ...extra])];
ok('drill on an unselected device -> the firer only', recips.length===1 && recips[0]==='admin-9', JSON.stringify(recips));
const both = [...new Set([...(await techniciansOnSiteFor({deviceIdText:'DEV-IN'})), ...extra])];
ok('drill on a device in a wizard -> firer AND technician', both.length===2, JSON.stringify(both));

console.log(`\n${p} passed, ${f} failed\n`);
process.exit(f?1:0);
