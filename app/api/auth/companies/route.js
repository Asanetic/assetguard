// app/api/auth/companies/route.js
// GET /api/auth/companies  -> public list of company NAMES for the
// registration dropdown (no auth required; names only).
import { NextResponse } from "next/server";
import { companyNames } from "../../apiUtils/dataControl/companies.js";

export async function GET() {
  try {
    return NextResponse.json({ companies: await companyNames() });
  } catch (err) {
    console.error("[companies] error", err);
    return NextResponse.json({ companies: [] }, { status: 500 });
  }
}
