// app/api/mainapp/users/site-scope/import/route.js
// POST /api/mainapp/users/site-scope/import   (admin)
// Body: { rows: [{ user, site }, ...], setListMode?: boolean }
//   user = email or exact name; site = site code or exact name.
// Bulk-assigns each user's sites (user_sites) and, by default, flips each
// affected user into 'list' visibility mode so the assignment takes effect.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../apiUtils/authUtils/session.js";
import { importUserSites } from "../../../../apiUtils/dataControl/userSites.js";
import { logAudit } from "../../../../apiUtils/dataControl/audit.js";

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const rows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rows || !rows.length) return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  if (rows.length > 20000) return NextResponse.json({ error: "Too many rows (max 20000)" }, { status: 413 });
  try {
    const result = await importUserSites(rows, { setListMode: body.setListMode !== false });
    logAudit(request, {
      action: "Site assignments imported", category: "Users",
      detail: `Assigned ${result.imported} site(s) across ${result.users} user(s)`,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[site-scope import]", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
