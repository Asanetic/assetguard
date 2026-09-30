// app/api/apiUtils/notify/alarmPush.js
// ---------------------------------------------------------------------------
// Push a raised alarm to the phones of everyone registered on its site, plus
// every administrator.
//
// **This is a fourth channel beside email and SMS, not a replacement for
// either.** `alarmNotify.js` is untouched: it still fires only for Critical
// alarms and still sends exactly what it sent before. This module runs
// alongside it and sends to a different kind of address — a device, not a
// mailbox — and it fires for EVERY raised alarm, which is the difference the
// two audiences asked for.
//
// Every send is logged to the same `notifications` table with `channel:'push'`,
// so the Notifications screen counts it beside the other three with no change.
//
// Nothing here throws to the caller and nothing here is awaited by the ingest
// path. A packet must never be slowed down, and must certainly never fail,
// because a phone could not be reached.
// ---------------------------------------------------------------------------
import { query } from "../s_env/db.js";
import { insertNotification } from "../dataControl/notifications.js";
// alarmPushTokens, NOT pushTokens: the latter reads `push_tokens`, which
// nothing on this deployment writes — `mainapp/push/register` writes
// `technician_push_tokens`. See the header of alarmPushTokens.js.
import { tokensForAlarm, disableDeadTokens } from "../dataControl/alarmPushTokens.js";
import { resolveSiteAlertRecipients } from "./alarmNotify.js";
import { isConfigured, sendToToken } from "./fcm.js";

const APP_URL = process.env.APP_URL || "http://localhost:3000";

/**
 * The plumbing alarm `alarmNotify` raises when email and SMS both failed.
 *
 * Never pushed, for two reasons. It is addressed to whoever runs the platform,
 * not to the people on the site; and pushing "we could not reach you" to the
 * very people we could not reach is a notification that can only ever be
 * either wrong or unnecessary.
 */
const NEVER_PUSH = new Set(["NOTIFICATION_FAILED"]);

/**
 * Which Android channel carries it, by priority.
 *
 * Three channels rather than one, and this is the safety valve on "push every
 * alarm". Android exposes channels individually in system settings, so a person
 * drowning in Low Battery notifications can silence `alarms_default` and still
 * be woken by `alarms_critical`. One channel would leave them the single choice
 * of all of it or none of it — and, faced with that, people turn off all of it.
 */
const CHANNELS = {
  Critical: "alarms_critical",
  High: "alarms_high",
};
const DEFAULT_CHANNEL = "alarms_default";

const channelFor = (priority) => CHANNELS[priority] || DEFAULT_CHANNEL;

/**
 * Severity colour coding, identical to the alarm badges in the app/web. It tints
 * the status-bar icon (the AssetGuard silhouette) on the push, so the logo on the
 * notification carries the alarm's severity colour. Unknown → the logo blue.
 */
const SEVERITY_COLOR = {
  Critical: "#EF4444",
  High: "#F59E0B",
  Medium: "#0EA5E9",
  Low: "#64748B",
};
const severityColor = (priority) => SEVERITY_COLOR[priority] || "#2E6CF5";

/** How many devices are messaged at once. See the loop in pushAlarmRaised. */
const SEND_BATCH = 20;

const fmtEAT = (v) => {
  try {
    return new Date(v || Date.now()).toLocaleString("en-GB", {
      timeZone: "Africa/Nairobi", day: "2-digit", month: "short",
      hour: "2-digit", minute: "2-digit", hour12: false,
    }) + " EAT";
  } catch { return ""; }
};

/**
 * The site an alarm belongs to, when the caller could not say.
 *
 * `insertLiveAlarm` knows the site NAME but not its id, and contacts are
 * resolved by id. Rather than change that function's signature — it is shared
 * with the web — the id is looked up here from the device, the same join
 * `insertLiveAlarm` already does for the alarm's coordinates.
 */
async function siteIdForDevice(deviceIdText) {
  if (!deviceIdText) return null;
  try {
    const { rows } = await query(
      `SELECT site_id FROM devices WHERE device_id = $1 OR imei = $1 LIMIT 1`,
      [String(deviceIdText)]
    );
    return rows[0]?.site_id ?? null;
  } catch (e) {
    console.error("[push] site lookup:", e?.message || e);
    return null;
  }
}

