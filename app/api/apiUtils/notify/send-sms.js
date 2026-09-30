// app/api/apiUtils/notify/send-sms.js
// SMS sending. The provider is chosen by the "Email & SMS" admin page:
//   - "Asanetic"      → form POST (pushsms / recp / body)   [original gateway]
//   - "Celcom Africa" → JSON POST (partnerID / apikey / shortcode / mobile / message)
// Configuration is read from app_config (getSmsConfig); .env still works as a
// fallback. See appConfig.js and celcom.js.

import { getSmsConfig } from "../dataControl/appConfig.js";
import { celcomSendSMS } from "./celcom.js";

/** True when the saved provider is Celcom Africa (matches "Celcom", "celcomafrica"…). */
function isCelcom(cfg) {
  return String(cfg?.provider || "").toLowerCase().replace(/\s+/g, "").includes("celcom");
}

/** Asanetic gateway — the original form-encoded API. */
async function sendViaAsanetic(cfg, phone, message) {
  const params = { pushsms: cfg.apiKey || "", recp: phone, body: message };
  if (cfg.senderId) params.from = cfg.senderId;

  console.log(`[SMS] Asanetic → ${phone}`);
  const res = await fetch(cfg.apiUrl || "https://asanetic.com/sms/sendsms", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(params).toString(),
  });
  if (!res.ok) {
    console.error(`[SMS ERROR] Asanetic HTTP ${res.status}`);
    return { status: "error", message: `SMS API error: ${res.status}`, data: null };
  }
  console.log(`[SMS SUCCESS] Asanetic → ${phone}`);
  return { status: "success", message: "SMS sent successfully", data: { recipient: phone, provider: "asanetic" } };
}

/** Celcom Africa gateway — JSON API. Normalises the {success|failed} result to
 *  this module's {success|error} contract so callers are unchanged. */
async function sendViaCelcom(cfg, phone, message) {
  console.log(`[SMS] Celcom → ${phone}`);
  const r = await celcomSendSMS(phone, message, {
    endpoint: cfg.apiUrl,          // admin's "API endpoint URL"
    apikey: cfg.apiKey,
    partnerID: cfg.partnerID,
    senderId: cfg.senderId,        // Celcom "shortcode"
  });
  if (r.status === "success") {
    console.log(`[SMS SUCCESS] Celcom → ${phone}`);
    return { status: "success", message: "SMS sent successfully", data: { recipient: phone, provider: "celcom", messageId: r.messageId ?? null } };
  }
  console.error(`[SMS ERROR] Celcom: ${r.message}`);
  return { status: "error", message: r.message || "Celcom send failed", data: r.raw ?? null };
}

/**
 * Send an SMS with an explicit config object (used by the settings "Send test").
 * @returns {Promise<{status:'success'|'error', message:string, data:object|null}>}
 */
export async function sendSmsWith(cfg, phone, message) {
  if (cfg.enabled === false) return { status: "error", message: "SMS sending is disabled", data: null };
  try {
    return isCelcom(cfg) ? await sendViaCelcom(cfg, phone, message) : await sendViaAsanetic(cfg, phone, message);
  } catch (err) {
    console.error(`[SMS ERROR] ${err.message}`);
    return { status: "error", message: `Failed to send SMS: ${err.message}`, data: null };
  }
}

/** Send an SMS using the saved/effective SMS configuration. */
export async function mosySendSMS(phone, message) {
  const cfg = await getSmsConfig();
  return sendSmsWith(cfg, phone, message);
}

// alias (kept for existing imports)
export const sendSMS = mosySendSMS;
