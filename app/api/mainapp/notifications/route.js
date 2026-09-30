// app/api/mainapp/notifications/route.js
// GET /api/mainapp/notifications?status=&channel=&q=&range=  (signed in)
// The outbound alarm-notification log: who was told about each critical alarm, on
// which channel, whether it was accepted, and — for Celcom SMS — whether the
// network CONFIRMED delivery (DLR). Also returns the SMS account balance.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import {
  listNotifications, notificationStats, channelBreakdown, reconcileCelcomDlr,
} from "../../apiUtils/dataControl/notifications.js";
import { getEmailConfig, getSmsConfig } from "../../apiUtils/dataControl/appConfig.js";
import { celcomBalance } from "../../apiUtils/notify/celcom.js";

// Cache the SMS balance so a 20s auto-refresh doesn't hammer Celcom's API.
let _balCache = { at: 0, value: null };
async function smsBalance(sms) {
  if (!String(sms.provider || "").toLowerCase().includes("celcom")) return null;
  if (!sms.apiKey || !sms.partnerID) return null;
  if (Date.now() - _balCache.at < 60_000) return _balCache.value;
  const r = await celcomBalance({ apiKey: sms.apiKey, partnerID: sms.partnerID }).catch(() => null);
  _balCache = { at: Date.now(), value: r && r.balance != null ? { balance: r.balance, currency: r.currency || null } : null };
  return _balCache.value;
}

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "today";

  // Confirm delivery of recent Celcom SMS. Fire-and-forget + throttled inside, so
  // the page returns immediately and picks up the DLR updates on its next refresh.
  reconcileCelcomDlr({ limit: 40 }).catch(() => {});

  try {
    const sms = await getSmsConfig().catch(() => ({}));
    const [rows, stats, channels, email, balance] = await Promise.all([
      listNotifications({
        status: searchParams.get("status") || undefined,
        channel: searchParams.get("channel") || undefined,
        q: searchParams.get("q") || undefined,
        range,
      }),
      notificationStats(range),
      channelBreakdown(range),
      getEmailConfig().catch(() => ({})),
      smsBalance(sms).catch(() => null),
    ]);

    const smsBalanceStr = balance && balance.balance != null
      ? `${balance.currency ? balance.currency + " " : ""}${Number(balance.balance).toLocaleString()}`
      : null;

    // Configured providers (no secrets) — the real senders behind each channel.
    const providers = [
      { name: email.host || "SMTP", channel: "Email", from: email.fromEmail || email.user || null,
        enabled: email.enabled !== false, configured: !!(email.user && email.pass), sentToday: stats.email_today || 0 },
      { name: sms.provider || "SMS gateway", channel: "SMS", from: sms.senderId || null,
        enabled: sms.enabled !== false, configured: !!sms.apiKey, sentToday: stats.sms_today || 0,
        balance: smsBalanceStr },
      // Push is wired (Firebase FCM). Shows its real counts (0 until a push is sent).
      { name: "Firebase FCM", channel: "Push", from: null,
        enabled: true, configured: true, sentToday: stats.push_today || 0 },
    ];

    return NextResponse.json({ notifications: rows, stats, channels, providers, smsBalance: smsBalanceStr });
  } catch (err) {
    console.error("[notifications GET] error", err);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
