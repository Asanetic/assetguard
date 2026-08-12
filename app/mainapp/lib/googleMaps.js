// app/mainapp/lib/googleMaps.js
// Shared Google Maps loader for every maps page in the app.
//
// Usage in a client component:
//   import { fetchMapsConfig, loadGoogleMaps } from "../lib/googleMaps.js";
//   const cfg = await fetchMapsConfig();
//   const maps = await loadGoogleMaps(cfg);
//   const map = new maps.Map(el, { center: cfg.defaultCenter, zoom: cfg.defaultZoom, mapTypeId: cfg.mapType });
//
// The API key + defaults come from the admin "Google Maps" settings page
// (persisted server-side), so pages never hard-code a key.

let _loadPromise = null;

// ---- shared site status colour + marker icon (used by every map) ----
export const SITE_STATUS_COLOR = {
  live: "#10B981", testing: "#F59E0B", offline: "#EF4444", inactive: "#8B5CF6",
  maintenance: "#0EA5E9", smpms: "#EC4899", pending: "#64748B",
};
export function siteStatusColor(status) {
  return SITE_STATUS_COLOR[String(status || "pending").toLowerCase()] || "#64748B";
}
/** A status-coloured map-pin marker icon (disc + white ring + map-pin glyph). */
export function sitePinIcon(maps, status) {
  const color = siteStatusColor(status);
  const B = 40;
  const glyph = '<path d="M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z"/><circle cx="12" cy="11" r="3"/>';
  const scale = (B * 14 / 32) / 24;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<circle cx="${B / 2}" cy="${B / 2}" r="${B / 2 - 3}" fill="${color}" stroke="#fff" stroke-width="3"/>` +
    `<g transform="translate(${B / 2},${B / 2}) scale(${scale}) translate(-12,-12)" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">${glyph}</g>` +
    `</svg>`;
  return { url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg), scaledSize: new maps.Size(B, B), anchor: new maps.Point(B / 2, B / 2) };
}

// ---- device status colour + rounded-square "cpu" marker (devices map) ----
// The devices map uses square chips (not teardrop pins): a status-coloured
// rounded square holding a white CPU glyph, and per-site clusters that carry a
// count badge. Statuses: Live | Offline | Testing | Inactive | Maintenance.
export const DEVICE_STATUS_COLOR = {
  live: "#10B981", offline: "#EF4444", testing: "#F59E0B",
  inactive: "#8B5CF6", maintenance: "#0EA5E9", smpms: "#EC4899", pending: "#64748B",
};
export const DEVICE_STATUS_ORDER = ["Live", "Offline", "Testing", "Inactive", "Maintenance"];
export function deviceStatusColor(status) {
  return DEVICE_STATUS_COLOR[String(status || "pending").toLowerCase()] || "#64748B";
}

const CPU_GLYPH =
  '<path d="M5 6a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v12a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1z"/>' +
  '<path d="M9 9h6v6h-6z"/><path d="M3 10h2"/><path d="M3 14h2"/><path d="M10 3v2"/><path d="M14 3v2"/>' +
  '<path d="M21 10h-2"/><path d="M21 14h-2"/><path d="M10 21v-2"/><path d="M14 21v-2"/>';

function toIcon(maps, svg, B) {
  return {
    url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
    scaledSize: new maps.Size(B, B), anchor: new maps.Point(B / 2, B / 2),
  };
}

/** A single device marker — status-coloured rounded square with a CPU glyph. */
export function devicePinIcon(maps, status) {
  const color = deviceStatusColor(status);
  const B = 34, pad = 3, r = 9, gs = 16 / 24;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<rect x="${pad}" y="${pad}" width="${B - 2 * pad}" height="${B - 2 * pad}" rx="${r}" fill="${color}" stroke="#fff" stroke-width="2.5"/>` +
    `<g transform="translate(${B / 2},${B / 2}) scale(${gs}) translate(-12,-12)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CPU_GLYPH}</g>` +
    `</svg>`;
  return toIcon(maps, svg, B);
}

/**
 * A per-site cluster marker. Solid when every device shares a status, otherwise
 * split into vertical status stripes. Carries a navy count badge.
 */
