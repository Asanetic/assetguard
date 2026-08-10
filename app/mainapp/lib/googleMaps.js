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
