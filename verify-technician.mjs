import { query } from './s_env/db.js';
import {
  openSession, closeSessionsFor, underTestReason, isSiteUnderMaintenance,
  findTestAlarm, listTechTestAlarms, countOpenTechTestAlarms, ownsTestAlarm,
  setTestAlarmStatus,
} from './dataControl/technician.js';
import { insertLiveAlarm, disturbanceDecision } from './dataControl/alarms.js';

let pass = 0, fail = 0;
const ok  = (n, c, extra='') => { c ? (pass++, console.log(`  PASS  ${n}`)) : (fail++, console.log(`  FAIL  ${n} ${extra}`)); };

async function reset() {
  await query(`TRUNCATE alarms, device_telemetry, technician_worklog, technician_work_sessions RESTART IDENTITY CASCADE`);
  await query(`DELETE FROM devices; DELETE FROM sites;`);
  await query(`INSERT INTO sites (id, code, name) VALUES (1,'NBI-01','HQ') ON CONFLICT DO NOTHING`);
  // DEV-01 assigned to site 1; DEV-02 UNASSIGNED (the installation case)
  await query(`INSERT INTO devices (device_id, imei, site_id) VALUES ('DEV-01','860001',1), ('DEV-02','860002',NULL)`);
}

console.log('\n== 1. under-test lookup ==');
await reset();
ok('no session -> not under test', !(await underTestReason({siteId:1, deviceIdText:'DEV-01'})).underTest);
await openSession({technicianId:'t1', technicianName:'T', siteId:1, deviceId:'DEV-01', deviceIds:['DEV-01','DEV-02'], jobType:'install', minutes:30});
const bySite = await underTestReason({siteId:1, deviceIdText:'DEV-01'});
ok('matches by site', bySite.underTest, JSON.stringify(bySite));
const byDev = await underTestReason({siteId:null, deviceIdText:'DEV-02'});
ok('UNASSIGNED device matches by device_ids', byDev.underTest && byDev.via==='device', JSON.stringify(byDev));
const none = await underTestReason({siteId:null, deviceIdText:'DEV-99'});
ok('unrelated device -> not under test', !none.underTest, JSON.stringify(none));

console.log('\n== 2. test alarm insert + de-dupe ==');
const a1 = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'DEV-02', source:'test'});
ok('test alarm created', !!a1 && a1.source==='test', JSON.stringify(a1&&{id:a1.id,src:a1.source}));
const a2 = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'DEV-02', source:'test'});
ok('second identical test alarm de-duped', a2 && a2.id === a1.id, `${a1?.id} vs ${a2?.id}`);
const a3 = await insertLiveAlarm({alarmType:'GEOFENCE_EXIT', value:120, deviceIdText:'DEV-02', source:'test'});
ok('different kind still raises', a3 && a3.id !== a1.id);
const {rows:cnt} = await query(`SELECT count(*)::int n FROM alarms WHERE device_id='DEV-02'`);
ok('exactly 2 rows for DEV-02', cnt[0].n===2, `got ${cnt[0].n}`);

console.log('\n== 3. THE WIZARD POLL (the reported failure) ==');
const since = new Date(Date.now() - 60_000);
const found = await findTestAlarm({ deviceId:'DEV-02', since, types:['disturb'] });
ok('poll finds the disturbance by device_id', !!found && found.alarm_type==='DISTURBANCE', JSON.stringify(found&&{id:found.id}));
const byImei = await findTestAlarm({ deviceId:'860002', since, types:['disturb'] });
ok('poll finds it by IMEI too', !!byImei, JSON.stringify(byImei&&{id:byImei.id}));
const anyScope = await findTestAlarm({ deviceId:'DEV-02', since, types:null });
ok('scope=any finds one', !!anyScope);
// clock skew: phone 60s FAST
const future = new Date(Date.now() + 60_000);
const skewed = await findTestAlarm({ deviceId:'DEV-02', since: future, types:['disturb'] });
ok('a fast phone clock still finds it', !!skewed, JSON.stringify(skewed&&{id:skewed.id}));
// de-dupe fallback: nothing new since now, but one is open
const later = new Date(Date.now() + 1000);
const fb = await findTestAlarm({ deviceId:'DEV-02', since: later, types:['disturb'] });
ok('retry falls back to the open test alarm', !!fb);

