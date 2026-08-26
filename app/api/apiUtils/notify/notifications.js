// app/api/apiUtils/notify/notifications.js
// Shared account notifications (email + SMS). Every message greets "Hi <name>,".
import { sendEmail } from "./send-email.js";
import { mosySendSMS } from "./send-sms.js";
import { getAppBaseUrl } from "./appUrl.js";

const hi = (name) => (name ? `Hi ${name},` : "Hi,");

function wrap(inner) {
  return `<div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-size:14px;color:#0F274A;line-height:1.6">${inner}</div>`;
}

async function dispatch({ email, phone, subject, text, html }) {
  const out = { email: false, sms: false };
  if (email) {
    try { const r = await sendEmail(email, subject, text, html); out.email = r.status === "success"; } catch {}
  }
  if (phone) {
    try { const r = await mosySendSMS(phone, text); out.sms = r.status === "success"; } catch {}
  }
  return out;
}

/** Account approved -> can now log in. */
export async function notifyApproved({ name, email, phone }) {
  const login = `${await getAppBaseUrl()}/mainapp/login`;
  const text = `${hi(name)} your AssetGuard account has been approved. You can now sign in at ${login}.`;
  const html = wrap(`${hi(name)}<br><br>Your AssetGuard account has been <b>approved</b>. You can now sign in at <a href="${login}">${login}</a>.`);
  return dispatch({ email, phone, subject: "Your AssetGuard account is approved", text, html });
}

/** Registration rejected. */
export async function notifyRejected({ name, email, phone, reason }) {
  const text = `${hi(name)} your AssetGuard registration was not approved${reason ? `: ${reason}` : ""}. Please contact your administrator for help.`;
  const html = wrap(`${hi(name)}<br><br>Your AssetGuard registration was <b>not approved</b>${reason ? `:<br><i>${reason}</i>` : "."}<br><br>Please contact your administrator for help.`);
  return dispatch({ email, phone, subject: "AssetGuard registration update", text, html });
}

/** Access request declined. */
export async function notifyAccessDeclined({ name, email, phone }) {
  const text = `${hi(name)} your AssetGuard access request was declined. Please contact your administrator.`;
  const html = wrap(`${hi(name)}<br><br>Your AssetGuard access request was <b>declined</b>. Please contact your administrator.`);
  return dispatch({ email, phone, subject: "AssetGuard access request update", text, html });
}

/** New account created by an admin — hand over credentials. */
export async function notifyCredentials({ name, email, phone, password }) {
  const login = `${await getAppBaseUrl()}/mainapp/login`;
  const text = `${hi(name)} your AssetGuard account is ready. Sign in at ${login} with email ${email} and password ${password}. Please change it after your first login.`;
  const html = wrap(`${hi(name)}<br><br>Your AssetGuard account is ready. Sign in at <a href="${login}">${login}</a><br><b>Email:</b> ${email}<br><b>Temporary password:</b> <span style="font-family:ui-monospace,monospace">${password}</span><br><br>Please change your password after your first login.`);
  return dispatch({ email, phone, subject: "Your AssetGuard account is ready", text, html });
}
