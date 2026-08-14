// app/api/apiUtils/notify/alarmNotify.js
// Fan out a raised CRITICAL alarm to everyone registered on its site, by email and
// SMS (push + WhatsApp are added later — the channel column is already there).
// Recipients come from the site's own `details` JSONB (the Add-site form): the
// client company, the security company's country/region managers + assistants, the
// NOC and response teams, and any manually-typed alert emails/phones. Every send is
// logged to `notifications`; if nothing could be delivered we raise a Medium
// "Notification Failed To Send" alarm so the gap is visible.
import { getSite } from "../dataControl/sites.js";
import { insertNotification } from "../dataControl/notifications.js";
import { insertLiveAlarm } from "../dataControl/alarms.js";
import { sendEmail } from "./send-email.js";
import { mosySendSMS } from "./send-sms.js";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

const cleanPhone = (p) => String(p || "").replace(/[^\d+]/g, "");
const validEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || "").trim());
const validPhone = (p) => cleanPhone(p).replace(/^\+/, "").length >= 9;

// Pull { name, phones[], emails[] } out of a person/team object (either shape).
function pushPerson(list, p, role) {
  if (!p) return;
  const name = p.name || p.code || "";
  const emails = Array.isArray(p.emails) ? p.emails : (p.emails ? [p.emails] : []);
  const phones = Array.isArray(p.phones) ? p.phones : (p.phones ? [p.phones] : []);
  if (!name && !emails.length && !phones.length) return;
  list.push({ name, emails, phones, role });
}

/**
 * Flatten a site's `details` JSONB into de-duplicated email + SMS recipient lists.
 * Pure (no I/O) so it is directly testable.
 * @returns {{emails:Array<{value,name,role}>, phones:Array<{value,name,role}>}}
 */
export function flattenSiteContacts(details) {
  const d = details || {};
  const people = [];

  // Client company
  pushPerson(people, d.company?.manager,    "Client company — manager");
  pushPerson(people, d.company?.assistant1, "Client company — assistant");
  pushPerson(people, d.company?.assistant2, "Client company — assistant");
  // Security company — country + region
  pushPerson(people, d.securityCompany?.country?.operationsManager, "Security — country ops manager");
  pushPerson(people, d.securityCompany?.country?.assistant,        "Security — country assistant");
  pushPerson(people, d.securityCompany?.region?.fieldOperationsManager, "Security — field ops manager");
  pushPerson(people, d.securityCompany?.region?.assistant,         "Security — field assistant");
  for (const t of d.securityCompany?.nocTeams || [])     pushPerson(people, t, "Security — NOC team");
  for (const t of d.securityCompany?.responseTeams || []) pushPerson(people, t, "Security — response team");
  // Monitoring NOC
  for (const t of d.noc?.nocTeams || []) pushPerson(people, t, "Monitoring — NOC team");
  // Manually-typed alert recipients
  for (const e of d.alerts?.emails || []) people.push({ name: "", emails: [e], phones: [], role: "Alert recipient" });
  for (const p of d.alerts?.sms || [])    people.push({ name: "", emails: [], phones: [p], role: "Alert recipient" });

  // De-dupe by contact value; first name/role seen wins.
  const emailMap = new Map(), phoneMap = new Map();
  for (const person of people) {
    for (const e of person.emails) {
      const v = String(e || "").trim().toLowerCase();
      if (validEmail(v) && !emailMap.has(v)) emailMap.set(v, { value: v, name: person.name, role: person.role });
    }
    for (const p of person.phones) {
      const v = cleanPhone(p);
      if (validPhone(v) && !phoneMap.has(v)) phoneMap.set(v, { value: v, name: person.name, role: person.role });
    }
  }
  return { emails: [...emailMap.values()], phones: [...phoneMap.values()] };
}

/**
 * Every contact registered on a site, de-duplicated into an email list and an SMS
 * list. Reads the site's saved `details`.
 * @returns {Promise<{site:object, emails:Array<{value,name,role}>, phones:Array<{value,name,role}>}>}
 */
export async function resolveSiteAlertRecipients(siteId) {
  const site = siteId != null ? await getSite(siteId).catch(() => null) : null;
  const { emails, phones } = flattenSiteContacts((site && site.details) || {});
  return { site, emails, phones };
}

const fmtEAT = (v) => {
  try {
    return new Date(v || Date.now()).toLocaleString("en-GB", {
      timeZone: "Africa/Nairobi", day: "2-digit", month: "short", year: "numeric",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }) + " EAT";
  } catch { return ""; }
};

