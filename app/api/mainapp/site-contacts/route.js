// app/api/mainapp/site-contacts/route.js
// GET /api/mainapp/site-contacts?securityCompany=<name>   (signed in)
// Returns the Add-site autofill data resolved from the COMPANY records:
//   { client, securityCompanies, monitoringCompanies, security }
// The client company + a chosen security company's national Manager + Assistant,
// inherited live from the company records (no region/Users cascade).
import { NextResponse } from "next/server";
import { resolveSiteContacts } from "../../apiUtils/dataControl/siteContacts.js";
import { getAuth } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const securityCompany = searchParams.get("securityCompany") || "";
  try {
    return NextResponse.json(await resolveSiteContacts(securityCompany));
  } catch (err) {
    console.error("[site-contacts GET] error", err);
    return NextResponse.json({ error: "Failed to resolve contacts" }, { status: 500 });
  }
}