export function deviceClusterIcon(maps, devices = []) {
  const B = 42, pad = 3, r = 11, inner = B - 2 * pad, gs = 17 / 24;
  const present = DEVICE_STATUS_ORDER.filter((s) => devices.some((d) => String(d.status) === s));
  let fillLayer;
  if (present.length <= 1) {
    fillLayer = `<rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="${present.length ? deviceStatusColor(present[0]) : "#14315D"}"/>`;
  } else {
    const w = inner / present.length;
    const stripes = present.map((s, i) =>
      `<rect x="${pad + i * w}" y="${pad}" width="${w + 0.5}" height="${inner}" fill="${deviceStatusColor(s)}"/>`).join("");
    fillLayer = `<clipPath id="cc"><rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}"/></clipPath><g clip-path="url(#cc)">${stripes}</g>`;
  }
  const n = devices.length;
  const bx = B - 8, by = 8;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    fillLayer +
    `<rect x="${pad}" y="${pad}" width="${inner}" height="${inner}" rx="${r}" fill="none" stroke="#fff" stroke-width="2.5"/>` +
    `<g transform="translate(${B / 2},${B / 2}) scale(${gs}) translate(-12,-12)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CPU_GLYPH}</g>` +
    `<circle cx="${bx}" cy="${by}" r="8.5" fill="#14315D" stroke="#fff" stroke-width="2"/>` +
    `<text x="${bx}" y="${by + 3.2}" font-family="system-ui,Arial,sans-serif" font-size="10" font-weight="700" fill="#fff" text-anchor="middle">${n}</text>` +
    `</svg>`;
  return toIcon(maps, svg, B);
}

/**
 * A pulsing-"wave" layer for Live pins. Google Marker icons are static images
 * and can't animate, so we mount a DOM layer in the map's overlay pane and drop
 * a CSS-animated ring behind each live position. Because the ring lives in a map
 * pane, Google translates/rescales it with the map — no per-frame repositioning.
 *
 * Returns an OverlayView with `setPoints([{lat,lng}])`; call it whenever the set
 * of live pins changes (e.g. after (re)drawing markers). `ringClass` is the
 * hashed CSS-module class for the ring (circular for sites, rounded for devices).
 */
export function createWaveOverlay(maps, map, ringClass) {
  const overlay = new maps.OverlayView();
  let points = [];
  let layer = null;
  overlay.onAdd = function () {
    layer = document.createElement("div");
    layer.style.position = "absolute";
    layer.style.left = "0"; layer.style.top = "0";
    const panes = this.getPanes();
    (panes.overlayLayer || panes.mapPane).appendChild(layer);
  };
  overlay.onRemove = function () { if (layer && layer.parentNode) layer.parentNode.removeChild(layer); layer = null; };
  overlay.draw = function () {
    if (!layer) return;
    const proj = this.getProjection();
    if (!proj) return;
    while (layer.childNodes.length < points.length) {
      const r = document.createElement("div"); r.className = ringClass; layer.appendChild(r);
    }
    while (layer.childNodes.length > points.length) layer.removeChild(layer.lastChild);
    for (let i = 0; i < points.length; i++) {
      const pt = proj.fromLatLngToDivPixel(new maps.LatLng(points[i].lat, points[i].lng));
      if (!pt) continue;
      const el = layer.childNodes[i];
      el.style.left = Math.round(pt.x) + "px";
      el.style.top = Math.round(pt.y) + "px";
      // optional per-point ring colour (alarms colour by severity); the ring's
      // pseudo-elements read this via var(--wave-color).
      if (points[i].color) el.style.setProperty("--wave-color", points[i].color);
    }
  };
  overlay.setPoints = function (arr) { points = Array.isArray(arr) ? arr : []; this.draw(); };
  overlay.setMap(map);
  return overlay;
}

// ---- alarm severity colour + pin (alarms landing map) ----
// Critical (disturbance / geofence / critical motion) | High | Medium | Low.
export const ALARM_SEVERITY_COLOR = { critical: "#EF4444", high: "#F59E0B", medium: "#2E6CF5", low: "#94A3B8" };
export const ALARM_SEVERITIES = ["Critical", "High", "Medium", "Low"];
export function alarmSeverityColor(sev) {
  return ALARM_SEVERITY_COLOR[String(sev || "low").toLowerCase()] || "#94A3B8";
}
const ALERT_GLYPH =
  '<path d="M12 9v4"/>' +
  '<path d="M10.363 3.591l-8.106 13.534a1.914 1.914 0 0 0 1.636 2.871h16.214a1.914 1.914 0 0 0 1.636 -2.87l-8.106 -13.536a1.914 1.914 0 0 0 -3.274 0z"/>' +
  '<path d="M12 16h.01"/>';