function buildMessage(alarm, siteName, channelId) {
  const where = siteName || alarm.site || "site";
  const device = alarm.device_id || alarm.serial || "device";
  const when = fmtEAT(alarm.created_at);
  const critical = alarm.priority === "Critical";

  const title = critical ? `CRITICAL: ${alarm.name}` : `${alarm.priority}: ${alarm.name}`;
  const body = `${where} · ${device} · ${when}`;

  return {
    // BOTH a notification block and a data block, deliberately.
    //
    // With data alone, `onMessageReceived` has to run to show anything — and on
    // several popular handsets the OEM battery manager will not wake a stopped
    // app to deliver a data message, so the alarm silently never appears. With
    // a notification block the SYSTEM draws it whether or not the app can be
    // woken, and `android.notification` below carries the icon, colour and
    // channel that would otherwise be the reason for handling it in code.
    //
    // The data block rides along either way: it is delivered to
    // `onMessageReceived` when the app is in the foreground, and it arrives in
    // the launch intent's extras when a system-drawn notification is tapped.
    // That is what makes the tap open the alarm rather than the dashboard.
    notification: { title, body },
    data: {
      // Every value must be a STRING. FCM v1 rejects the whole message if any
      // data value is a number or a boolean, and the rejection names the field
      // rather than the type, which makes it a genuinely confusing five
      // minutes if you have not hit it before.
      type: "alarm",
      alarm_id: String(alarm.id ?? ""),
      incident_id: String(alarm.incident_id ?? ""),
      priority: String(alarm.priority ?? ""),
      name: String(alarm.name ?? ""),
      site: String(where),
      device_id: String(device),
      created_at: String(alarm.created_at ?? ""),
      channel_id: channelId,
      link: `${APP_URL}/mainapp/alarms/${encodeURIComponent(alarm.id ?? "")}`,
    },
    android: {
      // HIGH so the message is delivered through Doze rather than held until
      // the next maintenance window. An alarm batched for an hour is not one.
      priority: "high",
      notification: {
        // The status-bar mark: the AssetGuard shield with no blue tile behind
        // it. Android draws a small icon from its ALPHA CHANNEL alone — every
        // opaque pixel becomes white — so a full-colour launcher icon here
        // renders as a featureless white square.
        icon: "ic_stat_assetguard",
        color: severityColor(alarm.priority),
        channel_id: channelId,
        // One notification per alarm, replaced rather than stacked if the same
        // alarm is somehow delivered twice.
        tag: `alarm-${alarm.id ?? ""}`,
      },
    },
    apns: {
      // Harmless on an Android-only fleet and correct the day there is an iOS
      // build: without it a background message is delivered silently.
      headers: { "apns-priority": "10" },
      payload: { aps: { sound: "default" } },
    },
  };
}

/**
 * Push one raised alarm.
 *
 * @param {object} alarm the row `insertLiveAlarm` returned — never null, and
 *   never a de-duped alarm, because a de-duped one returns null and this is
 *   only called on a real insert.
 * @param {{siteId?:number|null}} opts
 */
