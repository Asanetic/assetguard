// app/api/mainapp/messaging-config/test/route.js
// POST /api/mainapp/messaging-config/test   (admin)
//   body: { channel: "email"|"sms", to, config? }
// Sends a test message using the saved config, with any non-empty fields from
// `config` layered on top — so an admin can test edits BEFORE saving. Secrets
// (password / API key) fall back to the saved value when left blank.
import { NextResponse } from "next/server";
import { getEmailConfig, getSmsConfig } from "../../../apiUtils/dataControl/appConfig.js";
import { sendEmailWith } from "../../../apiUtils/notify/send-email.js";
import { sendSmsWith } from "../../../apiUtils/notify/send-sms.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";

function prune(o = {}) {
  const r = {};
  for (const k in o) if (o[k] !== undefined && o[k] !== "") r[k] = o[k];
  return r;
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { channel, to, config } = body || {};
  if (!to || !String(to).trim())
    return NextResponse.json({ error: "Enter a recipient to send the test to" }, { status: 400 });

  try {
    if (channel === "email") {
      const cfg = { ...(await getEmailConfig()), ...prune(config) };
      const result = await sendEmailWith(
        cfg, String(to).trim(),
        "AssetGuard test email",
        "This is a test email from AssetGuard. Your SMTP settings are working.",
        "<p>This is a <b>test email</b> from AssetGuard. Your SMTP settings are working.</p>"
      );
      return NextResponse.json(result);
    }
    if (channel === "sms") {
      const cfg = { ...(await getSmsConfig()), ...prune(config) };
      const result = await sendSmsWith(cfg, String(to).trim(),
        "AssetGuard test SMS — your SMS settings are working.");
      return NextResponse.json(result);
    }
    return NextResponse.json({ error: "Unknown channel" }, { status: 400 });
  } catch (err) {
    console.error("[messaging-config test] error", err);
    return NextResponse.json({ status: "error", message: "Test failed to run" }, { status: 500 });
  }
}
