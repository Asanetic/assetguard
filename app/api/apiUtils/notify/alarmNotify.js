// app/api/apiUtils/notify/alarmNotify.js
// Fan out a raised CRITICAL alarm to everyone registered on its site, by email and
// SMS (push + WhatsApp are added later — the channel column is already there).
// Recipients come from the site's own `details` JSONB (the Add-site form): the
// client company, the security company's country/region managers + assistants, the
// NOC and response teams, and any manually-typed alert emails/phones. Every send is
// logged to `notifications`; if nothing could be delivered we raise a Medium
// "Notification Failed To Send" alarm so the gap is visible.
import { getSite, getSitePolicy } from "../dataControl/sites.js";
import { insertNotification } from "../dataControl/notifications.js";
import { insertLiveAlarm } from "../dataControl/alarms.js";
import { query } from "../s_env/db.js";
import { sendEmail } from "./send-email.js";
import { mosySendSMS } from "./send-sms.js";
import { getAppBaseUrl } from "./appUrl.js";

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

  // De-dupe by contact value; first name/role seen wins. Each recipient carries a
  // `security` flag (its role belongs to the security company) so non-critical
  // alarms can exclude them — High/Medium/Low never reach the security company.
  const isSecurity = (role) => /^security/i.test(String(role || ""));
  const emailMap = new Map(), phoneMap = new Map();
  for (const person of people) {
    for (const e of person.emails) {
      const v = String(e || "").trim().toLowerCase();
      if (validEmail(v) && !emailMap.has(v)) emailMap.set(v, { value: v, name: person.name, role: person.role, security: isSecurity(person.role) });
    }
    for (const p of person.phones) {
      const v = cleanPhone(p);
      if (validPhone(v) && !phoneMap.has(v)) phoneMap.set(v, { value: v, name: person.name, role: person.role, security: isSecurity(person.role) });
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

// Per-severity presentation for the alert (emoji + banner colour + label).
// Must match ALARM_SEVERITY_COLOR in app/mainapp/lib/googleMaps.js (the alarms-map
// colours) so the email banner equals what the operator sees in the app.
const PRIO = {
  Critical: { emoji: "🔴", color: "#EF4444", label: "CRITICAL" },
  High:     { emoji: "🟠", color: "#F59E0B", label: "HIGH" },
  Medium:   { emoji: "🔵", color: "#2E6CF5", label: "MEDIUM" },
  Low:      { emoji: "⚪", color: "#94A3B8", label: "LOW" },
};
function prioMeta(p) { return PRIO[p] || PRIO.Medium; }

function buildMessages(alarm, siteName, baseUrl) {
  const m = prioMeta(alarm.priority);
  const when = fmtEAT(alarm.created_at);
  const where = siteName || alarm.site || "site";
  const dev = alarm.device_id || alarm.serial || "device";
  const link = `${baseUrl}/mainapp/alarms/${encodeURIComponent(alarm.id)}`;
  const subject = `${m.emoji} ${m.label}: ${alarm.name} — ${where}`;
  const text =
    `${m.label} ALARM\n${alarm.name}\nSite: ${where}\nDevice: ${dev}\nTime: ${when}\n\n` +
    `Open the alarm: ${link}`;
  const html =
    `<div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#0F274A;line-height:1.6;font-size:14px">
       <div style="background:${m.color};color:#fff;font-weight:800;padding:10px 14px;border-radius:10px;display:inline-block">
         ${m.emoji} ${m.label} ALARM
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
  const sms = `${m.label}: ${alarm.name}. Site: ${where}. Device: ${dev}. ${when}. ${link}`;
  return { subject, text, html, sms };
}

/**
 * Disturbance EARLY WARNING (the 2nd/3rd report of the day) — send SMS + email to
 * the site's contacts WITHOUT raising a system alarm. Disturbance is critical-tier,
 * so the security company IS included. Logged to the notifications table (alarm_id
 * null) so it's counted and visible on the Notifications page.
 */
export async function notifyDisturbanceEarly({ deviceIdText, serial, site, siteId, at, count, threshold, deviceStatus, deviceArmed, deviceMuteUntil }) {
  try {
    // Respect site + device monitoring policy: no early warnings while disarmed,
    // muted, or under test (Testing/Maintenance) — handled at raise time instead.
    const pol = (siteId != null ? await getSitePolicy(siteId).catch(() => null) : null) || {};
    const devTesting = /^(testing|maintenance)$/i.test(String(deviceStatus || ""));
    const devMuted = !!deviceMuteUntil && Date.parse(deviceMuteUntil) > Date.now();
    if (pol.armed === false || deviceArmed === false || pol.muted || devMuted || pol.testing || devTesting) {
      console.log(`[notify] disturbance early-warning skipped for ${site || siteId} (site/device policy)`);
      return { skipped: true };
    }
    // User-facing numbering: the 1st disturbance is ignored, so the warnings are
    // relabelled 1/3, 2/3 (the alarm is the final, 3rd step). No confusing "of 4".
    const total = Math.max(2, (Number(threshold) || 4) - 1);   // 3
    const step = Math.min(total, Math.max(1, (Number(count) || 2) - 1)); // #2→1, #3→2
    const { site: siteRow, emails, phones } = await resolveSiteAlertRecipients(siteId ?? null);
    const siteName = siteRow?.name || site || null;
    if (!emails.length && !phones.length) {
      await insertNotification({
        alarmId: null, site: siteName, siteId: siteRow?.id ?? siteId ?? null, deviceId: deviceIdText || null,
        priority: "Critical", channel: "none", recipient: "—",
        name: "No contacts for disturbance warning", role: null, status: "no_contact",
        subject: `Disturbance warning ${step}/${total}`,
        error: siteRow ? "Add contacts to this site." : "Device not linked to a site.",
      });
      return { attempted: 0, delivered: 0, noContact: true };
    }
    const baseUrl = await getAppBaseUrl();
    const where = siteName || "site";
    const dev = deviceIdText || serial || "device";
    // Use SERVER time (EAT), not the device clock (`at`), which is often 3h off.
    const when = fmtEAT(Date.now());
    const link = `${baseUrl}/mainapp/track?device=${encodeURIComponent(deviceIdText || "")}`;
    const subject = `⚠️ Disturbance warning ${step}/${total} — ${where}`;
    const text = `DISTURBANCE WARNING ${step}/${total}\n${dev} at ${where}\nTime: ${when}\n` +
      `Track: ${link}`;
    const html =
      `<div style="font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;color:#0F274A;line-height:1.6;font-size:14px">
         <div style="background:#F59E0B;color:#fff;font-weight:800;padding:10px 14px;border-radius:10px;display:inline-block">⚠️ DISTURBANCE WARNING ${step}/${total}</div>
         <h2 style="margin:14px 0 6px;font-size:18px">${dev}</h2>
         <table style="border-collapse:collapse;font-size:14px">
           <tr><td style="color:#64748B;padding:2px 12px 2px 0">Site</td><td><b>${where}</b></td></tr>
           <tr><td style="color:#64748B;padding:2px 12px 2px 0">Time</td><td>${when}</td></tr>
         </table>
         <p style="margin:12px 0;color:#334155">Disturbance warning ${step} of ${total}. If it continues, a full alarm is raised on ${total}/${total}.</p>
         <p style="margin:12px 0"><a href="${link}" style="background:#14315D;color:#fff;text-decoration:none;padding:10px 16px;border-radius:9px;font-weight:700">Track device</a></p>
       </div>`;
    const sms = `DISTURBANCE WARNING ${step}/${total}: ${dev} at ${where}. ${when}. Track: ${link}`;

    const base = { alarmId: null, site: siteName, siteId: siteRow?.id ?? siteId ?? null, deviceId: deviceIdText || null, priority: "Critical", subject };
    let attempted = 0, delivered = 0;
    const jobs = [
      ...emails.map((r) => (async () => {
        attempted++; let status = "sent", error = null;
        try { const res = await sendEmail(r.value, subject, text, html); if (res.status === "success") delivered++; else { status = "failed"; error = res.message; } }
        catch (e) { status = "failed"; error = e?.message || "send error"; }
        await insertNotification({ ...base, channel: "email", recipient: r.value, name: r.name, role: r.role, status, error });
      })()),
      ...phones.map((r) => (async () => {
        attempted++; let status = "sent", error = null;
        try { const res = await mosySendSMS(r.value, sms); if (res.status === "success") delivered++; else { status = "failed"; error = res.message; } }
        catch (e) { status = "failed"; error = e?.message || "send error"; }
        await insertNotification({ ...base, channel: "sms", recipient: r.value, name: r.name, role: r.role, status, error });
      })()),
    ];
    await Promise.all(jobs);
    console.log(`[notify] disturbance early-warning ${count}/${threshold} for ${siteName || "site"} → ${delivered}/${attempted}`);
    return { attempted, delivered };
  } catch (e) {
    console.error("[notify] notifyDisturbanceEarly error:", e?.message || e);
    return { error: e?.message || "notify error" };
  }
}

// A site/device in Testing or Maintenance turns real events into TEST alarms:
// "<name> – test", Low priority, routed only to NOC + field technicians. A muted
// site downgrades alarms to Low. Both persist the change to the alarm row so the
// alarms list/dashboard reflect it. Returns the (possibly modified) alarm.
const TEST_SUFFIX = " – test";
const isTestRole = (role) => /noc|response|field|technician/i.test(String(role || ""));

async function applyAlarmPolicy(alarm, { toLow, asTest }) {
  let name = alarm.name || "";
  let priority = alarm.priority;
  if (asTest && !name.includes(TEST_SUFFIX.trim())) name = `${name}${TEST_SUFFIX}`;
  if (toLow) priority = "Low";
  const tag = asTest;   // mark test alarms with source='test' (drill mode + de-dupe exclusion)
  if (name === alarm.name && priority === alarm.priority && !tag) return alarm;
  try {
    if (tag) await query(`UPDATE alarms SET name = $2, priority = $3, source = 'test' WHERE id = $1`, [alarm.id, name, priority]);
    else await query(`UPDATE alarms SET name = $2, priority = $3 WHERE id = $1`, [alarm.id, name, priority]);
  } catch (e) { console.error("[notify] policy relabel error:", e?.message || e); }
  return { ...alarm, name, priority, ...(tag ? { source: "test" } : {}) };
}

/**
 * Notify every site contact about a raised alarm (email + SMS), applying the
 * site's monitoring policy first:
 *   • DISARMED  → record the alarm but page nobody.
 *   • TESTING/MAINTENANCE (site or device) → relabel "… – test", Low, and route
 *     only to the NOC + field technicians.
 *   • MUTED     → downgrade to Low (normal Low routing; no critical paging).
 * Best-effort and self-contained: it never throws to the caller.
 * @param {object} alarm  the inserted alarm row
 * @param {{siteId?:number, deviceStatus?:string}} opts
 */
export async function notifyAlarmRaised(alarm, { siteId, deviceStatus, deviceArmed, deviceMuteUntil, forceTest = false } = {}) {
  try {
    if (!alarm) return { skipped: true };

    // Merge SITE policy with per-DEVICE overrides — most-restrictive wins.
    // forceTest (a manual "Send test alarm") always behaves as a test regardless.
    const policy = (siteId != null ? await getSitePolicy(siteId).catch(() => null) : null) || {};
    const devTesting = /^(testing|maintenance)$/i.test(String(deviceStatus || ""));
    const deviceMuted = !!deviceMuteUntil && Date.parse(deviceMuteUntil) > Date.now();
    const testing = forceTest || !!policy.testing || devTesting;
    const disarmed = !forceTest && (policy.armed === false || deviceArmed === false);
    const muted = !forceTest && (!!policy.muted || deviceMuted) && !testing;

    const { site, emails: rawEmails, phones: rawPhones } = await resolveSiteAlertRecipients(siteId ?? null);
    const siteName = site?.name || alarm.site || null;

    // DISARMED: monitoring is off — keep the alarm on record, notify no one.
    if (disarmed) {
      await insertNotification({
        alarmId: alarm.id, incidentId: alarm.incident_id || null, site: siteName,
        siteId: site?.id ?? siteId ?? null, deviceId: alarm.device_id || null,
        priority: alarm.priority, channel: "none", recipient: "—",
        name: "Monitoring disarmed — alarm recorded, not paged", role: null,
        status: "suppressed", subject: `${alarm.name} (disarmed)`,
        error: "This site is disarmed. Arm monitoring to resume alarm notifications.",
      }).catch(() => {});
      console.log(`[notify] alarm ${alarm.id} SUPPRESSED — site ${siteName || siteId} disarmed`);
      return { attempted: 0, delivered: 0, disarmed: true };
    }

    // TESTING → test alarm (Low, NOC+field only). MUTED → Low.
    if (testing || muted) alarm = await applyAlarmPolicy(alarm, { toLow: true, asTest: testing });

    const isCritical = alarm.priority === "Critical";
    // Routing:
    //  • test alarms go ONLY to NOC + field technicians (both monitoring & security side)
    //  • otherwise every contact EXCEPT the security company on non-critical alarms.
    const emails = testing ? rawEmails.filter((r) => isTestRole(r.role))
                 : isCritical ? rawEmails : rawEmails.filter((r) => !r.security);
    const phones = testing ? rawPhones.filter((r) => isTestRole(r.role))
                 : isCritical ? rawPhones : rawPhones.filter((r) => !r.security);
    const excludedSecurity = (rawEmails.length + rawPhones.length) - (emails.length + phones.length);
    const baseUrl = await getAppBaseUrl();
    const msg = buildMessages(alarm, siteName, baseUrl);

    const base = {
      alarmId: alarm.id, incidentId: alarm.incident_id || null, site: siteName,
      siteId: site?.id ?? siteId ?? null, deviceId: alarm.device_id || null,
      priority: alarm.priority, subject: msg.subject,
    };

    // ALWAYS leave a trace, even when nobody is registered — so the operator can see
    // the alarm fired a notification and WHY nothing went out (empty contacts).
    if (emails.length === 0 && phones.length === 0) {
      const onlySecurityExcluded = !!site && excludedSecurity > 0 && !testing;
      await insertNotification({
        ...base, channel: "none", recipient: "—",
        name: !site ? "Site not found for this alarm"
          : testing ? "No NOC / field-technician contacts for test alarm"
          : onlySecurityExcluded ? "Only security-company contacts — skipped for non-critical alarm"
          : "No contacts registered for this site",
        role: null, status: "no_contact",
        error: !site
          ? "The alarm's device is not linked to a site, so no contacts could be resolved."
          : testing
            ? "Test alarms only reach NOC + field technicians. Add a Monitoring NOC / response contact to this site."
          : onlySecurityExcluded
            ? `This ${alarm.priority} alarm does not notify the security company. Add client/monitoring contacts to reach someone on High/Medium/Low alarms.`
            : "Add alert contacts to this site (Sites → edit → contacts / alert recipients) so alarms can reach someone.",
      });
      console.log(`[notify] alarm ${alarm.id} (${alarm.name}, ${alarm.priority}) → NO RECIPIENTS for ${siteName || "site"}${onlySecurityExcluded ? " (security-only, excluded)" : ""}`);
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

    // If a CRITICAL alert reached no one despite having recipients, surface it as a
    // Medium alarm. (We don't escalate for High/Medium/Low to avoid alarm noise.)
    if (isCritical && attempted > 0 && delivered === 0) {
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
