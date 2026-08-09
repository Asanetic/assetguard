// app/api/apiUtils/ingest/parse.js
// -----------------------------------------------------------------------------
// Parse the tracker wire format:  [VENDOR*IMEI*LEN(hex)*COMMAND,payload...]
// Confirmed from a real sample:
//   [3G*863957075080470*006A*UD,310726,175332,A,1.541982,S,37.261975,E,0.00,248,...]
// UD/UD2 = location, LK = heartbeat, AL = alarm.
// -----------------------------------------------------------------------------

// Pull complete [...] frames out of a (possibly partial) buffer.
// Returns { frames: string[], rest: string } — rest is the incomplete tail.
export function extractFrames(buf) {
  const frames = [];
  let rest = buf || "";
  while (true) {
    const start = rest.indexOf("[");
    if (start < 0) { rest = ""; break; }
    const end = rest.indexOf("]", start);
    if (end < 0) { rest = rest.slice(start); break; } // wait for the rest
    frames.push(rest.slice(start, end + 1));
    rest = rest.slice(end + 1);
  }
  return { frames, rest };
}

const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
const intOf = (v) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : null; };

function signedLat(v, h) {
  const n = Math.abs(parseFloat(v));
  if (!Number.isFinite(n)) return null;
  return String(h).toUpperCase() === "S" ? -n : n;
}
function signedLng(v, h) {
  const n = Math.abs(parseFloat(v));
  if (!Number.isFinite(n)) return null;
  return String(h).toUpperCase() === "W" ? -n : n;
}

// DDMMYY + HHMMSS (UTC) -> ISO string, or null.
function buildTime(d, t) {
  if (!d || !t || d.length < 6 || t.length < 6) return null;
  const dd = +d.slice(0, 2), mm = +d.slice(2, 4), yy = +d.slice(4, 6);
  const HH = +t.slice(0, 2), MM = +t.slice(2, 4), SS = +t.slice(4, 6);
  if ([dd, mm, yy, HH, MM, SS].some((x) => Number.isNaN(x))) return null;
  const ms = Date.UTC(2000 + yy, mm - 1, dd, HH, MM, SS);
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

function parseLocation(fields) {
  const [date, time, fix, lat, latH, lng, lngH, speed, course] = fields;
  const out = {
    fix: fix || null,
    lat: signedLat(lat, latH),
    lng: signedLng(lng, lngH),
    speed: num(speed),
    course: intOf(course),
    deviceTime: buildTime(date, time),
    statusHex: null, mcc: null, mnc: null, lac: null, cellId: null,
  };
  // Device status/alarm bitmask = the first 8-hex-char token.
  const hexIdx = fields.findIndex((x) => /^[0-9A-Fa-f]{8}$/.test(String(x)));
  if (hexIdx > -1) {
    out.statusHex = fields[hexIdx];
    // LBS cell block sits after the status word: [.., mcc, mnc, lac, cellId, signal].
    const tail = fields.slice(hexIdx + 1);
    if (tail.length >= 6) {
      out.mcc = intOf(tail[2]); out.mnc = intOf(tail[3]);
      out.lac = intOf(tail[4]); out.cellId = intOf(tail[5]);
    }
  }
  return out;
}

// Parse one frame string -> structured record.
export function parseFrame(frame) {
  const inner = String(frame).replace(/^\[/, "").replace(/\]$/, "");
  const star = inner.split("*");
  const prefix = star[0] || "";
  const imei = star[1] || "";
  const lenHex = star[2] || "";
  const body = star.slice(3).join("*");     // "UD,310726,..." (payload has commas, not stars)
  const comma = body.split(",");
  const cmd = (comma[0] || "").toUpperCase();
  const fields = comma.slice(1);

  const rec = { prefix, imei, lenHex, cmd, fields, raw: String(frame) };
  if (cmd === "UD" || cmd === "UD2" || cmd === "AL") Object.assign(rec, parseLocation(fields));
  return rec;
}
