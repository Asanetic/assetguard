// app/api/apiUtils/ingest/muteGuard.js
// "Mute alerts for N hours" for one device.
//
// WHAT IS MUTED: the notification — the emails and SMS that wake people up.
// The alarm is still evaluated, still inserted, and still shows in the alarms
// list and on the maps. Suppressing the RECORD would destroy the evidence this
// system exists to keep; suppressing the CALL is what an engineer standing at
// an open cabinet actually wants.
//
// HOW IT IS ADOPTED: this module re-exports everything `alarmNotify` exports and
// overrides the notifying ones. `store.js` changes only the SPECIFIER of its
// existing import — "../notify/alarmNotify.js" becomes "./muteGuard.js" — and
// every name it imports keeps working, whether that is one function or five.
// Editing each call site instead would mean finding them all, and there is
// already more than one.
//
// `export *` does not re-export a name that is also declared locally: an
// explicit export shadows a star export. So the two functions below replace
// their originals while everything else passes straight through.
export * from "../notify/alarmNotify.js";

import { query } from "../s_env/db.js";
import {
  notifyAlarmRaised as sendAlarmNotification,
  notifyDisturbanceEarly as sendDisturbanceNotification,
} from "../notify/alarmNotify.js";

/**
 * True when this device is muted right now.
 *
 * `alarms.device_id` carries the human `device_id` text (see insertLiveAlarm's
 * `deviceIdText`), and the same value may be an IMEI for an unregistered
 * device — so both columns are matched, exactly as insertLiveAlarm does.
 *
 * Fails OPEN: any error here means the alert is sent. A muting feature that
 * silences alarms because a query threw is worse than no muting at all.
 */
export async function isAlertMuted(deviceIdText) {
  if (!deviceIdText) return false;
  try {
    const { rows } = await query(
      `SELECT config ->> 'muted_until' AS muted_until
         FROM devices
        WHERE device_id = $1 OR imei = $1
        LIMIT 1`,
      [String(deviceIdText)]
    );
    const until = rows[0]?.muted_until;
    if (!until) return false;
    const at = Date.parse(until);
    return Number.isFinite(at) && at > Date.now();
  } catch (err) {
    // The `config` column is optional on an un-migrated database, and a missing
    // column throws rather than returning null.
    console.error("[mute] check failed, sending anyway:", err?.message || err);
    return false;
  }
}

/**
 * Digs a device identifier out of whatever the caller was given.
 *
 * The notify functions do not share a signature, and this module should not
 * need editing every time one of them changes. Anything it cannot identify is
 * treated as not muted — the same fail-open rule as above.
 */
function deviceKeyOf(...args) {
  for (const arg of args) {
    if (!arg || typeof arg !== "object") continue;
    const key = arg.device_id || arg.deviceId || arg.deviceIdText || arg.imei || arg.serial;
    if (key) return key;
  }
  return null;
}

/** Same signature as the function it replaces. */
export async function notifyAlarmRaised(alarm, options = {}) {
  const key = deviceKeyOf(alarm, options);
  if (await isAlertMuted(key)) {
    console.log(`[mute] muted for ${key} — alarm ${alarm?.id} raised, not notified`);
    return { muted: true, sent: 0 };
  }
  return sendAlarmNotification(alarm, options);
}

/**
 * The early-disturbance notification.
 *
 * Guarded for the same reason and by the same rule. Muting one notification
 * path and leaving another open would be a mute button that half works — worse
 * than none, because you would trust it.
 *
 * Arguments are forwarded untouched, so this keeps working if the signature
 * changes; only the mute check is inserted.
 */
export async function notifyDisturbanceEarly(...args) {
  const key = deviceKeyOf(...args);
  if (await isAlertMuted(key)) {
    console.log(`[mute] muted for ${key} — early disturbance not notified`);
    return { muted: true, sent: 0 };
  }
  return sendDisturbanceNotification(...args);
}
