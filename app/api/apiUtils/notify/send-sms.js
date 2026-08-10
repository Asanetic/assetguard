// app/api/apiUtils/notify/send-sms.js
// SMS sending via the Asanetic SMS API.
// Configuration is read from the "Email & SMS" admin page (persisted in the
// app_config table); .env values still work as a fallback. See appConfig.js.

import { getSmsConfig } from "../dataControl/appConfig.js";

/**
 * Send an SMS with an explicit config object (used by the settings "Send test").
 * @returns {Promise<{status:'success'|'error', message:string, data:object|null}>}
 */
export async function sendSmsWith(cfg, phone, message) {
  if (cfg.enabled === false) return { status: "error", message: "SMS sending is disabled", data: null };
  try {
    const params = { pushsms: cfg.apiKey || "", recp: phone, body: message };
    if (cfg.senderId) params.from = cfg.senderId;

    console.log(`[SMS] Sending to ${phone}`);
    const res = await fetch(cfg.apiUrl || "https://asanetic.com/sms/sendsms", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams(params).toString(),
    });

    if (!res.ok) {
      console.error(`[SMS ERROR] HTTP ${res.status}`);
      return { status: "error", message: `SMS API error: ${res.status}`, data: null };
    }
    console.log(`[SMS SUCCESS] Message sent to ${phone}`);
    return { status: "success", message: "SMS sent successfully", data: { recipient: phone } };
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
