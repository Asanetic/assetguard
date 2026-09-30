// app/api/apiUtils/notify/testAlarmPush.js
// -----------------------------------------------------------------------------
// "Your device reported." — the push that reaches a technician whose phone is
// locked in a pocket, or whose app Android has killed.
//
// This is NOT the escalation chain. A test alarm never pages the control room;
// this goes only to the technician who opened the job, on their own handset.
// -----------------------------------------------------------------------------

import { techniciansOnSiteFor, allTechnicianUsers } from "../dataControl/push.js";
import { pushToUsers, pushConfigured } from "./pushSend.js";
import { insertNotification } from "../dataControl/notifications.js";

/**
 * Fire and forget.
 *
 * Deliberately NOT awaited by the caller: this sits in the telemetry hot path,
 * where every inbound packet from every device passes through. A slow or
 * unreachable Firebase must never hold up ingest — the alarm row is already
 * written and the app's poll is already a working fallback, so the worst case
 * for a failure here is the notification that the technician would have got
 * anyway once they looked at the screen.
 */
export function notifyTestAlarmPush(alarm, { siteId, deviceIdText, pushTo, drill = false } = {}) {
  if (!alarm) return;

  // ONE PUSH PER TEST, ON THE FIRST SHOT — BUT A DRILL ALWAYS PUSHES.
  //
  // A device shaken for thirty seconds uplinks repeatedly; the row is refreshed
  // each time so the Tests tab stays current and the wizard's poll can still
  // find it, but the technician has already been told and buzzing on every
  // packet trains people to ignore the alert that mattered.
  //
  // A DRILL is different in kind. Somebody deliberately pressed "send test
  // alarm" — that IS the request to notify, and silence is the wrong answer to
  // it. Suppressing it here is why a drill on a device that already had an open
  // test alarm never reached the handset: the row was refreshed rather than
  // created, so the push was skipped along with the duplicate.
  if (alarm.refreshed && !drill) return;

  // EVERY REASON FOR NOT SENDING IS LOGGED. Returning quietly here meant a
  // missing credential, an expired session and a successful send were all
  // indistinguishable from the outside — the alarm row appeared either way and
  // the phone stayed quiet either way.
  if (!pushConfigured()) {
    console.warn(
      `[push] NOT SENT for ${alarm.id} — push is not configured in this process ` +
      `(pid ${process.pid}). The alarm was still raised.`
    );
    return;
  }

  (async () => {
    try {
      // Whoever fired a drill, plus any technician whose wizard covers the
      // device. `pushTo` is how a web-fired drill reaches a person at all: it
      // has no session, so without it there is nobody to address.
      const onSite = await techniciansOnSiteFor({ deviceIdText });
      const extra = (Array.isArray(pushTo) ? pushTo : pushTo ? [pushTo] : [])
        .filter(Boolean).map(String);
      let recipients = [...new Set([...onSite, ...extra])];
      let via = onSite.length ? "on-site session" : "explicit recipient";

      // A DRILL WITH NOBODY TO TELL GOES TO EVERY TECHNICIAN.
      //
      // Targeting the person who fired it was wrong in the ordinary case: they
      // are at a desk on the web app, so their user id has no handset token and
      // the push reached nobody at all. A drill exists to prove the alerting
      // chain works end to end — sending it to whoever can actually receive one
      // is the only version of that which means anything.
      //
      // Set DRILL_PUSH_ALL=0 to keep drills to on-site technicians only, if this
      // turns out noisy once there are many technicians.
      if (drill && !recipients.length && process.env.DRILL_PUSH_ALL !== "0") {
        recipients = await allTechnicianUsers();
        via = "drill broadcast (no technician on site)";
      }

      if (!recipients.length) {
        // A drill fired from the web has no session and therefore nobody to
        // push to. That is correct, not a failure: it belongs in the Tests tab,
        // where whoever fired it is already looking. Logged anyway, because the
        // same shape means "the technician's session expired" — which is NOT
        // fine, and is invisible otherwise.
        console.log(
          `[push] no recipient for ${alarm.id} — device ${deviceIdText ?? "(none)"} is ` +
          `not in any open technician session's device list` +
          (drill
            ? `, and no technician handset is registered at all`
            : `, and it was not a drill`)
        );
        return;
      }

      const device = alarm.device_id || deviceIdText || "Device";
      // The " – test" suffix is for the control room's list, not for somebody
      // holding the tracker they just shook.
      const what = String(alarm.name || "Disturbance").replace(/\s*[–-]\s*test\s*$/i, "");

      const res = await pushToUsers(recipients, {
        title: `${device} reported`,
        body: what,
        data: {
          type: "test_alarm",
          alarm_id: alarm.id,
          device_id: device,
          site: alarm.site || "",
          // Read by the app to decide where a tap should land.
          open: "tests",
        },
      });
      console.log(
        `[push] test alarm ${alarm.id} via ${via} → ${recipients.length} technician(s): ` +
        `${res.delivered ?? 0}/${res.attempted ?? 0} delivered` +
        (res.failures?.length ? ` (failures: ${res.failures.join(", ")})` : "") +
        (res.noTokens ? " — no registered handsets" : "")
      );

      // Record each push to the notifications log so the "push" channel COUNT
      // updates exactly like email and SMS (the Notifications screen reads these
      // counts). Best-effort: a logging failure must never affect delivery.
      // One row per technician addressed.
      try {
        const anyDelivered = (res.delivered ?? 0) > 0;
        for (const uid of recipients) {
          await insertNotification({
            alarmId: alarm.id, incidentId: alarm.incident_id || null,
            site: alarm.site || null, siteId: siteId ?? null, deviceId: device,
            priority: alarm.priority || "Low", channel: "push",
            recipient: `user ${uid}`, name: null, role: "Test alarm",
            status: anyDelivered ? "sent" : "failed",
            error: anyDelivered ? null : (res.noTokens ? "no registered handset" : "not delivered"),
            subject: `${device} reported`,
          });
        }
      } catch (e) { console.error("[push] test-alarm notif log:", e?.message || e); }
    } catch (e) {
      console.error("[push] test alarm push failed:", e?.message || e);
    }
  })();
}
