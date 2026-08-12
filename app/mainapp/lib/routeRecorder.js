// app/mainapp/lib/routeRecorder.js
// Playback export helpers.
//   • buildRouteCsv(...)      — coordinates + incidents CSV (target movement).
//   • startScreenRecording(…) — records the REAL on-screen playback (Google Maps)
//                               via the browser screen-capture API, preferring MP4.
// The caller shares the current tab, we record while the route animates on the
// live map, then stop and hand back the blob. Everything runs in the browser.

function pad2(n) { return (n < 10 ? "0" : "") + n; }
function clock(startSec, t) {
  const s = (startSec || 0) + (t || 0);
  return `${pad2(Math.floor(s / 3600) % 24)}:${pad2(Math.floor((s % 3600) / 60))}:${pad2(Math.floor(s % 60))}`;
}

// ---- CSV -------------------------------------------------------------------
export function buildRouteCsv(route, incidents, deviceId, date) {
  const points = route?.points || [];
  const startSec = route?.start_sec ?? 0;
  const esc = (v) => {
    const s = String(v == null ? "" : v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = [];
  points.forEach((p, i) => rows.push({
    seq: i + 1, type: "move", time: clock(startSec, p.t), elapsed_sec: p.t,
    lat: p.lat, lng: p.lng, speed_kmh: p.spd ?? "", detail: "",
  }));
  (incidents || []).forEach((inc) => rows.push({
    seq: "", type: "INCIDENT", time: clock(startSec, inc.t ?? 0), elapsed_sec: inc.t ?? "",
    lat: inc.lat, lng: inc.lng, speed_kmh: "", detail: `${inc.name || "Alarm"}${inc.priority ? ` (${inc.priority})` : ""}`,
  }));
  rows.sort((a, b) => (Number(a.elapsed_sec) || 0) - (Number(b.elapsed_sec) || 0));
  const header = ["seq", "type", "time", "elapsed_sec", "lat", "lng", "speed_kmh", "detail"];
  const lines = [`# AssetGuard route export — device ${deviceId} — ${date}`];
  lines.push(header.join(","));
  rows.forEach((r) => lines.push(header.map((k) => esc(r[k])).join(",")));
  return lines.join("\r\n");
}

// ---- video mime pick (MP4 first) -------------------------------------------
function pickMime() {
  const MR = typeof window !== "undefined" ? window.MediaRecorder : null;
  const prefs = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4;codecs=avc1.42E01E",
    "video/mp4;codecs=avc1",
    "video/mp4",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  if (MR && MR.isTypeSupported) {
    for (const m of prefs) { try { if (MR.isTypeSupported(m)) return m; } catch {} }
  }
  return "";
}

// ---- screen recording ------------------------------------------------------
// Prompts the user to share the screen/tab, records it, and resolves `done` with
// { blob, name, mime } when stop() is called (or the user ends sharing). Prefer
// choosing "This tab" so the recording is exactly the playback map.
export async function startScreenRecording({ deviceId, date } = {}) {
  if (typeof navigator === "undefined" || !navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
    throw new Error("Screen recording isn't supported in this browser. Try Chrome or Edge.");
  }
  const stream = await navigator.mediaDevices.getDisplayMedia({
    video: { frameRate: 30 },
    audio: false,
    preferCurrentTab: true,       // Chrome hint: offer this tab first
  });

  const mime = pickMime();
  let rec;
  try { rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 3_000_000 } : { videoBitsPerSecond: 3_000_000 }); }
  catch { rec = new MediaRecorder(stream); }

  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };

  const done = new Promise((resolve, reject) => {
    rec.onstop = () => {
      try {
        const type = (rec.mimeType || mime || "video/webm").split(";")[0];
        const ext = type.includes("mp4") ? "mp4" : "webm";
        resolve({ blob: new Blob(chunks, { type }), mime: type, name: `${deviceId}_${date}_playback.${ext}` });
      } catch (e) { reject(e); }
    };
    rec.onerror = (e) => reject(e.error || new Error("Recording failed"));
  });

  // If the user ends sharing from the browser UI, finalize gracefully.
  const vt = stream.getVideoTracks()[0];
  if (vt) vt.addEventListener("ended", () => { try { if (rec.state !== "inactive") rec.stop(); } catch {} });

  rec.start();

  return {
    mime: rec.mimeType || mime,
    stop() {
      try { if (rec.state !== "inactive") rec.stop(); } catch {}
      try { stream.getTracks().forEach((t) => t.stop()); } catch {}
    },
    done,
  };
}