console.log('\n== 4. Tests tab ==');
const list = await listTechTestAlarms({technicianId:'t1'});
ok('lists both test alarms', list.length===2, `got ${list.length}`);
ok('open count = 2', (await countOpenTechTestAlarms('t1'))===2);
ok('ownsTestAlarm true for a test alarm', await ownsTestAlarm('t1', a1.id));
const real = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'DEV-01', source:'device'});
ok('real alarm NOT in the tests list', !(await listTechTestAlarms({technicianId:'t1'})).some(r=>r.id===real.id));
ok('ownsTestAlarm FALSE for a real alarm', !(await ownsTestAlarm('t1', real.id)));
await setTestAlarmStatus(a1.id, 'close');
ok('open count drops after close', (await countOpenTechTestAlarms('t1'))===1);
const a4 = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'DEV-02', source:'test'});
ok('closing re-arms the de-dupe', a4 && a4.id !== a1.id);

console.log('\n== 5. status-driven testing (the duplicate bug) ==');
await reset();
await query(`UPDATE devices SET status='Testing' WHERE device_id='DEV-01'`);
const st = await underTestReason({siteId:1, deviceIdText:'DEV-01', deviceStatus:'Testing'});
ok('device status Testing -> under test', st.underTest, JSON.stringify(st));
await query(`UPDATE devices SET status='Live' WHERE device_id='DEV-01'`);
await query(`UPDATE sites SET status='Maintenance' WHERE id=1`);
const ss = await underTestReason({siteId:1, deviceIdText:'DEV-01', deviceStatus:'Live'});
ok('site status Maintenance -> under test', ss.underTest, JSON.stringify(ss));
const sl = await underTestReason({siteId:1, deviceIdText:'DEV-01', deviceStatus:'Live'});
ok('reason names the site status', /site status/.test(sl.via), sl.via);
await query(`UPDATE sites SET status='Live' WHERE id=1`);

// THE SCREENSHOT: same device, repeated Disturbance + Geofence uplinks.
await reset();
await query(`UPDATE devices SET status='Testing' WHERE device_id='DEV-01'`);
for (let i = 0; i < 5; i++) {
  await insertLiveAlarm({alarmType:'DISTURBANCE', value:'00100008', deviceIdText:'DEV-01', source:'test'});
  await insertLiveAlarm({alarmType:'GEOFENCE_EXIT', value:13149, deviceIdText:'DEV-01', source:'test'});
}
const {rows:dupRows} = await query(`SELECT alarm_type, count(*)::int n FROM alarms WHERE device_id='DEV-01' GROUP BY 1 ORDER BY 1`);
ok('5 disturbance uplinks -> ONE row', dupRows.find(r=>r.alarm_type==='DISTURBANCE')?.n===1, JSON.stringify(dupRows));
ok('5 geofence uplinks -> ONE row', dupRows.find(r=>r.alarm_type==='GEOFENCE_EXIT')?.n===1, JSON.stringify(dupRows));
const {rows:lbl} = await query(`SELECT name, priority FROM alarms WHERE device_id='DEV-01' AND alarm_type='DISTURBANCE'`);
ok('labelled "– test" at insert', lbl[0].name.includes('– test'), lbl[0].name);
ok('priority Low at insert', lbl[0].priority==='Low', lbl[0].priority);
// and the wizard can still find it
ok('wizard poll finds the single row', !!(await findTestAlarm({deviceId:'DEV-01', since:new Date(Date.now()-60000), types:['disturb']})));
await query(`UPDATE devices SET status='Live' WHERE device_id='DEV-01'`);

