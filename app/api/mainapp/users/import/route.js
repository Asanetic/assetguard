// app/api/mainapp/users/import/route.js
// POST /api/mainapp/users/import  (admin)
// Bulk-create users from a parsed spreadsheet. Body: { users: [{ name, email,
// phone, company, role, region }] }. Every new user is Active. Password rule:
// the person's NAME with all spaces removed (e.g. "Jane Wanjiku" -> "JaneWanjiku").
// company is matched to a registered company by name; role is matched to a
// registered role (by key or display name); region becomes the user's region scope.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { createActiveUser, findUserByIdentity } from "../../../apiUtils/dataControl/users.js";
import { findCompanyByName } from "../../../apiUtils/dataControl/companies.js";
import { listRoles } from "../../../apiUtils/dataControl/roles.js";
import { hashPassword } from "../../../apiUtils/authUtils/password.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

// Password = the name with spaces removed.
const pwFromName = (name) => String(name || "").replace(/\s+/g, "");

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const rows = Array.isArray(body.users) ? body.users : [];
  if (!rows.length) return NextResponse.json({ error: "No rows to import" }, { status: 400 });

  // Role text (key OR display name OR a common human spelling) -> a role key
  // that ACTUALLY exists. We never invent a key: if the text can't be matched
  // to a real role the row is rejected with a clear message instead of hitting
  // the users_role_fkey constraint at insert time.
  const roles = await listRoles().catch(() => []);
  const roleKeys = new Set(roles.map((r) => r.key));
  const roleByKey = new Map(roles.map((r) => [String(r.key).toLowerCase(), r.key]));
  const roleByName = new Map(roles.map((r) => [String(r.name).toLowerCase(), r.key]));
  const norm = (v) => String(v || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  // Forgiving aliases -> canonical key. First matching pattern wins.
  const ALIASES = [
    [/(field )?respon/, "field_resp"],                 // Field Responder / Response / responder
    [/response team|reaction|guard|patrol/, "field_resp"],
    [/(field )?tech/, "field_tech"],                    // Field Technician / tech
    [/\bnoc\b|control room|operator|monitor/, "noc"],
    [/assistant security regional|regional assistant security/, "sec_regional_asst"],
    [/security.*regional|regional.*security/, "sec_regional"],
    [/assistant security country|country assistant security/, "sec_country_asst"],
    [/security.*country|country.*security/, "sec_country"],
    [/assistant manager|assist.*manager/, "asst_mgr"],
    [/company manager|manager/, "company_mgr"],
    [/super ?admin/, "superadmin"],
    [/admin/, "admin"],
  ];
  const resolveRole = (v) => {
    const raw = String(v || "").trim();
    if (!raw) return { key: null };                     // no role -> leave null (allowed)
    const s = norm(v);
    const asKey = s.replace(/ /g, "_");
    // 1) exact key or exact display name
    if (roleByKey.has(s)) return { key: roleByKey.get(s) };
    if (roleKeys.has(asKey)) return { key: asKey };
    if (roleByName.has(s)) return { key: roleByName.get(s) };
    // 2) forgiving aliases (only accepted if that key really exists)
    for (const [re, key] of ALIASES) if (re.test(s) && roleKeys.has(key)) return { key };
    // 3) loose contains-match against real role names
    for (const r of roles) { const n = norm(r.name); if (n && (n.includes(s) || s.includes(n))) return { key: r.key }; }
    return { key: null, unknown: raw };                 // couldn't map -> reject the row
  };

  const companyCache = new Map();
  const companyIdFor = async (nameRaw) => {
    const name = String(nameRaw || "").trim();
    if (!name) return null;
    const key = name.toLowerCase();
    if (!companyCache.has(key)) {
      const co = await findCompanyByName(name).catch(() => null);
      companyCache.set(key, co ? co.id : null);
    }
    return companyCache.get(key);
  };

  let created = 0;
  const skipped = [];
  const errors = [];
  const seen = new Set(); // guard against duplicate emails within the same file

  for (const r of rows) {
    const name = String(r.name || "").trim();
    const email = String(r.email || "").trim();
    if (!name || !email) { errors.push({ name, email, reason: "name and email are required" }); continue; }
    const emailKey = email.toLowerCase();
    if (seen.has(emailKey)) { skipped.push({ email, reason: "duplicate row in file" }); continue; }
    seen.add(emailKey);
    try {
      if (await findUserByIdentity(email)) { skipped.push({ email, reason: "email already exists" }); continue; }
      // Resolve the role to a REAL key. If text was given but can't be matched,
      // reject this row with a helpful message rather than inserting a bad key.
      const rr = resolveRole(r.role);
      if (rr.unknown) {
        errors.push({ email, reason: `unknown role "${rr.unknown}" — use one of: ${roles.map((x) => x.name).join(", ")}` });
        continue;
      }
      const region = String(r.region || "").trim();
      const regions = region && !/^country[-\s]?wide$/i.test(region) ? [region] : [];
      const passwordHash = await hashPassword(pwFromName(name));
      await createActiveUser({
        name,
        email,
        phone: String(r.phone || "").trim(),
        companyId: await companyIdFor(r.company),
        role: rr.key,
        regions,
        passwordHash,
      });
      created++;
    } catch (e) {
      errors.push({ email, reason: e?.message || "could not create user" });
    }
  }

  logAudit(request, {
    action: "Users imported", category: "Users",
    detail: `Imported ${created} user(s)${skipped.length ? `, ${skipped.length} skipped` : ""}${errors.length ? `, ${errors.length} error(s)` : ""}`,
  });
  return NextResponse.json({ created, skipped, errors });
}
