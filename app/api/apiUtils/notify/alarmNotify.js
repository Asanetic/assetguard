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
import { mosySendSMS, sendSmsWith } from "./send-sms.js";
import { getSmsConfig } from "../dataControl/appConfig.js";
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

// SAFETY NET so a Critical alarm reaches EVERY number/email registered on the site,
// even ones the known slots above don't name. Walks the whole details tree and
// captures any person/team-shaped node — i.e. any object carrying an `emails` or
// `phones` field. It reads ONLY those two fields, never arbitrary digit strings, so
// device serials/IMEIs/coordinates are never mistaken for phone numbers. Nodes found
// under a "security…" branch keep a Security role so non-Critical alarms still exclude
// them; everything else is included at all severities. De-dup (first role wins) means
// the precisely-labelled slots above take precedence over anything re-found here.
function collectContactNodes(node, inSecurity, out, seen) {
  if (!node || typeof node !== "object") return;
  if (seen.has(node)) return;
  seen.add(node);
  if (Array.isArray(node)) { for (const x of node) collectContactNodes(x, inSecurity, out, seen); return; }
  if (node.emails != null || node.phones != null) {
    pushPerson(out, node, node.role || (inSecurity ? "Security — site contact" : "Site contact"));
  }
  for (const [k, v] of Object.entries(node)) {
    if ((k === "emails" || k === "phones") && !(v && typeof v === "object" && !Array.isArray(v))) continue;
    if (v && typeof v === "object") collectContactNodes(v, inSecurity || /security/i.test(k), out, seen);
  }
}

/**
 * Flatten a site's `details` JSONB into de-duplicated email + SMS recipient lists.
 * Pure (no I/O) so it is directly testable.
 * @returns {{emails:Array<{value,name,role}>, phones:Array<{value,name,role}>}}
 */
// The people a site's OWN details carry (the legacy per-site contacts). Kept
// alongside the company-derived ones during the transition ("keep both").
function sitePeople(details) {
  const d = details || {};
  const people = [];
  // Client company
  pushPerson(people, d.company?.manager,    "Client company — manager");
  pushPerson(people, d.company?.assistant1, "Client company — assistant");
  pushPerson(people, d.company?.assistant2, "Client company — assistant");
  // Security company — country + region (legacy per-site)
  pushPerson(people, d.securityCompany?.country?.operationsManager, "Security — country ops manager");
  pushPerson(people, d.securityCompany?.country?.assistant,        "Security — country assistant");
  pushPerson(people, d.securityCompany?.country?.assistant2,       "Security — country assistant");
  pushPerson(people, d.securityCompany?.region?.fieldOperationsManager, "Security — field ops manager");
  pushPerson(people, d.securityCompany?.region?.assistant,         "Security — field assistant");
  pushPerson(people, d.securityCompany?.region?.assistant2,        "Security — field assistant");
  for (const t of d.securityCompany?.nocTeams || [])     pushPerson(people, t, "Security — NOC team");
  for (const t of d.securityCompany?.responseTeams || []) pushPerson(people, t, "Security — response team");
  // Monitoring NOC
  for (const t of d.noc?.nocTeams || []) pushPerson(people, t, "Monitoring — NOC team");
  // Manually-typed alert recipients
  for (const e of d.alerts?.emails || []) people.push({ name: "", emails: [e], phones: [], role: "Alert recipient" });
  for (const p of d.alerts?.sms || [])    people.push({ name: "", emails: [], phones: [p], role: "Alert recipient" });
  // Safety net: sweep the whole tree so any registered contact the named slots above
  // missed is still included. De-dup (first wins) keeps the precise roles above.
  collectContactNodes(d, false, people, new Set());
  return people;
}

// A company's stored contacts (manager + 2 assistants) as people. The role
// prefix decides the `security` flag below: only "Security …" is held back from
// non-Critical alarms.
function companyPeople(company, rolePrefix) {
  const c = (company && company.contacts) || {};
  const out = [];
  pushPerson(out, c.manager,    `${rolePrefix} — manager`);
  pushPerson(out, c.assistant1, `${rolePrefix} — assistant`);
  pushPerson(out, c.assistant2, `${rolePrefix} — assistant`);
  return out;
}

