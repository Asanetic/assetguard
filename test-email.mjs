// test-email.mjs — isolate SMTP auth quickly.
// Run:  node --env-file=.env.local test-email.mjs
// (older Node: set $env:EMAIL_USER / $env:EMAIL_PASS first, then: node test-email.mjs)

import nodemailer from "nodemailer";

const user = process.env.EMAIL_USER;
const pass = (process.env.EMAIL_PASS || "").replace(/\s+/g, "");
const port = Number(process.env.EMAIL_PORT || 465);

console.log("USER:", JSON.stringify(user));
console.log("PASS length (after stripping spaces):", pass.length, "(should be 16)");
console.log("HOST:", process.env.EMAIL_HOST || "smtp.gmail.com", "PORT:", port);

const t = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || "smtp.gmail.com",
  port,
  secure: port === 465,
  auth: { user, pass },
});

try {
  await t.verify();
  console.log("\n✅ SMTP login OK — credentials are accepted.");
  const info = await t.sendMail({
    from: process.env.EMAIL_FROM || `AssetGuard <${user}>`,
    to: user, // send a test to yourself
    subject: "AssetGuard SMTP test",
    text: "If you got this, email sending works.",
  });
  console.log("✅ Sent test email:", info.messageId);
} catch (e) {
  console.error("\n❌ FAILED:", e.message);
}
