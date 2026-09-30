// app/api/mainapp/companies/[id]/route.js
// PUT -> update a company (name, purposes, contact, phone, status). Admin only.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { updateCompany, deleteCompany, companyType } from "../../../apiUtils/dataControl/companies.js";
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
      contacts: body.contacts,
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

// DELETE -> remove a company. Admin only, and refused while any user still
// belongs to it (see deleteCompany) so no one silently loses purpose-derived
// access.
export async function DELETE(request, ctx) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const params = await ctx?.params;
  const id = Number(params?.id);
  if (!Number.isFinite(id)) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  try {
    const res = await deleteCompany(id);
    if (!res) return NextResponse.json({ error: "Company not found" }, { status: 404 });
    if (res.blocked === "users") {
      const n = res.users;
      return NextResponse.json(
        {
          error: `Can’t delete: ${n} user${n === 1 ? "" : "s"} still attached to this company. Reassign or remove them first.`,
          blocked: "users",
          users: n,
        },
        { status: 409 }
      );
    }
    logAudit(request, {
      action: "Company deleted", category: "Companies",
      detail: `${res.company.name} (${(res.company.purposes || []).join(", ")})`,
    });
    return NextResponse.json({ ok: true, deleted: id });
  } catch (err) {
    console.error("[company DELETE]", err);
    return NextResponse.json({ error: "Could not delete company" }, { status: 500 });
  }
}