// De-dupe a people list into email + SMS recipients. First name/role seen wins.
// The `security` flag lets non-Critical alarms exclude the security company.
function flattenPeople(people) {
  const isSecurity = (role) => /^security/i.test(String(role || ""));
  const emailMap = new Map(), phoneMap = new Map();
  for (const person of people) {
    for (const e of person.emails || []) {
      const v = String(e || "").trim().toLowerCase();
      if (validEmail(v) && !emailMap.has(v)) emailMap.set(v, { value: v, name: person.name, role: person.role, security: isSecurity(person.role) });
    }
    for (const p of person.phones || []) {
      const v = cleanPhone(p);
      if (validPhone(v) && !phoneMap.has(v)) phoneMap.set(v, { value: v, name: person.name, role: person.role, security: isSecurity(person.role) });
    }
  }
  return { emails: [...emailMap.values()], phones: [...phoneMap.values()] };
}

/** Pure flatten of a site's own details (kept for tests + the per-site path). */
export function flattenSiteContacts(details) {
  return flattenPeople(sitePeople(details));
}

/**
 * Every contact a site's alarms should reach — its own saved `details` PLUS the
 * live contacts of the companies it is assigned to (security + monitoring by
 * name, and the single global client company). Company edits therefore reach
 * every assigned site with no re-save. Security-company contacts stay
 * Critical-only via the `security` flag.
 * @returns {Promise<{site:object, emails:Array, phones:Array}>}
 */
export async function resolveSiteAlertRecipients(siteId) {
  const site = siteId != null ? await getSite(siteId).catch(() => null) : null;
  const people = sitePeople((site && site.details) || {});
  try {
    const { getCompanyContactsByName, getClientCompany } = await import("../dataControl/companies.js");
    if (site?.security_company) {
      const sc = await getCompanyContactsByName(site.security_company);
      if (sc) people.push(...companyPeople(sc, "Security company"));   // "Security …" → Critical-only
    }
    if (site?.monitoring_company) {
      const mc = await getCompanyContactsByName(site.monitoring_company);
      if (mc) people.push(...companyPeople(mc, "Monitoring company"));  // all severities
    }
    const client = await getClientCompany();
    if (client) people.push(...companyPeople(client, "Client company")); // all severities
  } catch (e) { console.error("[notify] company-contact resolve:", e?.message || e); }
  const { emails, phones } = flattenPeople(people);
  return { site, emails, phones };
}

// Append `extra` recipients to `base`, skipping any value already present.
// Both are the { value, name, role, security } records flattenPeople returns,
// and de-dup is by the normalised value (lower-cased email / cleaned phone),
// so a responder who is ALSO a typed site contact is texted/emailed once.
function mergeRecipients(base, extra) {
  const seen = new Set(base.map((r) => r.value));
  const out = base.slice();
  for (const r of extra) {
    if (!seen.has(r.value)) { seen.add(r.value); out.push(r); }
  }
  return out;
}

