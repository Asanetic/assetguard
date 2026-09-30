// app/api/mainapp/companies/directory/route.js
// GET /api/mainapp/companies/directory  (signed in)
// The Client company + registered Security/Monitoring companies, each with their
// stored contacts, for the Add/View-site screens' inherited-contacts blocks.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { getSiteCompanyDirectory } from "../../../apiUtils/dataControl/companies.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json(await getSiteCompanyDirectory());
  } catch (err) {
    console.error("[companies directory GET] error", err);
    return NextResponse.json({ error: "Failed to load companies" }, { status: 500 });
  }
}
