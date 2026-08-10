// app/api/mainapp/site-contacts/route.js
// GET /api/mainapp/site-contacts?region=<security region>   (signed in)
// Returns the Add-site autofill data resolved from real records:
//   { org, security }  — client company (Settings) + security staff (Users).
import { NextResponse } from "next/server";
import { resolveSiteContacts } from "../../apiUtils/dataControl/siteContacts.js";
import { getAuth } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "";
  try {
    return NextResponse.json(await resolveSiteContacts(region));
  } catch (err) {
    console.error("[site-contacts GET] error", err);
    return NextResponse.json({ error: "Failed to resolve contacts" }, { status: 500 });
  }
}
