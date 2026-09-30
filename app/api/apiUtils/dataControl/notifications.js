// app/api/apiUtils/dataControl/notifications.js
// Read/write the outbound alarm-notifications log (email + SMS + push).
// Falls back gracefully if db/notifications.sql hasn't been run.
//
// Delivery states in `status` (four-state model):
//   'failed'      the send itself failed — provider rejected it, never left us
//   'sent'        provider ACCEPTED it (handed to the network); outcome unknown
//   'undelivered' it WAS sent, but the network DLR says it did not arrive
//   'delivered'   sent AND the network CONFIRMED it arrived
//   'no_contact' / 'suppressed'  routing outcomes (no send attempted)
// Applies to Celcom SMS (DLR-driven), push and email (accept = delivered,
// since they have no async receipt). Asanetic SMS has no DLR → stays 'sent'.
// `message_id` + `provider` are stored so a Celcom SMS can be reconciled by DLR.
import { query } from "../s_env/db.js";

let _ensured = false;
async function ensureTable() {
  if (_ensured) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id BIGSERIAL PRIMARY KEY,
        alarm_id TEXT, incident_id TEXT, site TEXT, site_id BIGINT, device_id TEXT,
        priority TEXT, channel TEXT NOT NULL, recipient TEXT NOT NULL, name TEXT,
        role TEXT, subject TEXT, status TEXT NOT NULL DEFAULT 'sent', error TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_notifications_created ON notifications (created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_notifications_alarm   ON notifications (alarm_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_status  ON notifications (status);
    `);
    // Additive columns for delivery-report tracking (idempotent).
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS message_id     TEXT`);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS provider       TEXT`);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS delivered_at   TIMESTAMPTZ`);
    await query(`ALTER TABLE notifications ADD COLUMN IF NOT EXISTS dlr_checked_at TIMESTAMPTZ`);
    _ensured = true;
  } catch (e) {
    console.error("[notifications] ensureTable failed:", e?.message || e);
  }
}

