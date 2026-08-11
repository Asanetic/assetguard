// app/api/apiUtils/ingest/simPackets.js
// Shared GL-28 packet builder — used by both the CLI simulator (ingest/simulator.js)
// and the in-app Device Simulator API, so crafted packets stay identical to what
// the parser expects. No I/O here; pure string building.
//
// Field order matches app/api/apiUtils/ingest/parse.js:
//   UD,date,time,fix,lat,latH,lng,lngH,speed,angle,alt,sats,gsm,batt,
//      steps1,steps2,motionByte, nBase, area,cell,sig, mcc,mnc,delay,
//      wifiName,wifiMac,wifiSig, +memsValid,x,y,z,roll,pitch,temp

export const SCENARIOS = ["normal", "disturbance", "overspeed", "lowbattery", "geofence", "carry"];

const pad = (n, w) => String(n).padStart(w, "0");
function stamp(d) {
  const dt = d || new Date();
  const date = pad(dt.getUTCDate(), 2) + pad(dt.getUTCMonth() + 1, 2) + pad(dt.getUTCFullYear() % 100, 2);
  const time = pad(dt.getUTCHours(), 2) + pad(dt.getUTCMinutes(), 2) + pad(dt.getUTCSeconds(), 2);
  return { date, time };
}

// Build one UD packet. `opts` overrides the interesting fields.
export function buildUD(opts = {}) {
  const {
    imei = "863957075080470",
    lat = -1.542, lng = 37.262, speed = 0, battery = 90,
    motionByte = "00000008", sats = 9, gsm = 80, altitude = 1650, angle = 0,
    mems = { valid: true, x: 20, y: -12, z: 1010, roll: 0.4, pitch: 0.9, temp: 30.2 },
    fix = "A", date,
  } = opts;
  const { date: dt, time } = stamp(date);
  const hasFix = lat != null && lng != null;
  const aLat = hasFix ? Math.abs(lat).toFixed(6) : "0.0";
  const aLng = hasFix ? Math.abs(lng).toFixed(6) : "0.0";
  const latH = (lat ?? 0) < 0 ? "S" : "N", lngH = (lng ?? 0) < 0 ? "W" : "E";
  const memsTail = mems
    ? `,${mems.valid ? "+1" : "+0"},${mems.valid ? mems.x : 0},${mems.valid ? mems.y : 0},${mems.valid ? mems.z : 0},${mems.valid ? (mems.roll ?? 0) : "0.0"},${mems.valid ? (mems.pitch ?? 0) : "0.0"},${mems.temp ?? mems.temperature ?? 29.0}`
    : "";
  const body =
    `UD,${dt},${time},${hasFix ? fix : "V"},${aLat},${latH},${aLng},${lngH},` +
    `${speed},${angle},${altitude},${sats},${gsm},${battery},0,0,${motionByte},` +
    `1,255,639,02,10256,93847880,155,` +
    `HomeWiFi,F4:2A:7D:50:DD:C6,-87` +
    memsTail;
  const len = pad(body.length.toString(16).toUpperCase(), 4);
  return `[3G*${imei}*${len}*${body}]`;
}

// Return the packet(s) for a named scenario. `base` supplies the device's site
// coordinates so "normal" sits inside the geofence and only "geofence" exits.
export function scenarioPackets(name, base = {}) {
  const imei = base.imei || "863957075080470";
  const lat = base.lat != null ? Number(base.lat) : -1.542;
  const lng = base.lng != null ? Number(base.lng) : 37.262;
  const far = { lat: lat + 0.02, lng: lng + 0.02 };  // ≈ 3 km away
  const off = { lat: lat + 0.0006, lng: lng + 0.0006 }; // ≈ 90 m — just outside the 30 m fence
  // "carry": no GPS fix + sustained MEMS movement (dynamic ≈ 654 mg each) — the
  // first packet reads as a disturbance spike, then it escalates to critical motion.
  const carryPkt = () => buildUD({ imei, lat: null, lng: null, motionByte: "00000008", mems: { valid: true, x: 200, y: 200, z: 200, roll: 2, pitch: -3, temp: 30 } });
  const map = {
    normal: [buildUD({ imei, lat, lng })],
    disturbance: [buildUD({ imei, lat, lng, motionByte: "00100008" })],
    overspeed: [buildUD({ imei, lat: off.lat, lng: off.lng, speed: 92 })], // off-site so critical applies
    lowbattery: [buildUD({ imei, lat, lng, battery: 12, motionByte: "00000009" })],
    geofence: [buildUD({ imei, lat: far.lat, lng: far.lng, speed: 40 })],
    carry: [carryPkt(), carryPkt(), carryPkt()],
  };
  if (name === "all") {
    return [
      ...map.normal, ...map.disturbance, ...map.overspeed, ...map.lowbattery, ...map.geofence,
      ...map.carry,
      buildUD({ imei, lat, lng, mems: { valid: false, temp: 28.5 } }), // MEMS-invalid
    ];
  }
  return map[name] || map.normal;
}
