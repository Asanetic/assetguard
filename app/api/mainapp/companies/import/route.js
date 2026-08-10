// app/api/mainapp/companies/import/route.js
// POST /api/mainapp/companies/import  (admin)
// Body: { rows: [{ name, purposes:[], email, phone }, ...] }
import { NextResponse } from "next/server";
import { importCompanies } from "../../../apiUtils/dataControl/companies.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const rows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rows || !rows.length)
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  if (rows.length > 5000)
    return NextResponse.json({ error: "Too many rows (max 5000)" }, { status: 413 });

  try {
    const result = await importCompanies(rows);
    logAudit(request, {
      action: "Companies imported", category: "Companies",
      detail: `Imported ${result.imported ?? 0} companies${result.skipped ? `, skipped ${result.skipped}` : ""}`,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[companies import] error", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
