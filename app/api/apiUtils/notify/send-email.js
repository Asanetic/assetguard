// app/api/apiUtils/notify/send-email.js
// Email sending via SMTP (Gmail / Google Workspace) using nodemailer.
// Credentials come from .env.local — never hardcode them here.
//   EMAIL_USER=AssetGuard@Symphony.Co.Ke
//   EMAIL_PASS=<gmail app password, no spaces>
//   EMAIL_FROM="AssetGuard <AssetGuard@Symphony.Co.Ke>"   (optional)
//   EMAIL_HOST=smtp.gmail.com   EMAIL_PORT=465             (optional defaults)

import nodemailer from "nodemailer";

let _transporter;

function transporter() {
  if (_transporter) return _transporter;
  const port = Number(process.env.EMAIL_PORT || 465);
  _transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port,
    secure: port === 465, // 465 = SSL, 587 = STARTTLS
    auth: {
      user: process.env.EMAIL_USER,
      // App passwords are shown with spaces; strip them just in case.
      pass: (process.env.EMAIL_PASS || "").replace(/\s+/g, ""),
    },
  });
  return _transporter;
}

/**
 * Send an email.
 * @returns {Promise<{status:'success'|'error', message:string, id?:string}>}
 */
export async function sendEmail(to, subject, text, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error("[EMAIL ERROR] EMAIL_USER / EMAIL_PASS not set");
    return { status: "error", message: "Email is not configured" };
  }
  try {
    const from =
      process.env.EMAIL_FROM || `AssetGuard <${process.env.EMAIL_USER}>`;
    const info = await transporter().sendMail({ from, to, subject, text, html });
    console.log(`[EMAIL SUCCESS] sent to ${to} (${info.messageId})`);
    return { status: "success", message: "Email sent", id: info.messageId };
  } catch (err) {
    console.error(`[EMAIL ERROR] ${err.message}`);
    return { status: "error", message: "Failed to send email" };
  }
}
