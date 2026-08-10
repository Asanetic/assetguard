// app/api/mainapp/sites/route.js
// GET  /api/mainapp/sites?q=&region=&status=   (admin) -> sites list
// POST /api/mainapp/sites                        (admin) -> create a site
import { NextResponse } from "next/server";
import {
  listSites, createSite, getSiteByCode,
} from "../../apiUtils/dataControl/sites.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || undefined;
  const region = searchParams.get("region") || undefined;
  const status = searchParams.get("status") || undefined;

  try {
    const sites = await listSites({ q, region, status });
    return NextResponse.json({ sites });
  } catch (err) {
    console.error("[sites GET] error", err);
    return NextResponse.json({ error: "Failed to load sites" }, { status: 500 });
  }
}

// Build a display code from the site name + a numeric suffix (e.g. Nairobi HQ -> NBI-HQ-001).
function slugCode(name, n) {
  const words = String(name || "SITE").toUpperCase().replace(/[^A-Z0-9 ]/g, "").trim().split(/\s+/);
  const a = (words[0] || "SITE").slice(0, 3).padEnd(3, "X");
  const b = (words[1] || words[0] || "ST").slice(0, 2).padEnd(2, "X");
  return `${a}-${b}-${String(n).padStart(3, "0")}`;
}

function num(v) {
  if (v === undefined || v === null || v === "") return null;
  const n = Number(String(v).replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const {
    name, region = null, location = null, devices = 0, status = "Pending",
    // Full Add-site fields:
    smpms_vendor = null, dist_region = null, county = null,
    lat = null, lng = null, coordinates = null, response_cluster = null,
    security_region = null, country = null,
    security_company = null, monitoring_company = null, details = null,
  } = body || {};
  let { code } = body || {};

  if (!name || !name.trim())
    return NextResponse.json({ error: "Site name is required" }, { status: 400 });

  // Coordinates may arrive as a "lat, lng" string; split if lat/lng weren't sent.
  let latN = num(lat), lngN = num(lng);
  if ((latN === null || lngN === null) && coordinates) {
    const parts = String(coordinates).split(",");
    if (parts.length === 2) { latN = num(parts[0]); lngN = num(parts[1]); }
  }

  try {
    // Auto-generate a unique code if none was supplied.
    if (!code || !String(code).trim()) {
      for (let n = 1; n <= 999; n++) {
        const candidate = slugCode(name, n);
        if (!(await getSiteByCode(candidate))) { code = candidate; break; }
      }
    } else {
      code = String(code).trim().toUpperCase();
      if (await getSiteByCode(code))
        return NextResponse.json({ error: "A site with that code already exists" }, { status: 409 });
    }

    const site = await createSite({
      code, name: name.trim(),
      // Listing columns: fall back to the richer form fields where sensible.
      region: region || dist_region || null,
      location: location || county || null,
      devices, status,
      smpms_vendor, dist_region, county,
      lat: latN, lng: lngN,
      response_cluster, security_region, country,
      security_company, monitoring_company,
      details: details || null,
    });
    logAudit(request, {
      action: "Site added", category: "Sites",
      detail: `Added site ${site.code} ${site.name}`,
    });
    return NextResponse.json({ site }, { status: 201 });
  } catch (err) {
    console.error("[sites POST] error", err);
    return NextResponse.json({ error: "Could not create site" }, { status: 500 });
  }
}
