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
import { getMapsConfig } from "../dataControl/appConfig.js";

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

  const firstLabel = cells.length && wifi.length ? "cells+wifi" : cells.length ? "cells" : "wifi";
  let r = await locateOnce(cells, wifi, mcc, mnc, firstLabel);
  let usedFallback = false;

  // Fallback: if Google couldn't compute a location (a bad/unknown Wi-Fi AP can
  // do that) and we still have cell towers, retry with cell towers only.
  const notLocatable = r.error && /could not compute|not\s*found|404|invalid|geolocation failed/i.test(r.error);
  if (notLocatable && cells.length && wifi.length) {
    console.warn(`[geolocate] combined lookup failed (${r.error}); retrying with cell towers only`);
    const r2 = await locateOnce(cells, [], mcc, mnc, "cells-only");
    if (!r2.error) { r = r2; usedFallback = true; }
    else r = { ...r2, error: `cells+Wi-Fi failed (${r.error}); cells-only also failed (${r2.error})` };
  }

  // Which signals actually produced the fix: lbs (cells) / wifi / wifi+lbs.
  let source = null;
  if (!r.error) source = usedFallback ? "lbs" : (cells.length && wifi.length ? "wifi+lbs" : wifi.length ? "wifi" : "lbs");

  const result = r.error
    ? { location: null, error: r.error, raw: r.raw ?? null, source: null }
    : { location: { lat: r.lat, lng: r.lng, accuracy: r.accuracy }, error: null, raw: r.raw ?? null, source };

  // Cache successes and stable "not found" misses (not config/network errors).
  const cacheable = !r.error || /could not compute|not\s*found|404/i.test(r.error);
  if (cacheable) { if (CACHE.size >= CACHE_MAX) CACHE.delete(CACHE.keys().next().value); CACHE.set(fp, result); }
  return result;
}
