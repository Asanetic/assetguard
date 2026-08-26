// app/api/apiUtils/ingest/geolocate.js
// Rough position from cell towers and/or Wi-Fi via the Google Geolocation API,
// for packets with no GPS fix. The API key comes from the admin "Google Maps"
// settings (Admin → Google Maps); the "Geolocation API" must be enabled on it.
//
// Structured as buildGoogleGeoPayload() + requestGoogleLocation(), with a small
// geolocate() wrapper that maps our parsed telemetry into that shape and caches
// by a (cells + Wi-Fi) fingerprint so a stationary device doesn't bill a call
// on every packet. Any Google error is returned (and stored on the telemetry row
// so it shows in the packet popup).
import { getMapsConfig, getGeoConfig } from "../dataControl/appConfig.js";
import { reserveCall } from "../dataControl/geoUsage.js";

const CACHE = new Map();          // fingerprint -> { location, error }
const CACHE_MAX = 500;

function fingerprint(cells, wifi) {
  const c = (cells || []).map((x) => `${x.lac}:${x.cid}`).sort().join(",");
  const w = (wifi || []).map((x) => String(x.mac).toUpperCase()).sort().join(",");
  return `c[${c}]w[${w}]`;
}

// Build the Google Geolocation request body from a device-data object:
//   { mcc, mnc, baseStations:[{baseStationNumber, areaCode, signal}], wifi:[{mac, signal}] }
export function buildGoogleGeoPayload(deviceData) {
  const mcc = deviceData.mcc || 0;
  const mnc = deviceData.mnc || 0;
  const cellTowers = (deviceData.baseStations || []).map((tower) => ({
    cellId: tower.baseStationNumber,
    locationAreaCode: tower.areaCode,
    mobileCountryCode: mcc,
    mobileNetworkCode: mnc,
    signalStrength: tower.signal,
  }));
  const wifiAccessPoints = (deviceData.wifi || [])
    .filter((wifi) => wifi.mac && wifi.mac !== "" && !isNaN(wifi.signal))
    .map((wifi) => ({ macAddress: wifi.mac, signalStrength: wifi.signal }));
  return {
    homeMobileCountryCode: mcc,
    homeMobileNetworkCode: mnc,
    radioType: "gsm",
    considerIp: false,
    cellTowers,
    wifiAccessPoints,
  };
}

// POST the payload to Google. Returns { lat, lng, accuracy, raw, error }.
// error is a human-readable string when Google can't compute a location.
export async function requestGoogleLocation(payload) {
  let apiKey = "";
  try { apiKey = (await getMapsConfig()).apiKey || ""; } catch {}
  apiKey = apiKey ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.GOOGLE_MAPS_API_KEY || "";
  if (!apiKey) return { lat: null, lng: null, accuracy: null, raw: null, error: "no Google Maps API key configured (Admin → Google Maps)" };

  const url = `https://www.googleapis.com/geolocation/v1/geolocate?key=${encodeURIComponent(apiKey)}`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null);

    if (!response.ok || !data || !data.location) {
      const g = data && data.error;
      const reason = g
        ? `${g.message || "geolocation failed"}${g.errors && g.errors[0]?.reason ? ` (${g.errors[0].reason})` : ""}`
        : (response.status === 404
            ? "Google could not compute a location from these cell towers / Wi-Fi"
            : `Google geolocation HTTP ${response.status}`);
      console.error("[geolocate] failed:", response.status, reason);
      return { lat: null, lng: null, accuracy: null, raw: data, error: reason };
    }

    return {
      lat: data.location.lat,
      lng: data.location.lng,
      accuracy: Math.round(data.accuracy ?? 0) || null,
      raw: data,
      error: null,
    };
  } catch (err) {
    console.error("[geolocate] network error:", err?.message || err);
    return { lat: null, lng: null, accuracy: null, raw: null, error: "network error reaching Google geolocation" };
  }
}

