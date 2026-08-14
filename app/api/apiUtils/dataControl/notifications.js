// app/api/apiUtils/dataControl/notifications.js
// Read/write the outbound alarm-notifications log (email + SMS today; push +
// whatsapp later). Falls back gracefully if db/notifications.sql hasn't been run.
import { query } from "../s_env/db.js";

export async function insertNotification(r) {
  try {
    await query(
      `INSERT INTO notifications
         (alarm_id, incident_id, site, site_id, device_id, priority, channel,
          recipient, name, role, subject, status, error)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        r.alarmId ?? null, r.incidentId ?? null, r.site ?? null, r.siteId ?? null,
        r.deviceId ?? null, r.priority ?? null, r.channel, r.recipient,
        r.name ?? null, r.role ?? null, r.subject ?? null,
        r.status || "sent", r.error ?? null,
      ]
    );
  } catch (e) {
    if (/relation .*notifications.* does not exist/i.test(e.message || "")) {
      console.error("[notifications] table missing — run db/notifications.sql to record deliveries.");
    } else {
      console.error("[notifications] insert error:", e?.message || e);
    }
  }
}

// Recent notifications for the Notifications page, with optional filters.
export async function listNotifications({ status, channel, q, limit = 300 } = {}) {
  const where = [], params = [];
  if (status)  { params.push(status);  where.push(`status = $${params.length}`); }
  if (channel) { params.push(channel); where.push(`channel = $${params.length}`); }
  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    const i = params.length;
    where.push(`(lower(coalesce(recipient,'')) LIKE $${i} OR lower(coalesce(name,'')) LIKE $${i}
                OR lower(coalesce(site,'')) LIKE $${i} OR lower(coalesce(device_id,'')) LIKE $${i}
                OR lower(coalesce(alarm_id,'')) LIKE $${i})`);
  }
  params.push(Math.min(1000, Number(limit) || 300));
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  try {
    const { rows } = await query(
      `SELECT * FROM notifications ${clause} ORDER BY created_at DESC LIMIT $${params.length}`, params);
    return rows;
  } catch (e) {
    if (/relation .*notifications.* does not exist/i.test(e.message || "")) return [];
    console.error("[notifications] list error:", e?.message || e);
    return [];
  }
}

// Headline counts for the page (today + failures).
export async function notificationStats() {
  try {
    const { rows } = await query(
      `SELECT
         count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today,
         count(*) FILTER (WHERE status = 'sent'  AND created_at >= date_trunc('day', now()))::int AS sent_today,
         count(*) FILTER (WHERE status = 'failed' AND created_at >= date_trunc('day', now()))::int AS failed_today,
         count(*) FILTER (WHERE status = 'no_contact' AND created_at >= date_trunc('day', now()))::int AS nocontact_today,
         count(*) FILTER (WHERE channel = 'email' AND status = 'sent' AND created_at >= date_trunc('day', now()))::int AS email_today,
         count(*) FILTER (WHERE channel = 'sms'   AND status = 'sent' AND created_at >= date_trunc('day', now()))::int AS sms_today
       FROM notifications`);
    return rows[0] || {};
  } catch { return {}; }
}

// Per-channel delivery breakdown. `sent` = total attempts, `delivered` = accepted
// by the provider (status 'sent'), `failed` = rejected. We don't yet have async
// delivery receipts, so `pending` is always 0 (the column is ready for later).
export async function channelBreakdown() {
  try {
    const { rows } = await query(
      `SELECT channel,
              count(*)::int AS sent,
              count(*) FILTER (WHERE status = 'sent')::int   AS delivered,
              count(*) FILTER (WHERE status = 'failed')::int AS failed,
              count(*) FILTER (WHERE created_at >= date_trunc('day', now()))::int AS today
         FROM notifications
        GROUP BY channel`);
    const map = {};
    for (const r of rows) map[r.channel] = { sent: r.sent, delivered: r.delivered, failed: r.failed, pending: 0, today: r.today };
    return map;
  } catch { return {}; }
}
