// app/api/mainapp/push/register/route.js
// POST   /api/mainapp/push/register   { token, platform?, app? }
//          -> { ok, registered, app, named }
// DELETE /api/mainapp/push/register   { token }                   -> { ok }
//
// The app calls POST on every launch and whenever Firebase rotates the token,
// and DELETE on logout. Registering repeatedly is the intended usage — tokens
// rotate on reinstall and restore, and a stale one silently stops delivering
// with no error anywhere, so the only reliable cure is to re-assert it often.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { savePushToken, removePushToken } from "../../../apiUtils/dataControl/push.js";

/**
 * Which app this install is, and therefore what it will be told.
 *
 * The rule the routing depends on:
 *   technician -> TEST alarms only, never a real one
 *   admin      -> real alarms
 *   response   -> real alarms, Critical only (the role rule does that part)
 *
 * A CLIENT THAT SAYS SO IS ALWAYS BELIEVED. The fallback below exists only for
 * installs that do not yet send the field.
 *
 * TRANSITIONAL — and it matters, because the previous default was a flat
 * "technician". The moment real alarms started skipping the technician app,
 * every admin handset still on the old build would have gone silent: it does
 * not send `app`, so its rows were labelled technician too. Inferring from the
 * signed-in user's ROLE keeps those phones working today, and the inference is
 * bypassed the instant the app is updated to name itself.
 *
 * Delete this once every app sends `app` — it is a guess, and a technician who
 * is also an administrator is a guess it gets wrong.
 */
const KNOWN_APPS = new Set(["technician", "admin", "response"]);

/**
 * Which app this install is, and therefore what it will be told.
 *
 *   technician -> TEST alarms only, never a real one
 *   admin      -> real alarms
 *   response   -> real alarms, Critical only (the role rule does that part)
 *
 * NO GUESSING. An earlier version inferred this from the signed-in user's role
 * and got it exactly wrong for the commonest case: a superadmin signing into
 * the technician app was labelled 'admin' and kept receiving real alarms.
 *
 * It does not need to guess. The technician and response apps both NAME
 * themselves, and have since they were built. The only client that sends
 * nothing is the admin app — so an unnamed install is an admin install, which
 * is a fact rather than an inference. That stays true until a fourth app
 * appears, and the day one does it names itself like the others.
 */
function appFor(claimed) {
  const said = String(claimed || "").trim().toLowerCase();
  return KNOWN_APPS.has(said) ? { app: said, named: true } : { app: "admin", named: false };
}

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Expected JSON" }, { status: 400 }); }

  const token = String(body.token || "").trim();
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  try {
    const { app, named } = appFor(body.app);

    // Informational, not a warning: an unnamed install is the admin app, which
    // is expected until it starts sending the field. Logged so that when a
    // fourth app appears and forgets to name itself, the reason it is being
    // treated as admin is on the record rather than a mystery.
    //
    //   pm2 logs assetguard-3010 | grep "did not name itself"
    if (!named) {
      console.log(
        `[push/register] install did not name itself — ${me.name || me.email} ` +
        `(role ${me.role || "?"}) treated as 'admin'.`
      );
    }

    await savePushToken({
      userId: me.sub,
      token,
      platform: body.platform || "android",
      app,
    });
    // `registered` is what BOTH Android apps actually read — they decode
    // `{ registered }` and log a warning when it is false, because a 200 with
    // no write is a real case (the table not existing). This route never sent
    // the field, so every launch decoded the default `false` and logged
    //
    //     the server did not register this device — is db/push_tokens.sql applied?
    //
    // ...which is wrong twice over: the write had succeeded, and the table it
    // names is not even the one this route writes. A log line that sends
    // somebody to the wrong table is worse than no log line.
    //
    // `app` and `named` are echoed so a handset can see how it was classified
    // without a DB query — which app it counts as decides what it is told.
    return NextResponse.json({ ok: true, registered: true, app, named });
  } catch (err) {
    console.error("[push/register] error", err);
    return NextResponse.json({ error: "Failed to register" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body = {};
  try { body = await request.json(); } catch { /* token may come as a query param */ }
  const token =
    String(body.token || new URL(request.url).searchParams.get("token") || "").trim();
  if (!token) return NextResponse.json({ error: "token is required" }, { status: 400 });

  try {
    await removePushToken(token);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[push/register DELETE] error", err);
    return NextResponse.json({ error: "Failed to unregister" }, { status: 500 });
  }
}
