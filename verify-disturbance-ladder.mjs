import { query } from './s_env/db.js';
import { disturbanceDecision } from './dataControl/alarms.js';

let pass=0, fail=0;
const ok=(n,c,x='')=>{c?(pass++,console.log(`  PASS  ${n}`)):(fail++,console.log(`  FAIL  ${n} ${x}`))};
const MARKS = { disturb_warn1_sec:60, disturb_warn2_sec:120, disturb_raise_sec:180 };

async function reset() {
  await query(`TRUNCATE alarms, device_telemetry, technician_worklog, technician_work_sessions RESTART IDENTITY CASCADE`);
  await query(`DELETE FROM devices; DELETE FROM sites;`);
  await query(`INSERT INTO sites (id, code, name, status) VALUES (1,'NBI-01','HQ','Live')`);
  await query(`INSERT INTO devices (device_id, imei, site_id, status) VALUES ('DEV-01','860001',1,'Live')`);
}
// a disturbance packet N seconds ago
const pkt = (secAgo) => query(
  `INSERT INTO device_telemetry (device_id, received_at, motion_byte, src_ip)
   VALUES ((SELECT id FROM devices WHERE device_id='DEV-01'), now() - ($1 || ' seconds')::interval, '001', '10.0.0.1')`,
  [secAgo]);
const decide = () => disturbanceDecision('DEV-01','DISTURBANCE',null,MARKS,null,1800);

console.log('\n== the ladder ==');
await reset();
await pkt(0);
let d = await decide();
ok('T0 alone -> skip', d.action==='skip' && d.level===0, JSON.stringify(d));

await reset();
await pkt(30); await pkt(20); await pkt(10); await pkt(0);   // a 30s burst
d = await decide();
ok('BURST inside the first minute -> still skip', d.action==='skip', `${d.action} elapsed=${d.elapsedSec}`);

await reset();
await pkt(65); await pkt(0);                                  // T0, then 65s later
d = await decide();
ok('first packet past 60s -> warning 1', d.action==='notify' && d.level===1, JSON.stringify(d));
ok('warning wording payload unchanged (count 2 / threshold 4 -> "1/3")', d.count===2 && d.threshold===4);

await reset();
await pkt(130); await pkt(70); await pkt(0);                  // crosses 60 then 120
d = await decide();
ok('past 120s -> warning 2', d.action==='notify' && d.level===2, JSON.stringify(d));
ok('warning 2 payload -> "2/3"', d.count===3 && d.threshold===4);

await reset();
await pkt(200); await pkt(130); await pkt(70); await pkt(0);
d = await decide();
ok('past 180s -> RAISE', d.action==='raise' && d.level===3, JSON.stringify(d));

console.log('\n== a level fires ONCE ==');
await reset();
// T0 at -120s; then elapsed 70s and elapsed 90s — BOTH inside level 1.
await pkt(120); await pkt(50); await pkt(30);
d = await decide();
ok('second packet in the same window -> skip', d.action==='skip' && d.level===1 && d.prevLevel===1, JSON.stringify(d));

await reset();
// T0 at -300s; then elapsed 200s and elapsed 250s — BOTH past the raise mark.
await pkt(300); await pkt(100); await pkt(50);
d = await decide();
ok('another packet after raising -> skip (not a second raise)', d.action==='skip' && d.level===3 && d.prevLevel===3, JSON.stringify(d));

console.log('\n== sparse uplinks jump straight to the top ==');
await reset();
await pkt(400); await pkt(0);                  // one packet, then nothing for ~6.5 min
d = await decide();
ok('a single late packet raises without warnings', d.action==='raise' && d.prevLevel===0, JSON.stringify(d));

console.log('\n== the 30-minute reset gap ==');
await reset();
await pkt(4000); await pkt(3900);              // an episode ~an hour ago
await pkt(0);                                  // one unrelated bump NOW
d = await decide();
ok('a bump after a quiet hour starts a NEW episode -> skip, NOT raise',
   d.action==='skip' && d.elapsedSec===0, `${d.action} elapsed=${d.elapsedSec}`);

console.log('\n== an open alarm means event, not a second raise ==');
await reset();
await pkt(200); await pkt(0);
await query(`INSERT INTO alarms (id, device_id, alarm_type, name, priority, source, status)
             VALUES ('ALM-X','DEV-01','DISTURBANCE','Disturbance','Critical','device','Open')`);
d = await decide();
ok('open alarm -> event', d.action==='event' && d.existing===true, JSON.stringify(d));
await query(`UPDATE alarms SET status='Closed', closed_at=now() WHERE id='ALM-X'`);
d = await decide();
ok('closing re-arms: episode restarts from the close', d.action!=='event', JSON.stringify(d));

console.log('\n== tests still do not touch the real ladder ==');
await reset();
for (const s of [200,130,70,0]) {
  await query(`INSERT INTO device_telemetry (device_id, received_at, motion_byte, src_ip)
               VALUES ((SELECT id FROM devices WHERE device_id='DEV-01'), now() - ($1 || ' seconds')::interval, '001','batch-test')`,[s]);
}
d = await decide();
ok('drill packets do not drive the real ladder', d.action==='skip' && d.elapsedSec===null, JSON.stringify(d));

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail?1:0);
