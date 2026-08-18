// app/api/mainapp/admin/branding/route.js
// GET  /api/mainapp/admin/branding  (signed in) -> { branding }
// PUT  /api/mainapp/admin/branding  (admin)     -> save company name + logo
// The logo (data URL) becomes the watermark on every generated document.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth, requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { getBranding, setBranding } from "../../../apiUtils/dataControl/appConfig.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const branding = await getBranding().catch(() => ({ companyName: "", logoDataUrl: "", watermark: true }));
  return NextResponse.json({ branding });
}

export async function PUT(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const logo = String(body.logoDataUrl || "");
  // Guard against oversized logos (data URLs are base64 — cap ~1.5 MB encoded).
  if (logo && logo.length > 1_600_000) return NextResponse.json({ error: "Logo too large — use an image under ~1 MB" }, { status: 413 });
  if (logo && !/^data:image\/(png|jpe?g|svg\+xml|webp);base64,/.test(logo) && !logo.startsWith("data:image/")) {
    return NextResponse.json({ error: "Logo must be an image data URL" }, { status: 400 });
  }
  try {
    const saved = await setBranding({
      companyName: String(body.companyName || "").slice(0, 120),
      logoDataUrl: logo,
      watermark: body.watermark !== false,
    }, gate.user?.sub || gate.user?.email || null);
    return NextResponse.json({ ok: true, branding: saved });
  } catch (err) {
    console.error("[branding PUT]", err);
    return NextResponse.json({ error: "Failed to save branding" }, { status: 500 });
  }
}
