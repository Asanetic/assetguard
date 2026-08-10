// app/api/mainapp/messaging-config/route.js
// GET /api/mainapp/messaging-config   (admin) -> { email, sms }  (secrets removed)
// PUT /api/mainapp/messaging-config   (admin) -> save both (audited)
import { NextResponse } from "next/server";
import {
  getMessagingConfigPublic, saveEmailConfig, saveSmsConfig,
} from "../../apiUtils/dataControl/appConfig.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  try {
    return NextResponse.json({ config: await getMessagingConfigPublic() });
  } catch (err) {
    console.error("[messaging-config GET] error", err);
    return NextResponse.json({ error: "Failed to load messaging config" }, { status: 500 });
  }
}

export async function PUT(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  try {
    const who = gate.user.name || gate.user.email || null;
    if (body.email) await saveEmailConfig(body.email, who);
    if (body.sms) await saveSmsConfig(body.sms, who);
    logAudit(request, {
      action: "Messaging settings updated", category: "System",
      detail: "Updated email (SMTP) and/or SMS API configuration",
    });
    return NextResponse.json({ config: await getMessagingConfigPublic() });
  } catch (err) {
    console.error("[messaging-config PUT] error", err);
    return NextResponse.json({ error: "Failed to save messaging config" }, { status: 500 });
  }
}