function buildMessages(alarm, siteName) {
  const when = fmtEAT(alarm.created_at);
  const where = siteName || alarm.site || "site";
  const dev = alarm.device_id || alarm.serial || "device";
  const link = `${APP_URL}/mainapp/alarms/${encodeURIComponent(alarm.id)}`;
  const subject = `🔴 CRITICAL: ${alarm.name} — ${where}`;
  const text =
    `CRITICAL ALARM\n${alarm.name}\nSite: ${where}\nDevice: ${dev}\nTime: ${when}\n\n` +
    `Open the alarm: ${link}`;
  const html =
    `<div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#0F274A;line-height:1.6;font-size:14px">
       <div style="background:#EF4444;color:#fff;font-weight:800;padding:10px 14px;border-radius:10px;display:inline-block">
         🔴 CRITICAL ALARM
       </div>
       <h2 style="margin:14px 0 6px;font-size:18px">${alarm.name}</h2>
       <table style="border-collapse:collapse;font-size:14px">
         <tr><td style="color:#64748B;padding:2px 12px 2px 0">Site</td><td><b>${where}</b></td></tr>
         <tr><td style="color:#64748B;padding:2px 12px 2px 0">Device</td><td>${dev}</td></tr>
         <tr><td style="color:#64748B;padding:2px 12px 2px 0">Time</td><td>${when}</td></tr>
       </table>
       <p style="margin:16px 0"><a href="${link}" style="background:#14315D;color:#fff;text-decoration:none;padding:10px 16px;border-radius:9px;font-weight:700">Open the alarm</a></p>
       <p style="color:#94A3B8;font-size:12px">You are receiving this because you are a registered contact for ${where} on AssetGuard.</p>
     </div>`;
  // SMS: short, no HTML.
  const sms = `CRITICAL: ${alarm.name}. Site: ${where}. Device: ${dev}. ${when}. ${link}`;
  return { subject, text, html, sms };
}

/**
 * Notify every site contact about a raised CRITICAL alarm (email + SMS).
 * Best-effort and self-contained: it never throws to the caller.
 * @param {object} alarm  the inserted alarm row (must be Critical + Open)
 * @param {{siteId?:number}} opts
 */
export async function notifyAlarmRaised(alarm, { siteId } = {}) {
  try {
    if (!alarm || alarm.priority !== "Critical") return { skipped: true };
    const { site, emails, phones } = await resolveSiteAlertRecipients(siteId ?? null);
    const siteName = site?.name || alarm.site || null;
    const msg = buildMessages(alarm, siteName);

    const base = {
      alarmId: alarm.id, incidentId: alarm.incident_id || null, site: siteName,
      siteId: site?.id ?? siteId ?? null, deviceId: alarm.device_id || null,
      priority: alarm.priority, subject: msg.subject,
    };

    // ALWAYS leave a trace, even when nobody is registered — so the operator can see
    // the alarm fired a notification and WHY nothing went out (empty contacts).
    if (emails.length === 0 && phones.length === 0) {
      await insertNotification({
        ...base, channel: "none", recipient: "—",
        name: site ? "No contacts registered for this site" : "Site not found for this alarm",
        role: null, status: "no_contact",
        error: site
          ? "Add alert contacts to this site (Sites → edit → contacts / alert recipients) so critical alarms can reach someone."
          : "The alarm's device is not linked to a site, so no contacts could be resolved.",
      });
      console.log(`[notify] alarm ${alarm.id} (${alarm.name}) → NO CONTACTS for ${siteName || "site"} (logged as no_contact)`);
      return { attempted: 0, delivered: 0, noContact: true };
    }

    let attempted = 0, delivered = 0;

    const emailJobs = emails.map((r) => (async () => {
      attempted++;
      let status = "sent", error = null;
      try {
        const res = await sendEmail(r.value, msg.subject, msg.text, msg.html);
        if (res.status === "success") delivered++; else { status = "failed"; error = res.message; }
      } catch (e) { status = "failed"; error = e?.message || "send error"; }
      await insertNotification({ ...base, channel: "email", recipient: r.value, name: r.name, role: r.role, status, error });
    })());

    const smsJobs = phones.map((r) => (async () => {
      attempted++;
      let status = "sent", error = null;
      try {
        const res = await mosySendSMS(r.value, msg.sms);
        if (res.status === "success") delivered++; else { status = "failed"; error = res.message; }
      } catch (e) { status = "failed"; error = e?.message || "send error"; }
      await insertNotification({ ...base, channel: "sms", recipient: r.value, name: r.name, role: r.role, status, error });
    })());

    await Promise.all([...emailJobs, ...smsJobs]);

    // If there WERE recipients but nothing could be delivered, surface it as a
    // Medium alarm so operators know the critical alert didn't reach anyone.
    if (attempted > 0 && delivered === 0) {
      try {
        await insertLiveAlarm({
          alarmType: "NOTIFICATION_FAILED",
          value: `${alarm.name} — 0/${attempted} delivered`,
          deviceIdText: alarm.device_id || null, site: siteName,
          at: alarm.created_at || null,
        });
      } catch {}
    }
    console.log(`[notify] alarm ${alarm.id} (${alarm.name}) → ${delivered}/${attempted} delivered to ${siteName || "site"}`);
    return { attempted, delivered };
  } catch (e) {
    console.error("[notify] notifyAlarmRaised error:", e?.message || e);
    return { error: e?.message || "notify error" };
  }
}
