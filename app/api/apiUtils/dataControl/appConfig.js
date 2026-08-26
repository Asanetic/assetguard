// app/api/apiUtils/dataControl/appConfig.js
// -----------------------------------------------------------------------------
// Generic key/value platform configuration (app_config table). Each namespace
// is one JSONB row. Currently used for the Google Maps settings; other global
// settings can reuse getConfig/setConfig.
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

/** Read a config namespace, or null if unset. */
export async function getConfig(key) {
  const { rows } = await query(`SELECT value FROM app_config WHERE key = $1`, [key]);
  return rows[0] ? rows[0].value : null;
}

/** Upsert a config namespace. */
export async function setConfig(key, value, updatedBy = null) {
  const { rows } = await query(
    `INSERT INTO app_config (key, value, updated_by, updated_at)
     VALUES ($1, $2::jsonb, $3, now())
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value, updated_by = EXCLUDED.updated_by, updated_at = now()
     RETURNING value`,
    [key, JSON.stringify(value), updatedBy]
  );
  return rows[0].value;
}

// ---- Branding (company logo → watermark on generated documents) -----------

export const BRANDING_DEFAULTS = { companyName: "", logoDataUrl: "", watermark: true };

/** Company branding: name + logo (data URL) used as the watermark on reports. */
export async function getBranding() {
  const v = (await getConfig("branding").catch(() => null)) || {};
  return { ...BRANDING_DEFAULTS, ...v };
}
/** Save branding (admin). logoDataUrl is a data: URL (PNG/JPG/SVG). */
export async function setBranding(value, updatedBy = null) {
  const merged = { ...BRANDING_DEFAULTS, ...(value || {}) };
  return setConfig("branding", merged, updatedBy);
}

// ---- Firmware -------------------------------------------------------------
// The latest firmware version available. Firmware currently lives on the OEM
// servers, so an admin types the current version here; a device is labelled to
// this version once it CONFIRMS an OTA update. (Later, firmware will be hosted
// on our own servers.)
export async function getFirmwareConfig() {
  const v = (await getConfig("firmware").catch(() => null)) || {};
  return { latest: (v.latest && String(v.latest).trim()) || "v2.4.1", notes: v.notes || null, updated_at: v.updated_at || null };
}
export async function saveFirmwareConfig(patch = {}, updatedBy = null) {
  const cur = await getFirmwareConfig();
  const next = {
    latest: patch.latest != null ? String(patch.latest).trim() : cur.latest,
    notes: patch.notes != null ? String(patch.notes).trim() || null : cur.notes,
    updated_at: new Date().toISOString(),
  };
  await setConfig("firmware", next, updatedBy);
  return next;
}

// ---- Google Maps ----------------------------------------------------------

export const MAPS_LIBRARIES = ["places", "geometry", "drawing", "marker", "visualization"];
export const MAP_TYPES = ["roadmap", "satellite", "hybrid", "terrain"];

export const MAPS_DEFAULTS = {
  apiKey: "",
  libraries: ["places"],
  defaultCenter: { lat: -1.2864, lng: 36.8172 }, // Nairobi
  defaultZoom: 7,
  mapType: "roadmap",
};

/** Current maps config, always merged over the defaults so callers get a full shape.
 *  If no key was saved via the admin page, fall back to an environment key so a
 *  key in .env works out of the box. Set one of:
 *    GOOGLE_MAPS_API_KEY, NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, or MAPS_API_KEY  */
export async function getMapsConfig() {
  const v = (await getConfig("maps")) || {};
  const envKey =
    process.env.GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    process.env.MAPS_API_KEY || "";
  return {
    ...MAPS_DEFAULTS,
    ...v,
    apiKey: (v.apiKey && String(v.apiKey).trim()) || envKey,
    defaultCenter: { ...MAPS_DEFAULTS.defaultCenter, ...(v.defaultCenter || {}) },
    libraries: Array.isArray(v.libraries) ? v.libraries : MAPS_DEFAULTS.libraries,
  };
}

/** Validate + save a maps config patch. Returns the merged, stored config. */
export async function saveMapsConfig(patch = {}, updatedBy = null) {
  const cur = await getMapsConfig();
  const next = { ...cur };

  if (typeof patch.apiKey === "string") next.apiKey = patch.apiKey.trim();
  if (Array.isArray(patch.libraries))
    next.libraries = patch.libraries.filter((l) => MAPS_LIBRARIES.includes(l));
  if (patch.mapType && MAP_TYPES.includes(patch.mapType)) next.mapType = patch.mapType;
  if (patch.defaultZoom !== undefined) {
    const z = Number(patch.defaultZoom);
    if (Number.isFinite(z)) next.defaultZoom = Math.min(22, Math.max(1, Math.round(z)));
  }
  if (patch.defaultCenter) {
    const lat = Number(patch.defaultCenter.lat), lng = Number(patch.defaultCenter.lng);
    next.defaultCenter = {
      lat: Number.isFinite(lat) ? lat : cur.defaultCenter.lat,
      lng: Number.isFinite(lng) ? lng : cur.defaultCenter.lng,
    };
  }

  await setConfig("maps", next, updatedBy);
  return next;
}

