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

/** Current maps config, always merged over the defaults so callers get a full shape. */
export async function getMapsConfig() {
  const v = (await getConfig("maps")) || {};
  return {
    ...MAPS_DEFAULTS,
    ...v,
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
