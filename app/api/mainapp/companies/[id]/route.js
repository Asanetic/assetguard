// app/api/mainapp/companies/[id]/route.js
// PUT -> update a company (name, purposes, contact, phone, status). Admin only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { updateCompany, companyType } from "../../../apiUtils/dataControl/companies.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function PUT(request, ctx) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const params = await ctx?.params;
  const id = Number(params?.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const name = String(body.name || "").trim();
  const purposes = Array.isArray(body.purposes) ? body.purposes : [];
  if (!name) return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  if (!purposes.length) return NextResponse.json({ error: "Select at least one purpose" }, { status: 400 });
  try {
    const company = await updateCompany(id, {
      name, purposes, contactEmail: body.contactEmail, phone: body.phone, status: body.status,
    });
    if (!company) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    logAudit(request, { action: "Company updated", category: "Companies",
      detail: `${company.name} — ${companyType(company.purposes)} (${(company.purposes || []).join(", ")})` });
    return NextResponse.json({ company: { ...company, type: companyType(company.purposes) } });
  } catch (err) {
    console.error("[company PUT]", err);
    return NextResponse.json({ error: "Could not update company" }, { status: 500 });
  }
}