/**
 * The response-team and NOC USER ACCOUNTS a Critical alarm must also reach by
 * SMS + email — the same people `alarmPushTokens.tokensForAlarm` reaches by
 * device token, addressed here at their account phone + email so they are
 * texted and emailed too, not only pushed.
 *
 * WHY, beyond `resolveSiteAlertRecipients`: that function reads the site's own
 * `details` form, so it only carries numbers/emails somebody typed against the
 * site. Responders and NOC operators are assigned by ROLE + region and by their
 * company's purpose, not by being listed on each site — their contact detail is
 * on their user row. Push already reaches them that way; this mirrors that
 * audience into the two mailbox channels.
 *
 * CRITICAL ONLY — enforced by the sole caller (`notifyAlarmRaised` invokes this
 * only when the possibly-downgraded alarm is still Critical), so a test / muted
 * / disarmed alarm never texts the response team.
 *
 * SCOPED STRICTLY TO THE SITE. This reaches ONLY users who are explicitly
 * registered under THIS site (a `user_sites` row for it) — never everyone in a
 * region, and never every NOC user on the platform. An earlier version pulled
 * the response set by region and every `noc` user unconditionally ("the control
 * room covers all sites"), which meant a NOC operator with no connection to the
 * site was texted for it. Site registration is the rule now: not on the site,
 * not notified. Their number/email comes off their user row, so a responder or
 * NOC operator assigned to the site is reached even when nobody typed them into
 * the site form — but assignment to the site is required.
 *
 * Audience: Active users assigned to this site whose role is a response/NOC one
 * (`field_resp`, `sec_*`, `company_mgr`, `asst_mgr`, `noc`) or who are at a
 * Response- or NOC-purpose company. Role labels are kept for the notifications
 * log. Never throws — a lookup failure returns [] and the site-form + assigned-
 * company contacts (resolveSiteAlertRecipients) still stand.
 *
 * @param {number|string|null} siteId the alarm's site id
 * @returns {Promise<Array<{name,emails:string[],phones:string[],role:string}>>}
 */