console.log('\n== 6. a device is NEVER deafened by its own open test alarm ==');
// The regression: de-dupe returned the old row untouched, so created_at never
// moved and the wizard's `created_at > since` could never match again.
await reset();
await query(`UPDATE devices SET status='Testing' WHERE device_id='DEV-01'`);
const first = await insertLiveAlarm({alarmType:'DISTURBANCE', value:'00100008', deviceIdText:'DEV-01', source:'test'});
// pretend it happened an hour ago and was never closed
await query(`UPDATE alarms SET created_at = now() - interval '1 hour' WHERE id=$1`,[first.id]);
const testStart = new Date();                     // technician starts a NEW test now
await new Promise(r=>setTimeout(r,1100));
const again = await insertLiveAlarm({alarmType:'DISTURBANCE', value:'00100008', deviceIdText:'DEV-01', source:'test'});
ok('still ONE row', again.id === first.id, `${first.id} vs ${again.id}`);
const {rows:rc} = await query(`SELECT count(*)::int n FROM alarms WHERE device_id='DEV-01'`);
ok('no duplicate created', rc[0].n===1, `rows=${rc[0].n}`);
const poll = await findTestAlarm({deviceId:'DEV-01', since:testStart, types:['disturb']});
ok('WIZARD FINDS IT after the refresh', !!poll, 'poll returned null — device is deaf');
const {rows:st2} = await query(`SELECT created_at > $1 AS fresh FROM alarms WHERE id=$2`,[testStart, first.id]);
ok('created_at moved forward', st2[0].fresh===true);
// acknowledged -> reopened when it fires again
await query(`UPDATE alarms SET status='Acknowledged' WHERE id=$1`,[first.id]);
await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'DEV-01', source:'test'});
const {rows:st3} = await query(`SELECT status FROM alarms WHERE id=$1`,[first.id]);
ok('acknowledged row reopens when it recurs', st3[0].status==='Open', st3[0].status);
// closed -> a brand new row next time
await query(`UPDATE alarms SET status='Closed' WHERE id=$1`,[first.id]);
const fresh = await insertLiveAlarm({alarmType:'DISTURBANCE', deviceIdText:'DEV-01', source:'test'});
ok('closing re-arms: a NEW row is created', fresh.id !== first.id, `${fresh.id}`);
await query(`UPDATE devices SET status='Live' WHERE device_id='DEV-01'`);

console.log('\n== 7. real path untouched ==');
await reset();
const MARKS = { disturb_warn1_sec:60, disturb_warn2_sec:120, disturb_raise_sec:180 };
const d0 = await disturbanceDecision('DEV-01','DISTURBANCE', null, MARKS, null, 1800);
ok('no telemetry -> skip', d0.action==='skip', JSON.stringify(d0));
// TIME, not count: four packets in the same instant is one gust, and raises
// nothing. See timeladder.mjs for the full ladder.
for (let i=0;i<4;i++) await query(`INSERT INTO device_telemetry (device_id, motion_byte, src_ip) VALUES ((SELECT id FROM devices WHERE device_id='DEV-01'),'001',$1)`, ['10.0.0.1']);
const d4 = await disturbanceDecision('DEV-01','DISTURBANCE', null, MARKS, null, 1800);
ok('4 packets in one burst -> NO raise (time rule)', d4.action==='skip', JSON.stringify(d4));
// Sustained for over three minutes -> raise. Packets are inserted in ARRIVAL
// order, one evaluation per packet, exactly as ingest does it — evaluating only
// after backfilling several at once compares the last against the last and sees
// no crossing.
await reset();
await query(`INSERT INTO device_telemetry (device_id, received_at, motion_byte, src_ip)
             VALUES ((SELECT id FROM devices WHERE device_id='DEV-01'), now() - interval '200 seconds', '001','10.0.0.1')`);
await disturbanceDecision('DEV-01','DISTURBANCE', null, MARKS, null, 1800);   // T0
await query(`INSERT INTO device_telemetry (device_id, motion_byte, src_ip)
             VALUES ((SELECT id FROM devices WHERE device_id='DEV-01'), '001','10.0.0.1')`);
const dSus = await disturbanceDecision('DEV-01','DISTURBANCE', null, MARKS, null, 1800);
ok('sustained past 180s -> raise', dSus.action==='raise', JSON.stringify(dSus));
await reset();
await openSession({technicianId:'t1', siteId:1, deviceIds:['DEV-01'], jobType:'install', minutes:30});
for (let i=0;i<4;i++) await query(`INSERT INTO device_telemetry (device_id, motion_byte, src_ip) VALUES ((SELECT id FROM devices WHERE device_id='DEV-01'),'001',$1)`, ['10.0.0.1']);
const dTest = await disturbanceDecision('DEV-01','DISTURBANCE', null, MARKS, null, 1800);
ok('packets DURING a job do NOT arm the real ladder', dTest.elapsedSec===null, JSON.stringify(dTest));
await reset();
for (let i=0;i<4;i++) await query(`INSERT INTO device_telemetry (device_id, motion_byte, src_ip) VALUES ((SELECT id FROM devices WHERE device_id='DEV-01'),'001','batch-test')`);
const dDrill = await disturbanceDecision('DEV-01','DISTURBANCE', null, MARKS, null, 1800);
ok('DRILL packets do NOT arm the real ladder', dDrill.elapsedSec===null, JSON.stringify(dDrill));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