// ---------------------------------------------------------------------------
// BACKUP provider: Unwired Labs LocationAPI. Different (flat) schema from Google:
// mcc/mnc/radio at the top level, cells as {lac,cid}, wifi as {bssid,signal}.
// Returns the SAME shape as requestGoogleLocation so the caller is provider-blind.
// `cfg` is a getGeoConfig() object (carries the token + region). This function
// does NOT check the free-request cap — the caller reserves a slot first.
// ---------------------------------------------------------------------------
export async function requestUnwiredLocation({ cells = [], wifi = [], mcc = 0, mnc = 0 } = {}, cfg = {}) {
  const token = (cfg.unwiredToken || "").trim();
  const region = cfg.unwiredRegion || "us1";
  if (!token) return { lat: null, lng: null, accuracy: null, raw: null, error: "no Unwired Labs token configured" };

  const body = {
    token,
    radio: "gsm",
    mcc: mcc || 0,
    mnc: mnc || 0,
    cells: (cells || [])
      .filter((c) => c.lac != null && c.cid != null)
      .map((c) => ({ lac: c.lac, cid: c.cid })),
    address: 0, // coordinates only — no reverse-geocode credit spent
  };
  const wapts = (wifi || [])
    .filter((w) => w.mac && w.mac !== "" && !isNaN(w.rssi))
    .map((w) => ({ bssid: w.mac, signal: w.rssi }));
  if (wapts.length) body.wifi = wapts;

  const url = `https://${region}.unwiredlabs.com/v2/process.php`;
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => null);
    if (!data || data.status !== "ok" || data.lat == null) {
      const reason = data && data.message
        ? `Unwired: ${data.message}`
        : `Unwired geolocation HTTP ${response.status}`;
      console.error("[geolocate] Unwired failed:", response.status, reason);
      return { lat: null, lng: null, accuracy: null, raw: data, error: reason };
    }
    return {
      lat: data.lat,
      lng: data.lon,
      accuracy: Math.round(data.accuracy ?? 0) || null,
      raw: data,
      error: null,
    };
  } catch (err) {
    console.error("[geolocate] Unwired network error:", err?.message || err);
    return { lat: null, lng: null, accuracy: null, raw: null, error: "network error reaching Unwired Labs" };
  }
}

// ---------------------------------------------------------------------------
// Reverse-geocode a position to its nearest road name, for the Critical Motion
// alarm ("… on Waiyaki Way"). Uses the same admin Google Maps key (the Geocoding
// API must be enabled on it). Cached on a coarse grid (~11 m) so a moving asset
// doesn't bill a call per packet. Returns a road/street string or null.
// ---------------------------------------------------------------------------
const ROAD_CACHE = new Map();
const ROAD_CACHE_MAX = 1000;