/** A severity-coloured alarm marker: filled disc + white alert-triangle glyph. */
export function alarmPinIcon(maps, severity) {
  const color = alarmSeverityColor(severity);
  const B = 44, gs = 22 / 24;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<circle cx="${B / 2}" cy="${B / 2}" r="${B / 2 - 3}" fill="${color}" stroke="#fff" stroke-width="3"/>` +
    `<g transform="translate(${B / 2},${B / 2}) scale(${gs}) translate(-12,-12)" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${ALERT_GLYPH}</g>` +
    `</svg>`;
  return toIcon(maps, svg, B);
}

// ---- route playback markers ----
const NAV_GLYPH = '<path d="M12 2l7 19 -7 -4 -7 4z" />';
/** The moving vehicle marker — navy disc + white navigation arrow, rotatable. */
export function playbackVehicleIcon(maps, heading = 0) {
  const B = 42, gs = 20 / 24;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<circle cx="${B / 2}" cy="${B / 2}" r="${B / 2 - 3}" fill="#14315D" stroke="#fff" stroke-width="3"/>` +
    `<g transform="translate(${B / 2},${B / 2}) rotate(${Math.round(heading)}) scale(${gs}) translate(-12,-12)" fill="#fff" stroke="#fff" stroke-width="1.4" stroke-linejoin="round">${NAV_GLYPH}</g>` +
    `</svg>`;
  return toIcon(maps, svg, B);
}
/** The pursued target device marker (red disc + white navigation arrow). */
export function targetDeviceIcon(maps, heading = 0) {
  const B = 44, gs = 21 / 24;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<circle cx="${B / 2}" cy="${B / 2}" r="${B / 2 - 3}" fill="#EF4444" stroke="#fff" stroke-width="3"/>` +
    `<g transform="translate(${B / 2},${B / 2}) rotate(${Math.round(heading)}) scale(${gs}) translate(-12,-12)" fill="#fff" stroke="#fff" stroke-width="1.4" stroke-linejoin="round">${NAV_GLYPH}</g>` +
    `</svg>`;
  return toIcon(maps, svg, B);
}

/** The operator's own position marker (blue disc + white navigation arrow). */
export function myLocationIcon(maps, heading = 0) {
  const B = 40, gs = 19 / 24;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<circle cx="${B / 2}" cy="${B / 2}" r="${B / 2 - 3}" fill="#2E6CF5" stroke="#fff" stroke-width="3"/>` +
    `<g transform="translate(${B / 2},${B / 2}) rotate(${Math.round(heading)}) scale(${gs}) translate(-12,-12)" fill="#fff" stroke="#fff" stroke-width="1.4" stroke-linejoin="round">${NAV_GLYPH}</g>` +
    `</svg>`;
  return toIcon(maps, svg, B);
}

/** A responder's position marker — same navigation arrow, distinct colour so it
 *  reads apart from the red target and the blue my-location markers. */
export function responderNavIcon(maps, heading = 0, color = "#059669") {
  const B = 40, gs = 19 / 24;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<circle cx="${B / 2}" cy="${B / 2}" r="${B / 2 - 3}" fill="${color}" stroke="#fff" stroke-width="3"/>` +
    `<g transform="translate(${B / 2},${B / 2}) rotate(${Math.round(heading)}) scale(${gs}) translate(-12,-12)" fill="#fff" stroke="#fff" stroke-width="1.4" stroke-linejoin="round">${NAV_GLYPH}</g>` +
    `</svg>`;
  return toIcon(maps, svg, B);
}

/** A small coloured dot marker for route start / stop / end. */
export function routeDotIcon(maps, color) {
  const B = 16;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<circle cx="${B / 2}" cy="${B / 2}" r="${B / 2 - 2}" fill="${color}" stroke="#fff" stroke-width="2.5"/>` +
    `</svg>`;
  return toIcon(maps, svg, B);
}

