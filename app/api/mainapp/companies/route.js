// app/api/mainapp/companies/route.js
// GET  /api/mainapp/companies?q=   (admin) -> companies with user counts
// POST /api/mainapp/companies       (admin) -> register a company
import { NextResponse } from "next/server";
import { listCompanies, createCompany, findCompanyByName } from "../../apiUtils/dataControl/companies.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const { searchParams } = new URL(request.url);
  try {
    return NextResponse.json({
      companies: await listCompanies(searchParams.get("q") || undefined),
    });
  } catch (err) {
    console.error("[companies GET] error", err);
    return NextResponse.json({ error: "Failed to load companies" }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const { name, purposes = [], contactEmail, phone } = body || {};
  if (!name || !name.trim())
    return NextResponse.json({ error: "Company name is required" }, { status: 400 });
  if (!Array.isArray(purposes) || purposes.length === 0)
    return NextResponse.json({ error: "Select at least one purpose" }, { status: 400 });

  try {
    if (await findCompanyByName(name))
      return NextResponse.json({ error: "That company already exists" }, { status: 409 });
    const company = await createCompany({ name, purposes, contactEmail, phone });
    return NextResponse.json({ company }, { status: 201 });
  } catch (err) {
    console.error("[companies POST] error", err);
    return NextResponse.json({ error: "Failed to create company" }, { status: 500 });
  }
}
