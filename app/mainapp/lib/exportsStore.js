// app/mainapp/lib/exportsStore.js
// Session-scoped store for Playback exports. Rows (and their object URLs) live in
// this module for the lifetime of the SPA session, so the Exports page can list
// and replay them across client-side navigations. They are intentionally NOT
// persisted — a full page reload clears them (download-on-demand model).
let seq = 0;
const rows = [];            // newest first
const listeners = new Set();

function emit() { listeners.forEach((fn) => { try { fn(rows.slice()); } catch {} }); }

export function subscribeExports(fn) {
  listeners.add(fn);
  fn(rows.slice());
  return () => listeners.delete(fn);
}

export function listExports() { return rows.slice(); }

// Add a new export row. `video` / `csv` are { url, name } (object URLs). Returns id.
export function addExport({ device, date, durationMin, distanceKm, video, csv, incidents = 0 }) {
  seq += 1;
  const id = `EXP-${String(seq).padStart(3, "0")}`;
  rows.unshift({
    id,
    device: device || "—",
    date: date || "",
    createdAt: new Date().toISOString(),
    durationMin: durationMin ?? null,
    distanceKm: distanceKm ?? null,
    incidents,
    video: video || null,     // { url, name }
    csv: csv || null,         // { url, name }
    status: "Ready",
  });
  emit();
  return id;
}

export function removeExport(id) {
  const i = rows.findIndex((r) => r.id === id);
  if (i >= 0) {
    const r = rows[i];
    try { if (r.video?.url) URL.revokeObjectURL(r.video.url); } catch {}
    try { if (r.csv?.url) URL.revokeObjectURL(r.csv.url); } catch {}
    rows.splice(i, 1);
    emit();
  }
}
