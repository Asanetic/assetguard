// app/api/apiUtils/authUtils/appAccess.js
// ---------------------------------------------------------------------------
// Which roles may sign in to which app surface.
//
// Gating happens at login: a person whose assigned role is not on the list for
// the surface they are signing in to is refused, with a clear message, rather
// than landing in an app built for a job that is not theirs.
//
// Each surface identifies itself with an `app` field in the login body. The two
// phone apps already send this field when they register a push token
// (`{ app: "technician" }` / `{ app: "response" }`); the main console — the web
// app AND the AssetGuard phone app — sends `{ app: "main" }`. A login with NO
// `app` at all is left UNGATED, a deliberate safety default so a caller that has
// not been taught to send the field can never be accidentally locked out.
//
// Admins (superadmin/admin) and the management tier (company + assistant
// managers) are on every list. Beyond that each surface admits only its own
// working roles:
//   • main       — the security management tier (sec_country / sec_regional and
//     their assistants) and NOC. The two FIELD roles are the only ones kept out:
//     a responder or installer works from their own app, not the console.
//   • response   — Field Response, plus the security managers/assistants.
//   • technician — Field Technician (the installer).
// NOC is on `main` only; field_resp only on `response`; field_tech only on
// `technician`.
// ---------------------------------------------------------------------------

const ADMIN = ["superadmin", "admin"];
const MANAGERS = ["company_mgr", "asst_mgr"];
const SECURITY_MGRS = ["sec_country", "sec_country_asst", "sec_regional", "sec_regional_asst"];

// Keyed by the `app` value the client sends. A key absent from this map (no
// `app` field) is treated as UNGATED.
export const APP_ROLES = {
  main: new Set([...ADMIN, ...MANAGERS, ...SECURITY_MGRS, "noc"]),
  response: new Set([...ADMIN, ...MANAGERS, ...SECURITY_MGRS, "field_resp"]),
  technician: new Set([...ADMIN, ...MANAGERS, "field_tech"]),
};

/** Human name for the message shown when access is refused. */
export const APP_LABEL = { main: "AssetGuard", response: "Response", technician: "Technician" };

/**
 * May a user with `role` sign in to `app`?
 *
 * Returns true for any app this map does not gate (the web console, or a missing
 * `app`), so adding the field to a client can never accidentally lock people out
 * of an app that was never meant to be gated.
 */
export function roleAllowedForApp(app, role) {
  const key = String(app || "").trim().toLowerCase();
  const allowed = APP_ROLES[key];
  if (!allowed) return true;                 // ungated (web/admin/unknown)
  return allowed.has(String(role || "").trim().toLowerCase());
}