// ---- Geolocation providers (LBS / Wi-Fi position resolver) ----------------
// Google is the PRIMARY resolver (it reuses the Google Maps key above). Unwired
// Labs is an optional BACKUP that is tried only when Google can't resolve a
// packet — and only while we're still under a configured free-request cap, so a
// trial token is never overrun. The request count is tracked in geo_usage (see
// dataControl/geoUsage.js), not here.
export const GEO_REGIONS = ["us1", "eu1", "ap1"];      // Unwired endpoint nodes
export const GEO_CAP_WINDOWS = ["total", "month", "day"]; // lifetime trial / monthly / daily

export const GEO_DEFAULTS = {
  unwiredEnabled: false,
  unwiredToken: "",
  unwiredRegion: "us1",
  unwiredFreeCap: 50,          // stop calling Unwired after this many requests
  unwiredCapWindow: "total",   // "total" = trial lifetime, "month"/"day" = resets
};

/** Full geo config (includes the Unwired token) — for the resolver. Falls back
 *  to an env token (UNWIRED_LABS_TOKEN / UNWIRED_TOKEN) if none is saved. */
export async function getGeoConfig() {
  const v = (await getConfig("geo")) || {};
  const envTok = process.env.UNWIRED_LABS_TOKEN || process.env.UNWIRED_TOKEN || "";
  const capN = Number(v.unwiredFreeCap);
  return {
    ...GEO_DEFAULTS,
    ...v,
    unwiredEnabled: v.unwiredEnabled === undefined ? GEO_DEFAULTS.unwiredEnabled : !!v.unwiredEnabled,
    unwiredToken: (v.unwiredToken && String(v.unwiredToken).trim()) || envTok,
    unwiredRegion: GEO_REGIONS.includes(v.unwiredRegion) ? v.unwiredRegion : GEO_DEFAULTS.unwiredRegion,
    unwiredCapWindow: GEO_CAP_WINDOWS.includes(v.unwiredCapWindow) ? v.unwiredCapWindow : GEO_DEFAULTS.unwiredCapWindow,
    unwiredFreeCap: Number.isFinite(capN) ? Math.max(0, Math.round(capN)) : GEO_DEFAULTS.unwiredFreeCap,
  };
}

/** Validate + save a geo config patch. The token is only changed when a
 *  non-empty value is supplied, so the UI never blanks it by omission. */
export async function saveGeoConfig(patch = {}, updatedBy = null) {
  const cur = await getGeoConfig();
  const next = { ...cur };
  if (patch.unwiredEnabled !== undefined) next.unwiredEnabled = !!patch.unwiredEnabled;
  if (patch.unwiredRegion && GEO_REGIONS.includes(patch.unwiredRegion)) next.unwiredRegion = patch.unwiredRegion;
  if (patch.unwiredCapWindow && GEO_CAP_WINDOWS.includes(patch.unwiredCapWindow)) next.unwiredCapWindow = patch.unwiredCapWindow;
  if (patch.unwiredFreeCap !== undefined) {
    const n = Number(patch.unwiredFreeCap);
    if (Number.isFinite(n)) next.unwiredFreeCap = Math.max(0, Math.round(n));
  }
  if (typeof patch.unwiredToken === "string" && patch.unwiredToken.trim() !== "") next.unwiredToken = patch.unwiredToken.trim();
  else next.unwiredToken = cur.unwiredToken;
  await setConfig("geo", next, updatedBy);
  return next;
}

/** Geo config for the admin page — the token is removed and replaced by a
 *  boolean *Set flag, so the secret never leaves the server. */
export async function getGeoConfigPublic() {
  const g = await getGeoConfig();
  const { unwiredToken, ...safe } = g;
  return { ...safe, unwiredTokenSet: !!(unwiredToken && String(unwiredToken).length) };
}

// ---- Messaging: Email (SMTP) + SMS ----------------------------------------
// Defaults reflect what the app ships with today (Gmail SMTP + Asanetic SMS).
// Precedence when reading: DB (edited in the UI) > environment (.env) > default,
// so existing .env deployments keep working until an admin saves via the page.

function prune(o) {
  const r = {};
  for (const k in o) if (o[k] !== undefined && o[k] !== "") r[k] = o[k];
  return r;
}

export const EMAIL_DEFAULTS = {
  enabled: true,
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  user: "AssetGuard@Symphony.Co.Ke",
  pass: "",
  fromName: "AssetGuard",
  fromEmail: "AssetGuard@Symphony.Co.Ke",
};

export const SMS_DEFAULTS = {
  enabled: true,
  provider: "Asanetic",
  apiUrl: "https://asanetic.com/sms/sendsms",
  apiKey: "",
  senderId: "",
};