export async function resolveCriticalTeamUserRecipients(siteId = null) {
  if (siteId == null) return [];
  try {
    const { rows } = await query(
      `SELECT u.name, u.email, u.phone, u.role,
              CASE WHEN u.role = 'noc'            THEN 'Monitoring — NOC user'
                   WHEN u.role = 'field_resp'     THEN 'Security — response user'
                   WHEN u.role LIKE 'sec\\_%'      THEN 'Security — manager'
                   WHEN u.role IN ('company_mgr','asst_mgr') THEN 'Company manager'
                   ELSE 'Site user' END AS role_label
         FROM users u
         JOIN user_sites us ON us.user_id = u.id AND us.site_id = $1
         LEFT JOIN companies c ON c.id = u.company_id
        WHERE u.status = 'Active'
          AND (
                u.role IN ('field_resp', 'company_mgr', 'asst_mgr', 'noc')
                OR u.role LIKE 'sec\\_%'
                OR EXISTS (SELECT 1 FROM unnest(COALESCE(c.purposes, '{}')) AS purpose
                            WHERE lower(purpose) IN ('response', 'noc'))
              )`,
      [siteId]
    );
    return rows.map((r) => ({
      name: r.name || "",
      emails: r.email ? [r.email] : [],
      phones: r.phone ? [r.phone] : [],
      role: r.role_label,
    }));
  } catch (e) {
    console.error("[notify] critical team user resolve:", e?.message || e);
    return [];
  }
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
        priority: "Critical", channel: "none", recipient: "—", category: "disturbance",
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

    const base = { alarmId: null, site: siteName, siteId: siteRow?.id ?? siteId ?? null, deviceId: deviceIdText || null, priority: "Critical", subject, category: "disturbance" };
    let attempted = 0, delivered = 0;

    // SMS config resolved ONCE up front (getSmsConfig hits the DB), so the SMS jobs
    // below go straight to the provider with no per-message DB read in front of them.
    const smsCfg = phones.length ? await getSmsConfig().catch(() => null) : null;

    // FIRE SMS + EMAIL IMMEDIATELY. These IIFEs start the instant they're mapped,
    // so the SMS request is on the wire before anything else runs. Nothing — push
    // setup, the Firebase module import, the push-token DB lookup — is allowed to
    // sit in front of the SMS send.
    const jobs = [
      ...phones.map((r) => (async () => {
        attempted++; let status = "sent", error = null, res = null;
        try { res = smsCfg ? await sendSmsWith(smsCfg, r.value, sms, { skipLog: true }) : await mosySendSMS(r.value, sms, { skipLog: true }); if (res.status === "success") delivered++; else { status = "failed"; error = res.message; } }
        catch (e) { status = "failed"; error = e?.message || "send error"; }
        await insertNotification({ ...base, channel: "sms", recipient: r.value, name: r.name, role: r.role, status, error, messageId: res?.data?.messageId, provider: res?.data?.provider });
      })()),
      ...emails.map((r) => (async () => {
        // Email has no async receipt → a successful send is terminal 'delivered'.
        attempted++; let status = "delivered", error = null;
        try { const res = await sendEmail(r.value, subject, text, html, { skipLog: true }); if (res.status === "success") delivered++; else { status = "failed"; error = res.message; } }
        catch (e) { status = "failed"; error = e?.message || "send error"; }
        await insertNotification({ ...base, channel: "email", recipient: r.value, name: r.name, role: r.role, status, error });
      })()),
    ];

    // PUSH is resolved AFTER the SMS/email are already in flight, then joined into
    // the same wait. Its Firebase import + token lookup no longer delay the SMS.
    // Audience resolved at Critical scope (pulls in the region response team).
    try {
      const { isConfigured, sendToToken } = await import("./fcm.js");
      const { tokensForAlarm } = await import("../dataControl/alarmPushTokens.js");
      if (isConfigured()) {
        const recips = await tokensForAlarm(emails.map((e) => e.value), "Critical", siteRow?.security_region || null);
        const pushMsg = {
          notification: { title: `Disturbance warning ${step}/${total}: ${where}`, body: `${dev} · ${when}` },
          data: {
            type: "disturbance_warning", step: String(step), total: String(total),
            site: String(where), device_id: String(dev), created_at: String(Date.now()), link,
          },
          android: {
            priority: "high",
            notification: { icon: "ic_stat_assetguard", color: "#F59E0B", channel_id: "alarms_high", tag: `disturb-warn-${deviceIdText || dev}` },
          },
          apns: { headers: { "apns-priority": "10" }, payload: { aps: { sound: "default" } } },
        };
        for (const r of recips) jobs.push((async () => {
          attempted++;
          let ok = false, err = null;
          try { const res = await sendToToken(r.token, pushMsg); ok = !!res.ok; if (!ok) err = res.error; }
          catch (e) { err = e?.message || "push error"; }
          if (ok) delivered++;
          // Push has no async receipt → a successful accept is terminal 'delivered'.
          await insertNotification({ ...base, channel: "push", recipient: r.email || `user ${r.userId}`, name: r.name || null, role: r.reason || null, status: ok ? "delivered" : "failed", error: err });
        })());
      }
    } catch (e) { console.error("[notify] disturbance-warning push:", e?.message || e); }

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
// Test alarms during Testing/Maintenance go to the NOC + the installers/field techs.
const isTestRole = (role) => /noc|response|field|technician|installer|install/i.test(String(role || ""));

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
    // TESTING/MAINTENANCE WINS: a site/device under test always logs its alarms as test
    // (and pages NOC + installers), even if it's also disarmed or muted.
    const disarmed = !forceTest && !testing && (policy.armed === false || deviceArmed === false);
    const muted = !forceTest && !testing && (!!policy.muted || deviceMuted);

    const { site, emails: rawEmails, phones: rawPhones } = await resolveSiteAlertRecipients(siteId ?? null);
    const siteName = site?.name || alarm.site || null;

    // DISARMED: monitoring is off — keep the alarm on record, notify no one.
    if (disarmed) {
      await insertNotification({
        alarmId: alarm.id, incidentId: alarm.incident_id || null, site: siteName,
        siteId: site?.id ?? siteId ?? null, deviceId: alarm.device_id || null,
        priority: alarm.priority, channel: "none", recipient: "—", category: "alarm",
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
    let emails = testing ? rawEmails.filter((r) => isTestRole(r.role))
                 : isCritical ? rawEmails : rawEmails.filter((r) => !r.security);
    let phones = testing ? rawPhones.filter((r) => isTestRole(r.role))
                 : isCritical ? rawPhones : rawPhones.filter((r) => !r.security);
    const excludedSecurity = (rawEmails.length + rawPhones.length) - (emails.length + phones.length);

    // CRITICAL → also reach the response-team + NOC USER ACCOUNTS by SMS + email,
    // the very audience the push path reaches by device token. The site-details
    // path above only carries numbers/emails somebody typed into the Add-site
    // form; a responder or NOC operator is assigned by ROLE + region (and by
    // their company's purpose), and their number lives on their account, not on
    // every site they cover. Merging them here is what makes "not just push"
    // true — the same phone that buzzed is now texted and emailed too.
    //
    // Not for a test/muted/disarmed alarm: those were downgraded below Critical
    // above, so isCritical is already false and this branch is skipped — the
    // response team is never blasted about a drill.
    if (isCritical && !testing) {
      const teamPeople = await resolveCriticalTeamUserRecipients(site?.id ?? siteId ?? null);
      const { emails: te, phones: tp } = flattenPeople(teamPeople);
      emails = mergeRecipients(emails, te);
      phones = mergeRecipients(phones, tp);
    }

    const baseUrl = await getAppBaseUrl();
    const msg = buildMessages(alarm, siteName, baseUrl);

    const base = {
      alarmId: alarm.id, incidentId: alarm.incident_id || null, site: siteName,
      siteId: site?.id ?? siteId ?? null, deviceId: alarm.device_id || null,
      priority: alarm.priority, subject: msg.subject, category: "alarm",
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

    let attempted = 0, delivered = 0, emailAttempted = 0, emailDelivered = 0;

    // SMS config resolved ONCE up front (getSmsConfig hits the DB), so each SMS job
    // goes straight to the provider with no per-message DB read in front of it.
    const smsCfg = phones.length ? await getSmsConfig().catch(() => null) : null;

    // FIRE SMS FIRST — its IIFE starts the instant it's mapped, so the SMS request
    // is on the wire before the email jobs even begin. Nothing waits ahead of it.
    const smsJobs = phones.map((r) => (async () => {
      attempted++;
      let status = "sent", error = null, res = null;
      try {
        res = smsCfg ? await sendSmsWith(smsCfg, r.value, msg.sms, { skipLog: true }) : await mosySendSMS(r.value, msg.sms, { skipLog: true });
        if (res.status === "success") delivered++; else { status = "failed"; error = res.message; }
      } catch (e) { status = "failed"; error = e?.message || "send error"; }
      await insertNotification({ ...base, channel: "sms", recipient: r.value, name: r.name, role: r.role, status, error, messageId: res?.data?.messageId, provider: res?.data?.provider });
    })());

    const emailJobs = emails.map((r) => (async () => {
      attempted++; emailAttempted++;
      // Email has no async receipt → a successful send is terminal 'delivered'.
      let status = "delivered", error = null;
      try {
        const res = await sendEmail(r.value, msg.subject, msg.text, msg.html, { skipLog: true });
        if (res.status === "success") { delivered++; emailDelivered++; } else { status = "failed"; error = res.message; }
      } catch (e) { status = "failed"; error = e?.message || "send error"; }
      await insertNotification({ ...base, channel: "email", recipient: r.value, name: r.name, role: r.role, status, error });
    })());

    await Promise.all([...smsJobs, ...emailJobs]);

    // Surface a delivery failure as a Medium NOTIFICATION_FAILED alarm when:
    //   • the EMAIL channel reached NO ONE it tried (any severity) — an
    //     undelivered email must be visible, or nobody knows the alert missed; OR
    //   • a CRITICAL alert reached no one on ANY channel (the original rule).
    // insertLiveAlarm de-dupes per (device, NOTIFICATION_FAILED), so a run of
    // failures doesn't stack. (SMS is wired separately later.)
    const emailAllFailed = emailAttempted > 0 && emailDelivered === 0;
    const criticalAllFailed = isCritical && attempted > 0 && delivered === 0;
    if (emailAllFailed || criticalAllFailed) {
      try {
        const detail = emailAllFailed
          ? `${alarm.name} — email ${emailDelivered}/${emailAttempted} delivered`
          : `${alarm.name} — 0/${attempted} delivered`;
        await insertLiveAlarm({
          alarmType: "NOTIFICATION_FAILED",
          value: detail,
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
