// app/api/mainapp/notifications/route.js
// GET /api/mainapp/notifications?status=&channel=&q=  (signed in)
// The outbound alarm-notification log: who was told about each critical alarm, on
// which channel, and whether it was delivered.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import { listNotifications, notificationStats, channelBreakdown } from "../../apiUtils/dataControl/notifications.js";
import { getEmailConfig, getSmsConfig } from "../../apiUtils/dataControl/appConfig.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const range = searchParams.get("range") || "today";
  try {
    const [rows, stats, channels, email, sms] = await Promise.all([
      listNotifications({
        status: searchParams.get("status") || undefined,
        channel: searchParams.get("channel") || undefined,
        q: searchParams.get("q") || undefined,
        range,
      }),
      notificationStats(range),
      channelBreakdown(range),
      getEmailConfig().catch(() => ({})),
      getSmsConfig().catch(() => ({})),
    ]);
    // Configured providers (no secrets) — the real senders behind each channel.
    const providers = [
      { name: email.host || "SMTP", channel: "Email", from: email.fromEmail || email.user || null,
        enabled: email.enabled !== false, configured: !!(email.user && email.pass), sentToday: stats.email_today || 0 },
      { name: sms.provider || "SMS gateway", channel: "SMS", from: sms.senderId || null,
        enabled: sms.enabled !== false, configured: !!sms.apiKey, sentToday: stats.sms_today || 0 },
    ];
    return NextResponse.json({ notifications: rows, stats, channels, providers });
  } catch (err) {
    console.error("[notifications GET] error", err);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
