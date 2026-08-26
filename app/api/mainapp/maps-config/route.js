// app/api/mainapp/maps-config/route.js
// GET /api/mainapp/maps-config   (any signed-in user) -> current Google Maps config
//   Maps pages call this to get the browser API key + defaults. Google Maps
//   JavaScript keys are meant to be used client-side and should be locked down
//   by HTTP referrer in the Google Cloud console.
//   Also returns the geolocation-backup (Unwired Labs) config — token-safe — and
//   its current request usage, for the Admin -> Google Maps page.
// PUT /api/mainapp/maps-config   (admin) -> save maps and/or geo config (audited)
import { NextResponse } from "next/server";
import {
  getMapsConfig, saveMapsConfig,
  getGeoConfigPublic, saveGeoConfig,
} from "../../apiUtils/dataControl/appConfig.js";
import { getUsage } from "../../apiUtils/dataControl/geoUsage.js";
import { getAuth, requireAdmin } from "../../apiUtils/authUtils/session.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

// The geo config + usage are best-effort: a missing migration must not break the
// maps pages that also call this endpoint just to get the browser key.
async function geoBlock() {
  try {
    const geo = await getGeoConfigPublic();
    const geoUsage = await getUsage("unwired", geo.unwiredCapWindow);
    return { geo, geoUsage };
  } catch (e) {
    console.warn("[maps-config] geo block unavailable:", e?.message || e);
    return { geo: null, geoUsage: null };
  }
}

export async function GET(request) {
  if (!getAuth(request))
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const config = await getMapsConfig();
    const { geo, geoUsage } = await geoBlock();
    return NextResponse.json({ config, geo, geoUsage });
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

  const who = gate.user.name || gate.user.email || null;
  try {
    const config = await saveMapsConfig(body || {}, who);

    // Optional geo (Unwired Labs backup) patch, saved from the same page.
    let savedGeo = false;
    if (body && body.geo && typeof body.geo === "object") {
      await saveGeoConfig(body.geo, who);
      savedGeo = true;
    }

    logAudit(request, {
      action: "Maps configuration updated", category: "System",
      detail: `Google Maps ${config.apiKey ? "key set" : "key cleared"} · ` +
              `${config.mapType}, zoom ${config.defaultZoom}, libraries: ${config.libraries.join(", ") || "none"}` +
              (savedGeo ? " · geolocation backup (Unwired Labs) updated" : ""),
    });

    const { geo, geoUsage } = await geoBlock();
    return NextResponse.json({ config, geo, geoUsage });
  } catch (err) {
    console.error("[maps-config PUT] error", err);
    return NextResponse.json({ error: "Failed to save maps config" }, { status: 500 });
  }
}
