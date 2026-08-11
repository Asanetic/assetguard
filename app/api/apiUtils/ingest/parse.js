// app/api/apiUtils/ingest/parse.js
// -----------------------------------------------------------------------------
// GL-28 "3G" tracker interpreter.  Wire format:
//   [VENDOR*IMEI*LEN(hex)*COMMAND,payload...]
//
// UD/UD2 = location, LK = heartbeat, AL = alarm.
//
// UD payload field order (confirmed against real packets):
//   0 date(DDMMYY) 1 time(HHMMSS) 2 fix(A|V) 3 lat 4 latH 5 lng 6 lngH
//   7 speed 8 angle 9 altitude 10 satellites 11 gsmSignal 12 battery
//   13 steps1 14 steps2 15 statusWord
//   then LBS:  nBase, timingAdvance, MCC, MNC, [LAC, CellID, sig] x nBase
//   then WiFi (optional):  nWifi, [index, MAC, rssi] x nWifi
//   then MEMS (optional tail):  +v, X, Y, Z, roll, pitch, temp
//
// STATUS WORD (8 hex, e.g. 00100008) — two independent flags, device never
// sends 00000000:
//   * 3rd hex digit == '1'  -> DISTURBANCE  (gospel truth)
//   * last hex digit == '9' -> low-battery hint  (battery % is still verified)
//
// FIX:  A = valid GPS fix, V = void / no fix.  0,0 coordinates == no position.
//
// MEMS:  accelerometer measures gravity + motion.  At rest |X,Y,Z| ~ 1000 mg,
// so the dynamic (motion) component is | sqrt(X^2+Y^2+Z^2) - 1000 |.
// -----------------------------------------------------------------------------

const GRAVITY_MG = 1000;

export function extractFrames(buf) {
  const frames = [];
  let rest = buf || "";
  while (true) {
    const start = rest.indexOf("[");
    if (start < 0) { rest = ""; break; }
    const end = rest.indexOf("]", start);
    if (end < 0) { rest = rest.slice(start); break; }
    frames.push(rest.slice(start, end + 1));
    rest = rest.slice(end + 1);
  }
  return { frames, rest };
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const intOf = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };
const isHex8 = (v) => /^[0-9A-Fa-f]{8}$/.test(String(v || "").replace(/\s+/g, ""));

function signedLat(v, h) { const n = Math.abs(parseFloat(v)); if (!Number.isFinite(n)) return null; return String(h).toUpperCase() === "S" ? -n : n; }
function signedLng(v, h) { const n = Math.abs(parseFloat(v)); if (!Number.isFinite(n)) return null; return String(h).toUpperCase() === "W" ? -n : n; }