/** Small navy "×" button used to collapse an exploded same-pole cluster. */
export function collapsePinIcon(maps) {
  const B = 22;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${B}" height="${B}" viewBox="0 0 ${B} ${B}">` +
    `<circle cx="11" cy="11" r="9" fill="#14315D" stroke="#fff" stroke-width="2"/>` +
    `<path d="M8 8l6 6M14 8l-6 6" stroke="#fff" stroke-width="2" stroke-linecap="round"/>` +
    `</svg>`;
  return toIcon(maps, svg, B);
}

/** Fetch the current maps configuration (key, libraries, default view). */
export async function fetchMapsConfig() {
  const res = await fetch("/api/mainapp/maps-config", { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load maps configuration");
  const data = await res.json();
  return data.config;
}

/**
 * Load the Google Maps JavaScript API exactly once per page. Resolves with the
 * `google.maps` namespace (with the core `maps` library — and any requested
 * libraries — already imported, so `maps.Map` is a real constructor). Rejects
 * if there's no key / the key is rejected / the script fails to load.
 *
 * With the modern `loading=async` bootstrap, the script only exposes
 * `google.maps.importLibrary`; the actual classes (Map, Marker, …) don't exist
 * until you import their library. This loader does that import for you, which is
 * why `new maps.Map(...)` works after it resolves.
 *
 * @param {{ apiKey: string, libraries?: string[] }} cfg
 * @returns {Promise<typeof google.maps>}
 */
export function loadGoogleMaps(cfg = {}) {
  const { apiKey, libraries = [] } = cfg;
  if (typeof window === "undefined") return Promise.reject(new Error("Not in a browser"));
  // Already fully loaded (Map constructor present) — reuse it.
  if (window.google && window.google.maps && window.google.maps.Map) return Promise.resolve(window.google.maps);
  if (_loadPromise) return _loadPromise;

  _loadPromise = new Promise((resolve, reject) => {
    if (!apiKey) { _loadPromise = null; return reject(new Error("No Google Maps API key is configured")); }

    // Google calls this global when a key is invalid or unauthorised.
    window.gm_authFailure = () => {
      _loadPromise = null;
      reject(new Error("Google rejected this API key — check the key and its HTTP referrer restrictions."));
    };

    const finish = async () => {
      const started = performance.now();
      // Wait for the async bootstrap to attach importLibrary.
      while (!(window.google && window.google.maps && window.google.maps.importLibrary)) {
        if (performance.now() - started > 8000) { _loadPromise = null; return reject(new Error("Maps API did not initialise.")); }
        await new Promise((r) => setTimeout(r, 50));
      }
      try {
        // Import the core library (gives us Map, InfoWindow, …) plus any extras,
        // and merge the returned classes onto google.maps so `maps.Map` exists.
        const wanted = ["maps", ...libraries.filter((l) => l !== "maps")];
        for (const lib of wanted) {
          try { Object.assign(window.google.maps, await window.google.maps.importLibrary(lib)); }
          catch { /* a bad library name shouldn't abort the whole load */ }
        }
        if (!window.google.maps.Map) { _loadPromise = null; return reject(new Error("Maps library did not load.")); }
        resolve(window.google.maps);
      } catch {
        _loadPromise = null;
        reject(new Error("Failed to initialise Google Maps."));
      }
    };

    const existing = document.getElementById("ag-gmaps-js");
    if (existing) existing.remove();

    const libs = libraries.length ? `&libraries=${libraries.join(",")}` : "";
    const s = document.createElement("script");
    s.id = "ag-gmaps-js";
    s.async = true;
    s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}${libs}&loading=async`;
    s.onerror = () => { _loadPromise = null; reject(new Error("Failed to load the Google Maps script.")); };
    s.onload = finish;
    document.head.appendChild(s);
  });
  return _loadPromise;
}

/** Reset the loader (used by the settings page's "Test key" so a new key reloads). */
export function resetGoogleMaps() {
  _loadPromise = null;
  const existing = typeof document !== "undefined" && document.getElementById("ag-gmaps-js");
  if (existing) existing.remove();
  if (typeof window !== "undefined" && window.google) { try { delete window.google; } catch { window.google = undefined; } }
}