export async function insertNotification(r) {
  await ensureTable();
  try {
    await query(
      `INSERT INTO notifications
         (alarm_id, incident_id, site, site_id, device_id, priority, channel,
          recipient, name, role, subject, status, error, message_id, provider)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)`,
      [
        r.alarmId ?? null, r.incidentId ?? null, r.site ?? null, r.siteId ?? null,
        r.deviceId ?? null, r.priority ?? null, r.channel, r.recipient,
        r.name ?? null, r.role ?? null, r.subject ?? null,
        r.status || "sent", r.error ?? null,
        r.messageId != null ? String(r.messageId) : null,
        r.provider ?? null,
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

const RANGE_START = {
  today: "date_trunc('day', now())",
  week:  "date_trunc('week', now())",
  month: "date_trunc('month', now())",
  year:  "date_trunc('year', now())",
};
function rangeStart(range) { return RANGE_START[range] || null; }

export async function listNotifications({ status, channel, q, range, limit = 300 } = {}) {
  const where = [], params = [];
  if (status)  { params.push(status);  where.push(`status = $${params.length}`); }
  if (channel) { params.push(channel); where.push(`channel = $${params.length}`); }
  const rs = rangeStart(range);
  if (rs) where.push(`created_at >= ${rs}`);
  if (q && q.trim()) {
    params.push(`%${q.trim().toLowerCase()}%`);
    const i = params.length;
    where.push(`(lower(coalesce(recipient,'')) LIKE $${i} OR lower(coalesce(name,'')) LIKE $${i}
                OR lower(coalesce(site,'')) LIKE $${i} OR lower(coalesce(device_id,'')) LIKE $${i}
                OR lower(coalesce(alarm_id,'')) LIKE $${i})`);
  }
  params.push(Math.min(1000, Number(limit) || 300));
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  await ensureTable();
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

// Accepted = it left us for the network. Covers 'sent' (outcome unknown),
// 'delivered' (confirmed) and 'undelivered' (sent but the DLR said it didn't
// arrive). Only 'failed' (never sent) and routing outcomes fall outside this,
// so a DLR promotion never drops a message out of the "sent/accepted" totals.
const ACCEPTED = "status IN ('sent','delivered','undelivered')";

export async function notificationStats(range = "today") {
  const rs = rangeStart(range) || RANGE_START.today;
  await ensureTable();
  try {
    const { rows } = await query(
      `SELECT
         count(*) FILTER (WHERE created_at >= ${rs})::int AS today,
         count(*) FILTER (WHERE ${ACCEPTED} AND created_at >= ${rs})::int AS sent_today,
         count(*) FILTER (WHERE status = 'delivered' AND created_at >= ${rs})::int AS delivered_today,
         count(*) FILTER (WHERE status = 'undelivered' AND created_at >= ${rs})::int AS undelivered_today,
         count(*) FILTER (WHERE status = 'failed' AND created_at >= ${rs})::int AS failed_today,
         count(*) FILTER (WHERE status = 'no_contact' AND created_at >= ${rs})::int AS nocontact_today,
         count(*) FILTER (WHERE channel = 'email' AND ${ACCEPTED} AND created_at >= ${rs})::int AS email_today,
         count(*) FILTER (WHERE channel = 'sms'   AND ${ACCEPTED} AND created_at >= ${rs})::int AS sms_today,
         count(*) FILTER (WHERE channel = 'push'  AND ${ACCEPTED} AND created_at >= ${rs})::int AS push_today
       FROM notifications`);
    return rows[0] || {};
  } catch { return {}; }
}

// Per-channel breakdown. `sent` = total attempts (rows); `delivered` = accepted
// (left us: sent/delivered/undelivered) so the "ok" number never drops when a
// DLR lands; `confirmed` = DLR-confirmed delivered only; `undelivered` = sent
// but the DLR said it didn't arrive; `failed` = never sent.
export async function channelBreakdown(range) {
  const rs = rangeStart(range);
  const scope = rs ? `WHERE created_at >= ${rs}` : "";
  await ensureTable();
  try {
    const { rows } = await query(
      `SELECT channel,
              count(*)::int AS sent,
              count(*) FILTER (WHERE ${ACCEPTED})::int             AS delivered,
              count(*) FILTER (WHERE status = 'delivered')::int    AS confirmed,
              count(*) FILTER (WHERE status = 'undelivered')::int  AS undelivered,
              count(*) FILTER (WHERE status = 'failed')::int       AS failed,
              count(*)::int AS today
         FROM notifications ${scope}
        GROUP BY channel`);
    const map = {};
    for (const r of rows) map[r.channel] = { sent: r.sent, delivered: r.delivered, confirmed: r.confirmed, undelivered: r.undelivered, failed: r.failed, pending: 0, today: r.today };
    return map;
  } catch { return {}; }
}

// ---- Celcom delivery-report reconcile -------------------------------------
// Confirms delivery of every Celcom SMS: for recent rows still at 'sent', ask
// Celcom's getdlr for each message_id and promote to 'delivered' (arrived) or
// 'undelivered' (network says it did not arrive — NOT 'failed', which is
// reserved for sends that never left us).
// Throttled per row via dlr_checked_at so it can safely run on each page load.
let _dlrRunningUntil = 0;
export async function reconcileCelcomDlr({ limit = 60, cooldownSec = 45, maxAgeHours = 72 } = {}) {
  // Coarse process-level guard so overlapping page loads don't stampede Celcom.
  if (Date.now() < _dlrRunningUntil) return { checked: 0, delivered: 0, undelivered: 0, skipped: true };
  _dlrRunningUntil = Date.now() + 8000;
  let checked = 0, delivered = 0, undelivered = 0;
  try {
    await ensureTable();
    const { getSmsConfig } = await import("./appConfig.js");
    const cfg = await getSmsConfig().catch(() => null);
    if (!cfg || !String(cfg.provider || "").toLowerCase().includes("celcom")) return { checked: 0, delivered: 0, undelivered: 0, noProvider: true };
    if (!cfg.apiKey || !cfg.partnerID) return { checked: 0, delivered: 0, undelivered: 0, notConfigured: true };

    const { rows } = await query(
      `SELECT id, message_id FROM notifications
        WHERE channel = 'sms' AND status = 'sent'
          AND message_id IS NOT NULL
          AND lower(coalesce(provider,'')) LIKE 'celcom%'
          AND created_at > now() - ($1 * interval '1 hour')
          AND (dlr_checked_at IS NULL OR dlr_checked_at < now() - ($2 * interval '1 second'))
        ORDER BY created_at DESC LIMIT $3`,
      [maxAgeHours, cooldownSec, Math.min(200, limit)]
    );
    if (!rows.length) return { checked: 0, delivered: 0, undelivered: 0 };

    const { celcomDlr } = await import("../notify/celcom.js");
    for (const row of rows) {
      checked++;
      let r;
      try { r = await celcomDlr({ apiKey: cfg.apiKey, partnerID: cfg.partnerID }, row.message_id); }
      catch { r = { status: "unknown" }; }
      if (r.status === "delivered") {
        delivered++;
        await query(`UPDATE notifications SET status='delivered', delivered_at=now(), dlr_checked_at=now() WHERE id=$1`, [row.id]).catch(() => {});
      } else if (r.status === "failed") {
        // DLR says it did NOT arrive. It WAS sent, so this is 'undelivered',
        // not 'failed' (which is reserved for sends that never left us).
        undelivered++;
        await query(`UPDATE notifications SET status='undelivered', error=COALESCE(error,$2), dlr_checked_at=now() WHERE id=$1`, [row.id, r.detail || "DLR: not delivered"]).catch(() => {});
      } else {
        // still pending / unknown — just stamp the check time so we back off.
        await query(`UPDATE notifications SET dlr_checked_at=now() WHERE id=$1`, [row.id]).catch(() => {});
      }
    }
    if (delivered || undelivered) console.log(`[dlr] Celcom reconcile: ${checked} checked → ${delivered} delivered, ${undelivered} undelivered`);
    return { checked, delivered, undelivered };
  } catch (e) {
    console.error("[dlr] reconcile error:", e?.message || e);
    return { checked, delivered, undelivered, error: e?.message };
  } finally {
    _dlrRunningUntil = 0;
  }
}