function buildTime(d, t) {
  if (!d || !t || d.length < 6 || t.length < 6) return null;
  const dd = +d.slice(0, 2), mm = +d.slice(2, 4), yy = +d.slice(4, 6);
  const HH = +t.slice(0, 2), MM = +t.slice(2, 4), SS = +t.slice(4, 6);
  if ([dd, mm, yy, HH, MM, SS].some((x) => Number.isNaN(x))) return null;
  const ms = Date.UTC(2000 + yy, mm - 1, dd, HH, MM, SS);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function isNullIsland(lat, lng) { return lat != null && lng != null && Math.abs(lat) < 1e-9 && Math.abs(lng) < 1e-9; }

// Peel the fixed 7-token MEMS tail [+v,x,y,z,roll,pitch,temp] off the end.
function extractMems(fields) {
  if (fields.length >= 7 && /^[+-][01]$/.test(String(fields[fields.length - 7]).trim())) {
    const t = fields.slice(fields.length - 7);
    const valid = String(t[0]).trim() === "+1";
    const x = valid ? intOf(t[1]) : null, y = valid ? intOf(t[2]) : null, z = valid ? intOf(t[3]) : null;
    let dynamic = null;
    if (valid && x != null && y != null && z != null) dynamic = Math.round(Math.abs(Math.sqrt(x * x + y * y + z * z) - GRAVITY_MG));
    const mems = { valid, x, y, z, roll: valid ? num(t[4]) : null, pitch: valid ? num(t[5]) : null, temperature: num(t[6]), dynamic };
    return { mems, rest: fields.slice(0, fields.length - 7) };
  }
  return { mems: null, rest: fields };
}

// Decode the 8-hex status word into its two flags.
export function decodeStatus(word) {
  const s = String(word || "").replace(/\s+/g, "").toUpperCase();
  return {
    word: s || null,
    disturbance: s.length >= 3 && s[2] === "1",   // 3rd digit — gospel disturbance flag
    lowBattery: s.length >= 1 && s.slice(-1) === "9", // last digit — low-battery hint
  };
}

function parseLocation(allFields) {
  // 1) peel MEMS tail
  const { mems, rest: fields } = extractMems(allFields);

  // 2) fixed head
  const [date, time, fix, lat, latH, lng, lngH, speed, angle, altitude, sats, gsm, battery] = fields;
  const steps1 = intOf(fields[13]), steps2 = intOf(fields[14]);
  let latN = signedLat(lat, latH), lngN = signedLng(lng, lngH);
  if (isNullIsland(latN, lngN)) { latN = null; lngN = null; }
  const fixFlag = String(fix || "").toUpperCase();
  const fixValid = fixFlag === "A" && latN != null && lngN != null;

  const out = {
    fix: fixFlag || null,
    fixValid,
    lat: fixValid ? latN : null,      // only trust GPS coords on a valid fix
    lng: fixValid ? lngN : null,
    speed: num(speed),
    course: intOf(angle),
    altitude: num(altitude),
    satellites: intOf(sats),
    signal: intOf(gsm),
    battery: intOf(battery),
    steps1, steps2,
    steps: Math.max(steps1 || 0, steps2 || 0) || null,   // pedometer proxy (movement without GPS)
    deviceTime: buildTime(date, time),
    accuracy: fixValid ? 10 : null,   // GPS fix ≈ ±10 m; network fills this in later
    locSource: fixValid ? "gps" : null,
    motionByte: null,
    statusHex: null,
    status: { word: null, disturbance: false, lowBattery: false },
    mcc: null, mnc: null, lac: null, cellId: null,
    cells: [], wifi: [], mems,
    networkLocated: false,
  };

  // 3) status word — normally index 15; fall back to the first 8-hex token.
  let sIdx = fields.findIndex((v, i) => i >= 13 && isHex8(v));
  if (sIdx < 0 && isHex8(fields[15])) sIdx = 15;
  if (sIdx > -1) {
    const word = String(fields[sIdx]).replace(/\s+/g, "");
    out.motionByte = word;
    out.statusHex = word;
    out.status = decodeStatus(word);

    // 4) LBS: nBase, TA, MCC, MNC, [LAC, CID, sig] x nBase
    let i = sIdx + 1;
    const nBase = Math.min(20, Math.max(0, intOf(fields[i++]) ?? 0));
    i++; // timing advance (reserved / 0xFF)
    out.mcc = intOf(fields[i++]); out.mnc = intOf(fields[i++]);
    for (let k = 0; k < nBase && i + 2 < fields.length + 1 && i + 2 <= fields.length; k++) {
      out.cells.push({ lac: intOf(fields[i]), cid: intOf(fields[i + 1]), sig: intOf(fields[i + 2]) });
      i += 3;
    }
    if (out.cells.length) { out.lac = out.cells[0].lac; out.cellId = out.cells[0].cid; }

    // 5) WiFi (optional): nWifi, [idx, MAC, rssi] x nWifi
    if (i < fields.length) {
      const nWifi = Math.min(30, Math.max(0, intOf(fields[i++]) ?? 0));
      for (let k = 0; k < nWifi && i + 2 <= fields.length; k++) {
        out.wifi.push({ seq: fields[i], mac: fields[i + 1], rssi: intOf(fields[i + 2]) });
        i += 3;
      }
    }
  }

  out.networkLocated = !fixValid && (out.cells.length > 0 || out.wifi.length > 0);
  return out;
}

export function parseFrame(frame) {
  const inner = String(frame).replace(/^\[/, "").replace(/\]$/, "");
  const star = inner.split("*");
  const prefix = star[0] || "";
  const imei = star[1] || "";
  const lenHex = star[2] || "";
  const body = star.slice(3).join("*");
  const comma = body.split(",");
  const cmd = (comma[0] || "").toUpperCase();
  const fields = comma.slice(1);

  const rec = { prefix, imei, lenHex, cmd, fields, raw: String(frame) };
  if (cmd === "UD" || cmd === "UD2" || cmd === "AL") Object.assign(rec, parseLocation(fields));
  return rec;
}

// Normalized telemetry object (what the DB + alarm engine consume).
export function toTelemetry(rec) {
  return {
    imei: rec.imei, cmd: rec.cmd,
    deviceTime: rec.deviceTime ?? null,
    fix: rec.fix ?? null, fixValid: !!rec.fixValid,
    lat: rec.lat ?? null, lng: rec.lng ?? null,
    speed: rec.speed ?? null, course: rec.course ?? null,
    altitude: rec.altitude ?? null, satellites: rec.satellites ?? null,
    signal: rec.signal ?? null, battery: rec.battery ?? null,
    steps: rec.steps ?? null, steps1: rec.steps1 ?? null, steps2: rec.steps2 ?? null,
    accuracy: rec.accuracy ?? null, locSource: rec.locSource ?? null, geoError: rec.geoError ?? null, geoRaw: rec.geoRaw ?? null,
    motionByte: rec.motionByte ?? null,
    status: rec.status ?? { word: null, disturbance: false, lowBattery: false },
    mcc: rec.mcc ?? null, mnc: rec.mnc ?? null, lac: rec.lac ?? null, cellId: rec.cellId ?? null,
    cells: rec.cells ?? [], wifi: rec.wifi ?? [],
    mems: rec.mems ?? null,
    networkLocated: !!rec.networkLocated,
    raw: rec.raw,
  };
}