export async function pushAlarmRaised(alarm, { siteId } = {}) {
  // TEST ALARMS ARE NOT THIS FUNCTION'S BUSINESS.
  //
  // A drill, or any alarm raised while a technician has an open job on the
  // site, is stamped source='test'. It already has its own push path —
  // store.js calls notifyTestAlarmPush, which reaches the technician whose
  // wizard covers that device and nobody else.
  //
  // Without this guard the same shake reaches the control room and every
  // responder as well, which is exactly what marking it a test was meant to
  // prevent: listAlarms hides these from the alarm list by default, so people
  // would be paged about an alarm they then could not find.
  if (String(alarm?.source || "") === "test") {
    return { attempted: 0, delivered: 0, skipped: "test alarm" };
  }
  try {
    if (!alarm || !alarm.id) return { skipped: true };
    if (NEVER_PUSH.has(alarm.alarm_type)) return { skipped: true };

    // An explicit off switch, separate from "no credentials".
    //
    // The simulator writes REAL alarms — `mainapp/ingest/simulate` calls
    // `resolveAndStore`, which is the same path a device takes, and
    // `insertLiveAlarm` stamps `source='device'` on both so nothing downstream
    // can tell them apart. Today only a simulated CRITICAL alarm emails and
    // texts everyone; pushing every priority would mean a test run buzzes every
    // administrator's handset. PUSH_ENABLED=false is how you use the simulator
    // on a server that has Firebase configured.
    if (String(process.env.PUSH_ENABLED || "").toLowerCase() === "false") {
      return { skipped: true, reason: "disabled" };
    }

    // Quiet, and on purpose: a server with no Firebase credentials is a normal
    // state, not an error, and logging it per alarm would bury the ingest log.
    if (!isConfigured()) return { skipped: true, reason: "not configured" };

    const resolvedSiteId = siteId ?? (await siteIdForDevice(alarm.device_id));
    const { site, emails } = await resolveSiteAlertRecipients(resolvedSiteId);
    const siteName = site?.name || alarm.site || null;

    // Priority goes in: the security side is barred from anything below
    // Critical everywhere else in the product, and a lock-screen notification
    // is a disclosure like any other. It also decides whether the RESPONSE TEAM
    // is reached at all — they are pushed Critical alarms and nothing else.
    // See tokensForAlarm.
    // Region scope: the response team is only pushed alarms in THEIR security region
    // (country-wide users cover every region). Site contacts + admins are unchanged.
    const recipients = await tokensForAlarm(emails.map((e) => e.value), alarm.priority, site?.security_region || null);
    if (!recipients.length) {
      // NOT logged, and NOT raised as a NOTIFICATION_FAILED alarm.
      //
      // Email and SMS log a `no_contact` row when a site has nobody registered,
      // because that is a misconfiguration somebody must fix. "Nobody has
      // installed the app yet" is not — and since this fires for every alarm on
      // every device, logging it would write a row per alarm forever and drown
      // the very failures the log exists to show.
      return { attempted: 0, delivered: 0 };
    }

    const channelId = channelFor(alarm.priority);
    const message = buildMessage(alarm, siteName, channelId);

    const base = {
      alarmId: alarm.id,
      incidentId: alarm.incident_id || null,
      site: siteName,
      siteId: site?.id ?? resolvedSiteId ?? null,
      deviceId: alarm.device_id || null,
      priority: alarm.priority,
      subject: message.notification.title,
    };

    let delivered = 0;
    const dead = [];

    // Chunked rather than one unbounded Promise.all. This runs inside the
    // ingest path, and a site with a large audience would otherwise open every
    // HTTPS connection to FCM at once, on the thread that is meant to be
    // storing a telemetry packet.
    const send = async (r) => {
      const result = await sendToToken(r.token, message);
      if (result.ok) delivered++;
      if (result.dead) dead.push(r.token);

      await insertNotification({
        ...base,
        channel: "push",
        // The person, not the token. A 160-character FCM string in the
        // recipient column would make the delivery log unreadable, and the
        // question it has to answer is "who was told", not "which handset".
        recipient: r.email || `user ${r.userId}`,
        name: r.name || null,
        role: r.reason || null,
        status: result.ok ? "sent" : "failed",
        error: result.ok ? null : result.error,
      });
    };

    for (let i = 0; i < recipients.length; i += SEND_BATCH) {
      await Promise.all(recipients.slice(i, i + SEND_BATCH).map(send));
    }

    // An uninstalled app leaves its token behind. Retiring it here rather than
    // on a schedule keeps the table honest at no extra cost — this is the only
    // moment anyone finds out a token is dead. Disabled, not deleted: the row
    // is how "why did this phone go quiet" stays answerable.
    if (dead.length) await disableDeadTokens(dead);

    console.log(
      `[push] alarm ${alarm.id} (${alarm.name}) → ${delivered}/${recipients.length} ` +
      `device(s) for ${siteName || "site"}`
    );
    return { attempted: recipients.length, delivered };
  } catch (e) {
    console.error("[push] pushAlarmRaised error:", e?.message || e);
    return { error: e?.message || "push error" };
  }
}