export async function reverseGeocodeRoad(lat, lng) {
  if (lat == null || lng == null || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return null;
  const key = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`; // ~11 m grid
  if (ROAD_CACHE.has(key)) return ROAD_CACHE.get(key);

  let apiKey = "";
  try { apiKey = (await getMapsConfig()).apiKey || ""; } catch {}
  apiKey = apiKey || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || "";
  if (!apiKey) return null;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${encodeURIComponent(`${lat},${lng}`)}&result_type=route&key=${encodeURIComponent(apiKey)}`;
  let road = null;
  try {
    const res = await fetch(url);
    const data = await res.json().catch(() => null);
    if (data && data.status === "OK" && Array.isArray(data.results) && data.results.length) {
      // The route-typed result carries the road; fall back to its first address component.
      const r0 = data.results[0];
      const comp = (r0.address_components || []).find((c) => c.types?.includes("route"));
      road = comp?.long_name || r0.formatted_address || null;
    } else if (data && data.status && data.status !== "ZERO_RESULTS") {
      console.warn(`[reverseGeocodeRoad] Google status ${data.status}${data.error_message ? `: ${data.error_message}` : ""}`);
    }
  } catch (e) {
    console.warn("[reverseGeocodeRoad] network error:", e?.message || e);
  }

  if (ROAD_CACHE.size >= ROAD_CACHE_MAX) ROAD_CACHE.delete(ROAD_CACHE.keys().next().value);
  ROAD_CACHE.set(key, road);
  return road;
}

// One lookup attempt — builds the payload, LOGS it to the terminal, and calls Google.
async function locateOnce(cells, wifi, mcc, mnc, label) {
  const deviceData = {
    mcc, mnc,
    baseStations: cells.map((c) => ({ baseStationNumber: c.cid, areaCode: c.lac, signal: c.sig })),
    wifi: wifi.map((w) => ({ mac: w.mac, signal: w.rssi })),
  };
  const payload = buildGoogleGeoPayload(deviceData);
  console.log(`[geolocate] -> Google (${label}): ${JSON.stringify(payload)}`);
  return requestGoogleLocation(payload);
}

/**
 * Wrapper used by the ingest pipeline. Tries cell towers + Wi-Fi together; if that
 * fails, retries with cell towers only (Wi-Fi APs sometimes confuse the lookup).
 * @param {{cells?:Array, wifi?:Array, mcc?:number, mnc?:number}} inp
 * @returns {Promise<{location:{lat,lng,accuracy}|null, error:string|null, raw:any}>}
 */
export async function geolocate({ cells = [], wifi = [], mcc = null, mnc = null } = {}) {
  if (!cells.length && !wifi.length) return { location: null, error: "no cell or Wi-Fi data to locate from", raw: null };

  const fp = fingerprint(cells, wifi);
  if (CACHE.has(fp)) return CACHE.get(fp);

  // Google is the primary resolver — ONE attempt only (no cells-only retry).
  const firstLabel = cells.length && wifi.length ? "cells+wifi" : cells.length ? "cells" : "wifi";
  let r = await locateOnce(cells, wifi, mcc, mnc, firstLabel);
  let usedFallback = false;
  let trials = null; // Unwired usage snapshot (used/cap/remaining/window), when the backup runs

  // --- BACKUP provider: Unwired Labs -----------------------------------------
  // Only when Google produced no location, the backup is enabled, a token is set,
  // and we're still under the free-request cap. reserveCall() atomically claims a
  // slot so we never overrun the trial. A cap-skip does NOT overwrite Google's
  // error, so the packet still shows why Google missed.
  let provider = r.error ? null : "google";
  if (r.error) {
    try {
      const gcfg = await getGeoConfig();
      if (gcfg.unwiredEnabled && gcfg.unwiredToken) {
        const res = await reserveCall("unwired", gcfg.unwiredCapWindow, gcfg.unwiredFreeCap);
        const cap = gcfg.unwiredFreeCap;
        const remaining = Math.max(0, cap - res.count);
        trials = { used: res.count, cap, remaining, window: gcfg.unwiredCapWindow, period: res.period };
        if (!res.allowed) {
          console.warn(`[geolocate] Unwired backup skipped — free cap reached (${res.count}/${cap} for ${res.period})`);
        } else {
          console.log(`[geolocate] -> Unwired backup (request ${res.count}/${cap} for ${res.period}, ${remaining} left)`);
          const u = await requestUnwiredLocation({ cells, wifi, mcc, mnc }, gcfg);
          if (!u.error) {
            r = u;
            provider = "unwired";
          } else {
            r = { ...r, error: `Google: ${r.error}; Unwired backup also failed (${u.error})`, raw: u.raw ?? r.raw };
          }
        }
      }
    } catch (e) {
      console.warn("[geolocate] Unwired backup error:", e?.message || e);
    }
  }

  // Label by the signals the PACKET provided for the network fix, not by which one
  // the provider ended up using — so a packet carrying both cells + Wi-Fi reads
  // "wifi+lbs" even when the combined call fell back to cells-only.
  let source = null;
  if (!r.error) {
    const hc = cells.length > 0, hw = wifi.length > 0;
    source = hc && hw ? "wifi+lbs" : hw ? "wifi" : "lbs";
  }
  void usedFallback;

  const result = r.error
    ? { location: null, error: r.error, raw: r.raw ?? null, source: null, provider: null, trials }
    : { location: { lat: r.lat, lng: r.lng, accuracy: r.accuracy }, error: null, raw: r.raw ?? null, source, provider, trials };

  // Cache successes and stable "not found" misses (not config/network errors).
  const cacheable = !r.error || /could not compute|not\s*found|404/i.test(r.error);
  if (cacheable) { if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value); CACHE.set(fp, result); }
  return result;
}
