// app/api/mainapp/org/route.js
// GET /api/mainapp/org   (signed in) -> the client company (national, all sites)
// PUT /api/mainapp/org   (admin)     -> save it (from the Settings Company card)
import { NextResponse } from "next/server";
import { getOrgConfig, saveOrgConfig } from "../../apiUtils/dataControl/appConfig.js";
import { getAuth, requireAdmin } from "../../apiUtils/authUtils/session.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json({ org: await getOrgConfig() });
  } catch (err) {
    console.error("[org GET] error", err);
    return NextResponse.json({ error: "Failed to load company" }, { status: 500 });
  }
}

export async function PUT(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  try {
    const org = await saveOrgConfig(body || {}, gate.user.name || gate.user.email || null);
    logAudit(request, { action: "Company settings updated", category: "System", detail: `Updated the client company (${org.name})` });
    return NextResponse.json({ org });
  } catch (err) {
    console.error("[org PUT] error", err);
    return NextResponse.json({ error: "Failed to save company" }, { status: 500 });
  }
}
