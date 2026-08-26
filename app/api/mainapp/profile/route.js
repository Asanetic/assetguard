// app/api/mainapp/profile/route.js
// GET /api/mainapp/profile  -> the signed-in user's own details (safe columns) + company purposes
// PUT /api/mainapp/profile  -> update your OWN name, and — with your password
//                              AND a one-time code sent to the NEW value — your
//                              email and/or phone.
//
// The GET is unchanged. The PUT is new: the mobile app has an editable profile
// screen. The web page remains read-only and is unaffected.
//
// WHY IT IS THIS STRICT
//
// Email and phone are LOGIN IDENTITIES — `findUserByIdentity` matches on both —
// so changing either is the first half of an account takeover. Two independent
// things are therefore required, and neither is the client's to decide:
//
//   1. THE CURRENT PASSWORD. A stolen session token is not enough. Without this
//      a lifted token could point the account at an attacker's address and then
//      drive the ordinary password-reset flow to it.
//
//   2. A CODE, PRESENTED HERE. Not `hasVerified()`. That helper answers "did
//      SOMEBODY prove control of this target recently", which is not the same
//      question: an abandoned registration leaves a consumed code for an address
//      that has no user row, and for thirty minutes any signed-in user could
//      have claimed it. This route consumes the code itself, through the same
//      `verifyCode` the registration flow uses, so the code must be handed to
//      THIS authenticated request and cannot be replayed afterwards.
//
// The client sends the code it collected; it does NOT call /auth/verify/confirm
// first, because a code consumed there would already be spent by the time it
// got here.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import {
  findUserById,
  updateSelfIdentity,
  identityTakenByOther,
} from "../../apiUtils/dataControl/users.js";
import { getUserOrg, companyType } from "../../apiUtils/dataControl/companies.js";
import { verifyCode } from "../../apiUtils/dataControl/verification.js";
import { markVerified } from "../../apiUtils/dataControl/users.js";
import { getPasswordHash } from "../../apiUtils/dataControl/users.js";
import { verifyPassword } from "../../apiUtils/authUtils/password.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const user = await findUserById(me.sub);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    let org = null;
    try { org = await getUserOrg(me.sub); } catch {}
    const purposes = org?.purposes || [];
    return NextResponse.json({
      user,
      org: org ? { company: org.company, purposes, type: (typeof companyType === "function" ? companyType(purposes) : null) } : null,
    });
  } catch (err) {
    console.error("[profile GET] error", err);
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const norm = (v) => String(v ?? "").trim();
const normPhone = (v) => norm(v).replace(/\s+/g, "");

export async function PUT(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch {}

  try {
    const user = await findUserById(me.sub);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // A token outlives a suspension. Someone an administrator has just switched
    // off must not be able to repoint the account on the way out.
    if (user.status && user.status !== "Active") {
      return NextResponse.json({ error: "This account is not active" }, { status: 403 });
    }

    // Only fields the client actually sent are considered, and only those that
    // differ from what is stored. Sending your own email back unchanged must
    // not demand a password or a code.
    const name = body.name === undefined ? null : norm(body.name);
    const email = body.email === undefined ? null : norm(body.email).toLowerCase();
    const phone = body.phone === undefined ? null : normPhone(body.phone);

    if (name !== null && !name) {
      return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
    }

    const emailChanged = email !== null && email !== norm(user.email).toLowerCase();
    const phoneChanged = phone !== null && phone !== normPhone(user.phone);

    if (emailChanged && !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (phoneChanged && phone.length < 9) {
      return NextResponse.json({ error: "Enter a valid phone number" }, { status: 400 });
    }

    // Proving a value you ALREADY have is a separate, lighter thing from
    // changing it. An administrator can create an account with an unverified
    // email, and without this there would be no way for its owner to ever clear
    // that flag — a "Not verified" badge with no way to act on it.
    //
    // Sending a code for an unchanged value is the request to prove it. No
    // password: nothing is being repointed, so there is no takeover to guard
    // against, and demanding one would be friction for its own sake.
    const provingEmail = !emailChanged && body.emailCode !== undefined && !user.email_verified;
    const provingPhone = !phoneChanged && body.phoneCode !== undefined && !user.phone_verified;

    if (provingEmail) {
      const result = await verifyCode("email", norm(user.email).toLowerCase(),
                                      String(body.emailCode || "").trim());
      if (!result.ok) {
        return NextResponse.json({ error: result.error, needs: "email" }, { status: 400 });
      }
      await markVerified(me.sub, "email");
    }
    if (provingPhone) {
      const result = await verifyCode("phone", normPhone(user.phone),
                                      String(body.phoneCode || "").trim());
      if (!result.ok) {
        return NextResponse.json({ error: result.error, needs: "phone" }, { status: 400 });
      }
      await markVerified(me.sub, "phone");
    }

    // Name alone (or a verification alone): no password.
    if (!emailChanged && !phoneChanged) {
      const updatedName = await updateSelfIdentity(me.sub, { name: name || null });
      if (updatedName && name && name !== norm(user.name)) {
        logAudit(request, {
          action: "Profile updated", category: "Users",
          detail: `${user.name || user.email} changed their name`,
        });
      }
      const changedHere = [
        name && name !== norm(user.name) ? "name" : null,
        provingEmail ? "email_verified" : null,
        provingPhone ? "phone_verified" : null,
      ].filter(Boolean);
      return NextResponse.json({
        ok: true,
        user: await findUserById(me.sub),
        changed: changedHere,
      });
    }

    /* ---- an identity field is changing: password, then codes ---------- */

    const password = String(body.currentPassword || "");
    if (!password) {
      return NextResponse.json(
        { error: "Enter your current password to change your email or phone",
          needs: "password" },
        { status: 400 }
      );
    }
    const hash = await getPasswordHash(me.sub);
    if (!hash || !(await verifyPassword(password, hash))) {
      return NextResponse.json({ error: "That password is not right" }, { status: 400 });
    }

    // The code is consumed HERE. Checked before the uniqueness lookup below so
    // this route cannot be used to probe which addresses are registered without
    // holding a code for them.
    if (emailChanged) {
      const code = String(body.emailCode || "").trim();
      if (!code) {
        return NextResponse.json(
          { error: "Enter the code sent to your new email address", needs: "email" },
          { status: 400 }
        );
      }
      const result = await verifyCode("email", email, code);
      if (!result.ok) {
        return NextResponse.json({ error: result.error, needs: "email" }, { status: 400 });
      }
    }
    if (phoneChanged) {
      const code = String(body.phoneCode || "").trim();
      if (!code) {
        return NextResponse.json(
          { error: "Enter the code sent to your new phone number", needs: "phone" },
          { status: 400 }
        );
      }
      const result = await verifyCode("phone", phone, code);
      if (!result.ok) {
        return NextResponse.json({ error: result.error, needs: "phone" }, { status: 400 });
      }
    }

    // Taken by someone else = someone could already sign in with it.
    const taken = await identityTakenByOther(me.sub, {
      email: emailChanged ? email : null,
      phone: phoneChanged ? phone : null,
    });
    if (taken) {
      return NextResponse.json(
        { error: "That email or phone number is already in use" },
        { status: 409 }
      );
    }

    await updateSelfIdentity(me.sub, {
      name: name || null,
      email: emailChanged ? email : null,
      phone: phoneChanged ? phone : null,
    });

    const changed = [
      name && name !== norm(user.name) ? "name" : null,
      emailChanged ? "email" : null,
      phoneChanged ? "phone" : null,
    ].filter(Boolean);

    logAudit(request, {
      action: "Sign-in identity changed", category: "Users",
      detail: `${user.name || user.email} changed ${changed.join(", ")}`
        + (emailChanged ? ` (email was ${user.email})` : "")
        + (phoneChanged ? ` (phone was ${user.phone})` : ""),
    });

    // Tell the OLD address that it happened. Best-effort and never blocks the
    // response: the change is already committed, and a mail server being down
    // is not a reason to report failure. But a silent identity change is how a
    // takeover goes unnoticed, so this is the one notification worth sending
    // even when nobody asked for it.
    notifyOldIdentity(user, { emailChanged, phoneChanged, email, phone });

    // The FULL row, not the UPDATE's RETURNING. The mobile client caches this
    // as its session user, and a six-column row would blank `role`, `regions`
    // and `status` — which is how saving your name made the whole Admin section
    // of the drawer disappear until the next sign-in.
    return NextResponse.json({ ok: true, user: await findUserById(me.sub), changed });
  } catch (err) {
    console.error("[profile PUT] error", err);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}

/** Fire-and-forget warning to the identity being replaced. */
function notifyOldIdentity(user, { emailChanged, phoneChanged, email, phone }) {
  const when = new Date().toISOString();
  if (emailChanged && user.email) {
    const text = `Your AssetGuard sign-in email was changed to ${email} on ${when}. `
      + `If this was not you, contact your administrator immediately.`;
    import("../../apiUtils/notify/send-email.js")
      .then((m) => m.sendEmail(user.email, "Your AssetGuard sign-in email was changed", text))
      .catch(() => {});
  }
  if (phoneChanged && user.phone) {
    const text = `Your AssetGuard sign-in number was changed to ${phone}. `
      + `If this was not you, contact your administrator immediately.`;
    import("../../apiUtils/notify/send-sms.js")
      .then((m) => m.mosySendSMS(user.phone, text))
      .catch(() => {});
  }
}
