// app/api/apiUtils/notify/send-email.js
// Email sending via SMTP (Gmail / Google Workspace) using nodemailer.
// Configuration is read from the "Email & SMS" admin page (persisted in the
// app_config table); .env values still work as a fallback. See appConfig.js.

import nodemailer from "nodemailer";
import { getEmailConfig } from "../dataControl/appConfig.js";

/**
 * Send an email with an explicit config object (used by the settings "Send test"
 * button so admins can verify unsaved changes).
 * @returns {Promise<{status:'success'|'error', message:string, id?:string}>}
 */
export async function sendEmailWith(cfg, to, subject, text, html) {
  if (cfg.enabled === false) return { status: "error", message: "Email sending is disabled" };
  if (!cfg.user || !cfg.pass) return { status: "error", message: "Email is not configured (set the SMTP user and password)" };
  try {
    const port = Number(cfg.port) || 465;
    const transporter = nodemailer.createTransport({
      host: cfg.host || "smtp.gmail.com",
      port,
      secure: port === 465, // 465 = SSL, 587 = STARTTLS
      auth: { user: cfg.user, pass: String(cfg.pass).replace(/\s+/g, "") },
    });
    const from = cfg.fromEmail
      ? `${cfg.fromName || "AssetGuard"} <${cfg.fromEmail}>`
      : `AssetGuard <${cfg.user}>`;
    const info = await transporter.sendMail({ from, to, subject, text, html });
    console.log(`[EMAIL SUCCESS] sent to ${to} (${info.messageId})`);
    return { status: "success", message: "Email sent", id: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] ${err.message}`);
    return { status: "error", message: `Failed to send email: ${err.message}` };
  }
}

/** Send an email using the saved/effective email configuration. */
export async function sendEmail(to, subject, text, html) {
  const cfg = await getEmailConfig();
  return sendEmailWith(cfg, to, subject, text, html);
}
