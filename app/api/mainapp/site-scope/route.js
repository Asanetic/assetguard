// app/api/mainapp/site-scope/route.js
// GET /api/mainapp/site-scope  (signed in)  -> { mode }   the GLOBAL default mode
// PUT /api/mainapp/site-scope  (admin)      -> save { mode: 'region' | 'list' }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth, requireAdmin } from "../../apiUtils/authUtils/session.js";
import { getSiteScopeConfig, saveSiteScopeConfig } from "../../apiUtils/dataControl/appConfig.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json(await getSiteScopeConfig());
  } catch {
    return NextResponse.json({ mode: "region" });
  }
}

export async function PUT(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  try {
    const cfg = await saveSiteScopeConfig({ mode: body.mode }, gate.user.name || gate.user.email || null);
    logAudit(request, { action: "Site scope default changed", category: "System", detail: `Default site visibility set to ${cfg.mode}` });
    return NextResponse.json(cfg);
  } catch (err) {
    console.error("[site-scope PUT]", err);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
