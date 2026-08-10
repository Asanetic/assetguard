// app/api/mainapp/maps-config/route.js
// GET /api/mainapp/maps-config   (any signed-in user) -> current Google Maps config
//   Maps pages call this to get the browser API key + defaults. Google Maps
//   JavaScript keys are meant to be used client-side and should be locked down
//   by HTTP referrer in the Google Cloud console.
// PUT /api/mainapp/maps-config   (admin) -> save the config (audited)
import { NextResponse } from "next/server";
import { getMapsConfig, saveMapsConfig } from "../../apiUtils/dataControl/appConfig.js";
import { getAuth, requireAdmin } from "../../apiUtils/authUtils/session.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  if (!getAuth(request))
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    return NextResponse.json({ config: await getMapsConfig() });
  } catch (err) {
    console.error("[maps-config GET] error", err);
    return NextResponse.json({ error: "Failed to load maps config" }, { status: 500 });
  }
}

export async function PUT(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  try {
    const config = await saveMapsConfig(body || {}, gate.user.name || gate.user.email || null);
    logAudit(request, {
      action: "Maps configuration updated", category: "System",
      detail: `Google Maps ${config.apiKey ? "key set" : "key cleared"} · ` +
              `${config.mapType}, zoom ${config.defaultZoom}, libraries: ${config.libraries.join(", ") || "none"}`,
    });
    return NextResponse.json({ config });
  } catch (err) {
    console.error("[maps-config PUT] error", err);
    return NextResponse.json({ error: "Failed to save maps config" }, { status: 500 });
  }
}
