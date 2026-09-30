// app/api/apiUtils/ingest/siteUnderTest.js
// -----------------------------------------------------------------------------
// "Is this site under test right now?" — the single hook the ingest pipeline
// consults before recording an alarm.
//
// Replaces the old techOnSite.js, and the change is not a rename. That hook
// answered a question about SEVERITY: it downgraded a disturbance to a Low
// "tech on site" tier while leaving it a real alarm in every other respect.
// That was the wrong question, and it produced a category nobody wanted —
// half-real alarms sitting in the live queue at a tier that meant "ignore me".
//
// The right question is simpler:
//
//   WHILE A SITE IS BEING INSTALLED OR MAINTAINED, NOTHING IT REPORTS IS REAL.
//
// A technician has opened a job on that site. They are handling the trackers,
// unbolting them, moving cables, shaking them on purpose. Every alarm that comes
// out of that is a test alarm — the disturbance they meant to cause, and equally
// the geofence trip from carrying a unit to the van and the offline blip from
// cutting its power. None of it is an incident. All of it is testing.
//
// So the answer here does not change an alarm's tier. It changes what the alarm
// IS: rows raised while this returns true are written with source='test', which
// the rest of the platform already understands —
//
//   • listAlarms hides them from the control room unless explicitly asked
//   • alarmCounts and the KPIs leave them out
//   • the real de-dupe ignores them, so a test can never suppress a real alarm
//   • the technician app's Tests tab is exactly the view that shows them
//
// Nothing is hidden or faked: the row exists, it is complete, it is labelled,
// and the technician can acknowledge and close it from their own app.
//
// NOT ACSYS. The old hook was written expecting the site access-control system
// to supply this. That integration has not happened and this does not stand in
// for it — access control answers "is a person authorised to be here", which is
// a different question with different consequences. This answers only "has a
// technician opened a job on this site in our own app". When ACSYS lands it
// deserves its own hook and its own decision.
//
// The session's own expiry is what keeps this safe — see db/technician.sql. A
// forgotten session cannot leave a site permanently untrusted.
// -----------------------------------------------------------------------------

import { underTestReason } from "../dataControl/technician.js";

/**
 * Is this device under test, and why — or why not?
 *
 * Three ways to be under test, any one of which is enough:
 *
 *   • the DEVICE's status is Testing or Maintenance
 *   • the SITE's status is Testing or Maintenance
 *   • an open technician session covers it, matched by site OR by device id —
 *     the second matters because a tracker being installed usually has no
 *     site_id yet, which is the exact case this feature exists for
 *
 * The first two predate the technician app: the notify layer already relabelled
 * such alarms "… – test" at Low. It did so after the row was inserted, though,
 * so de-duplication never applied and the same device produced a new row on
 * every uplink. Answering here, before the insert, is what fixes that.
 *
 * @param {{siteId: number|string|null, deviceIdText: string|null, deviceStatus?: string|null}} what
 * @param {Date} [at]
 * @returns {Promise<{underTest: boolean, sessionId: number|null, via: string}>}
 */
export async function isSiteUnderTest(what, at = new Date()) {
  try {
    return await underTestReason(what, at);
  } catch (err) {
    // FAIL CLOSED, and loudly.
    //
    // If this lookup breaks, the safe answer is "not under test": the alarm is
    // then recorded as real, at full severity, and somebody stands it down in
    // thirty seconds. Answering "yes" on an error would file a genuine break-in
    // as a test — invisible to the control room — because the database
    // hiccuped. One of those failures is recoverable and the other is not.
    console.error("[underTest] lookup failed, assuming NOT under test:", err.message);
    return { underTest: false, sessionId: null, via: `lookup failed: ${err.message}` };
  }
}
