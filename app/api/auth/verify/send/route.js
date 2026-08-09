// app/api/auth/verify/send/route.js
// POST /api/auth/verify/send   Body: { channel: 'email'|'phone', target }
// Generates a code, stores it, and sends it via email or SMS.
import { NextResponse } from "next/server";
import { createCode } from "../../../apiUtils/dataControl/verification.js";
import { sendEmail } from "../../../apiUtils/notify/send-email.js";
import { mosySendSMS } from "../../../apiUtils/notify/send-sms.js";

const TTL_MIN = Number(process.env.OTP_TTL_MIN || 10);

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { channel, target } = body || {};
  if (channel !== "email" && channel !== "phone")
    return NextResponse.json({ error: "Bad channel" }, { status: 400 });
  if (!target || !String(target).trim())
    return NextResponse.json(
      { error: channel === "email" ? "Enter your email first" : "Enter your phone first" },
      { status: 400 }
    );

  try {
    const code = await createCode(channel, target);
    const msg = `Your AssetGuard verification code is ${code}. It expires in ${TTL_MIN} minutes.`;

    let result;
    if (channel === "email") {
      result = await sendEmail(
        String(target).trim(),
        "Your AssetGuard verification code",
        msg,
        `<p style="font-family:system-ui,Arial,sans-serif;font-size:15px;color:#0F274A">
           Your AssetGuard verification code is
           <b style="font-size:20px;letter-spacing:2px">${code}</b>.<br>
           It expires in ${TTL_MIN} minutes.
         </p>`
      );
    } else {
      result = await mosySendSMS(String(target).trim(), msg);
    }

    if (result.status !== "success") {
      return NextResponse.json(
        { error: `Could not send the ${channel} code. Try again.` },
        { status: 502 }
      );
    }

    // Never return the code. In local dev only, expose it to speed up testing.
    const payload = { ok: true, sent: channel };
    if (process.env.OTP_DEBUG === "true") payload.devCode = code;
    return NextResponse.json(payload);
  } catch (err) {
    console.error("[verify/send] error", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
