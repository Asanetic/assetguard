// app/api/auth/register/route.js
//
// Deliberately NOT behind processAuthToken (see app/api/smartapi/route.js
// for the authenticated action-map pattern) — there is no session yet
// at signup time. Everything else reuses the same building blocks the
// rest of the app already relies on:
//   - mosyQddata / mosySqlInsert / magicRandomStr  -> dataUtils.js
//   - mosySendEmail                                -> send-gmail.js
//   - mosySendSMS                                  -> send-sms.js
//
// TABLE: system_users
//   primkey, record_id, name, email, tel, login_password, ref_id,
//   regdate, user_no, user_pic, user_gender, last_seen, about,
//   hive_site_id, hive_site_name, auth_token, token_status,
//   token_expiring_in, project_id, project_name, user_role,
//   account_status, company_id, company_name
//
// TABLE: companies
//   primkey, company_id, company_name, company_code, phone_number,
//   email, address, status, reg_date, hive_site_id, hive_site_name
//
// `company` on the incoming payload is now the companies.company_id
// picked from RegisterForm's dropdown (not a free-typed name) — this
// route looks that row up and copies its hive_site_id / hive_site_name
// / company_name onto the new system_users row, so a person's site
// membership is driven by the companies table rather than typed text.
//
// APPROVAL-STATE NOTE: approval is tracked via account_status
// ("pending" -> "approved"/"rejected"), set at signup below.

import { mosyQddata, mosySqlInsert, magicRandomStr } from "../../apiUtils/dataControl/dataUtils";
import { mosySendEmail } from "../../apiUtils/dataControl/send-gmail";
import { mosySendSMS } from "../../apiUtils/dataControl/send-sms";
import crypto from "crypto";

const REQUIRED_FIELDS = ["firstName", "lastName", "email", "phone", "company", "password"];

// Single login_password column -> pack salt + hash into one string.
function hashPassword(plain) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(plain, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

// Reuse at login time: crypto.scryptSync(candidate, salt, 64).toString('hex') === hash
export function verifyPassword(candidate, stored) {
  const [salt, hash] = String(stored || "").split(":");
  if (!salt || !hash) return false;
  const candidateHash = crypto.scryptSync(candidate, salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(candidateHash, "hex"), Buffer.from(hash, "hex"));
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request) {
  try {
    const body = await request.json();

    // ---- Validate ----
    const missing = REQUIRED_FIELDS.filter((f) => !body?.[f]);
    if (missing.length) {
      return Response.json(
        { status: "error", message: `Missing required field(s): ${missing.join(", ")}` },
        { status: 400 }
      );
    }
    if (!isValidEmail(body.email)) {
      return Response.json({ status: "error", message: "Enter a valid email address" }, { status: 400 });
    }
    if (body.password.length < 8) {
      return Response.json({ status: "error", message: "Password must be at least 8 characters" }, { status: 400 });
    }

    const email = body.email.trim().toLowerCase();

    // ---- Duplicate check (reuses mosyQddata, no new SQL written here) ----
    const existing = await mosyQddata("system_users", "email", email);
    if (existing) {
      return Response.json(
        { status: "error", message: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // ---- Resolve the company (body.company is companies.company_id,
    // picked from RegisterForm's dropdown) and pull the site info to
    // map onto the new system_users row. ----
    const company = await mosyQddata("companies", "company_id", body.company);
    if (!company) {
      return Response.json(
        { status: "error", message: "Selected company is invalid — please choose again" },
        { status: 400 }
      );
    }

    // ---- Insert (reuses mosySqlInsert; literal values, no formBody needed) ----
    // Note: mosySqlInsert always returns { record_id: result.insertId } —
    // that's actually the auto-increment `primkey`, not the `record_id`
    // string we generate below. We track our own recordId separately so
    // the response isn't mislabeled.
    const recordId = magicRandomStr(12);
    const insertResult = await mosySqlInsert(
      "system_users",
      {
        record_id: recordId,
        name: `${body.firstName.trim()} ${body.lastName.trim()}`.trim(),
        email,
        tel: body.phone.trim(),
        login_password: hashPassword(body.password),
        regdate: new Date(),
        company_id: company.company_id,
        company_name: company.company_name,
        hive_site_id: company.hive_site_id,
        hive_site_name: company.hive_site_name,
        account_status: "pending", // flips to approved/rejected on admin review
      },
      {}
    );

    // ---- Notify (best-effort; failures here shouldn't fail the signup) ----
    try {
      await mosySendEmail(
        email,
        "Welcome to AssetGuard — registration received",
        `Hi ${body.firstName}, thanks for registering with AssetGuard. An administrator at ${company.company_name} needs to verify your account before you can log in — this usually takes less than 24 hours. We'll email and text you the moment you're approved.`
      );
    } catch (notifyErr) {
      console.error("[register] email notify failed:", notifyErr);
    }

    try {
      await mosySendSMS(
        body.phone,
        `AssetGuard: Thanks for registering, ${body.firstName}. Your account is pending admin verification.`
      );
    } catch (notifyErr) {
      console.error("[register] sms notify failed:", notifyErr);
    }

    return Response.json({
      status: "success",
      message: "Registration received — pending admin approval",
      data: { record_id: recordId, primkey: insertResult.record_id },
    });

  } catch (err) {
    console.error("REGISTER ERROR:", err);
    return Response.json({ status: "error", message: err.message || "Server error" }, { status: 500 });
  }
}