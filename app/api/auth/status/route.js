// app/api/auth/status/route.js
//
// Public (no processAuthToken) — someone checking registration status
// doesn't have a session yet. Reuses mosyFindAccountByIdentifier
// (dataUtils.js patch) rather than writing a new lookup query.
//
// STATUS DERIVATION NOTE: system_users has no dedicated status column.
// Same convention as the register route:
//   - user_role === "pending"  -> still awaiting admin approval
//   - user_role !== "pending"  -> approved (role was assigned)
// There's currently no way to represent "rejected" with this schema —
// if you need that, it needs a real column (or a documented sentinel
// value for user_role, e.g. "rejected"), otherwise a declined
// registration just looks identical to "still pending" forever.

import { mosyQddata } from "../../apiUtils/dataControl/dataUtils";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
 
/**
 * mosyFindAccountByIdentifier
 * Looks a user up by email OR phone — whichever the identifier
 * looks like. Returns the raw row (or null), same shape mosyQddata
 * returns. Callers are responsible for stripping sensitive columns
 * (login_password, auth_token, etc.) before sending anything back
 * to the client — this function does not filter them out, since
 * some internal callers (e.g. login) legitimately need login_password.
 *
 * @param {string} identifier  email address or phone number
 * @param {string} table       defaults to "system_users"
 * @returns {Promise<Object|null>}
 */
export async function mosyFindAccountByIdentifier(identifier, table = "system_users") {
  if (!identifier) return null;
  const trimmed = identifier.trim();
 
  const column = EMAIL_RE.test(trimmed) ? "email" : "tel";
  const value = column === "email" ? trimmed.toLowerCase() : trimmed;
 
  return mosyQddata(table, column, value);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const identifier = searchParams.get("identifier");

    if (!identifier) {
      return Response.json(
        { status: "error", message: "Provide an email or phone number" },
        { status: 400 }
      );
    }

    const account = await mosyFindAccountByIdentifier(identifier);

    if (!account) {
      return Response.json(
        { status: "error", message: "No account found for that email or phone number" },
        { status: 404 }
      );
    }

    const accountStatus = account.account_status;

    // Only return what the pending-approval UI actually needs —
    // never login_password, auth_token, token_status, etc.
    return Response.json({
      status: "success",
      data: {
        accountStatus,               // "pending" | "approved"
        name: account.name,
        company: account.hive_site_name,
        email: account.email,
        tel: account.tel,
        role: accountStatus,
      },
    });

  } catch (err) {
    console.error("STATUS CHECK ERROR:", err);
    return Response.json({ status: "error", message: err.message || "Server error" }, { status: 500 });
  }
}