/** Full email config (includes the SMTP password) — for the sender. */
export async function getEmailConfig() {
  const db = (await getConfig("email")) || {};
  const env = {};
  if (process.env.EMAIL_HOST) env.host = process.env.EMAIL_HOST;
  if (process.env.EMAIL_PORT) env.port = Number(process.env.EMAIL_PORT);
  if (process.env.EMAIL_USER) env.user = process.env.EMAIL_USER;
  if (process.env.EMAIL_PASS) env.pass = process.env.EMAIL_PASS;
  if (process.env.EMAIL_FROM) {
    const m = String(process.env.EMAIL_FROM).match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
    if (m) { env.fromName = m[1] || "AssetGuard"; env.fromEmail = m[2]; }
    else env.fromEmail = process.env.EMAIL_FROM;
  }
  const merged = { ...EMAIL_DEFAULTS, ...prune(env), ...prune(db) };
  merged.port = Number(merged.port) || 465;
  merged.secure = merged.port === 465;
  return merged;
}

/** Save email config. The password is only changed when a non-empty one is sent. */
export async function saveEmailConfig(patch = {}, updatedBy = null) {
  const cur = (await getConfig("email")) || {};
  const next = { ...EMAIL_DEFAULTS, ...cur };
  for (const f of ["enabled", "host", "port", "user", "fromName", "fromEmail"])
    if (patch[f] !== undefined) next[f] = patch[f];
  next.port = Number(next.port) || 465;
  next.secure = next.port === 465;
  if (typeof patch.pass === "string" && patch.pass.trim() !== "") next.pass = patch.pass;
  else next.pass = cur.pass !== undefined ? cur.pass : EMAIL_DEFAULTS.pass;
  await setConfig("email", next, updatedBy);
  return next;
}

/** Full SMS config (includes the API key) — for the sender. */
export async function getSmsConfig() {
  const db = (await getConfig("sms")) || {};
  const env = {};
  if (process.env.SMS_API_URL) env.apiUrl = process.env.SMS_API_URL;
  if (process.env.SMS_API_KEY) env.apiKey = process.env.SMS_API_KEY;
  if (process.env.SMS_SENDER_ID) env.senderId = process.env.SMS_SENDER_ID;
  return { ...SMS_DEFAULTS, ...prune(env), ...prune(db) };
}

/** Save SMS config. The API key is only changed when a non-empty one is sent. */
export async function saveSmsConfig(patch = {}, updatedBy = null) {
  const cur = (await getConfig("sms")) || {};
  const next = { ...SMS_DEFAULTS, ...cur };
  for (const f of ["enabled", "provider", "apiUrl", "senderId"])
    if (patch[f] !== undefined) next[f] = patch[f];
  if (typeof patch.apiKey === "string" && patch.apiKey.trim() !== "") next.apiKey = patch.apiKey;
  else next.apiKey = cur.apiKey !== undefined ? cur.apiKey : SMS_DEFAULTS.apiKey;
  await setConfig("sms", next, updatedBy);
  return next;
}

// ---- Client company (the org that owns the system) ------------------------
// National — the same on every site. Edited on the Settings page, pulled into
// the Add-site "Company" block. Defaults mirror the Settings seed (AG_ORG).
export const ORG_DEFAULTS = {
  name: "Symphony Technologies Limited",
  domain: "assetguard.symphony.co.ke",
  country: "Kenya",
  manager: { name: "Jane Wanjiku", phones: ["+254 720 114 880"], emails: ["jane.wanjiku@symphony.co.ke"] },
  assistant1: { name: "Peter Kimani", phones: ["+254 733 902 415"], emails: ["peter.kimani@symphony.co.ke"] },
  assistant2: { name: "Alice Njeri", phones: ["+254 733 902 416"], emails: ["alice.njeri@symphony.co.ke"] },
};

export async function getOrgConfig() {
  const v = (await getConfig("org")) || {};
  return {
    ...ORG_DEFAULTS, ...v,
    manager: { ...ORG_DEFAULTS.manager, ...(v.manager || {}) },
    assistant1: { ...ORG_DEFAULTS.assistant1, ...(v.assistant1 || {}) },
    assistant2: { ...ORG_DEFAULTS.assistant2, ...(v.assistant2 || {}) },
  };
}

export async function saveOrgConfig(patch = {}, updatedBy = null) {
  const cur = (await getConfig("org")) || {};
  const next = { ...ORG_DEFAULTS, ...cur, ...patch };
  await setConfig("org", next, updatedBy);
  return next;
}

/** Messaging config for the admin page — secrets removed, replaced by *Set flags. */
export async function getMessagingConfigPublic() {
  const email = await getEmailConfig();
  const sms = await getSmsConfig();
  const { pass, ...emailSafe } = email;
  const { apiKey, ...smsSafe } = sms;
  return {
    email: { ...emailSafe, passwordSet: !!(pass && String(pass).length) },
    sms: { ...smsSafe, apiKeySet: !!(apiKey && String(apiKey).length) },
  };
}
