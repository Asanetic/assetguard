// app/api/mainapp/media/route.js
// GET  /api/mainapp/media?site_id=&limit=   (signed in) -> photo metadata, newest first
// POST /api/mainapp/media                   (signed in) -> upload one photo
//
// POST is multipart/form-data:
//   file  — the image (required)
//   meta  — a JSON string: { site_id, site_code, site_name, photo_type, device_id,
//           technician, status, lat, lng, accuracy_m, taken_at, imprinted }
//
// Multipart rather than base64-in-JSON: a 300 KB photo becomes 400 KB base64,
// and a field technician is usually on the worst connection of anyone using
// this system.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { listPhotos, insertPhoto } from "../../apiUtils/dataControl/media.js";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import { logAudit } from "../../apiUtils/dataControl/audit.js";

/** Anything larger is a mistake, not a site photo. */
const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

export async function GET(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  // session.js exports getAuth and requireAdmin only, so the role check is
  // inline here rather than importing something that does not exist.
  const admin = me.role === "admin" || me.role === "superadmin";
  try {
    const photos = await listPhotos({
      site_id: searchParams.get("site_id") || undefined,
      // A non-admin sees their OWN captures. Unscoped, any signed-in user could
      // page through every site's photos with their GPS fixes and the name of
      // whoever was standing there — which is what this data is.
      captured_by: admin ? undefined : (me.name || me.email || "\u0000"),
      limit: searchParams.get("limit") || undefined,
    });
    return NextResponse.json({ photos });
  } catch (err) {
    console.error("[media GET] error", err);
    return NextResponse.json({ error: "Failed to load photos" }, { status: 500 });
  }
}

export async function POST(request) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let form;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart/form-data" }, { status: 400 });
  }

  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function")
    return NextResponse.json({ error: "No photo attached" }, { status: 400 });

  const mime = file.type || "image/jpeg";
  if (!ALLOWED.has(mime))
    return NextResponse.json({ error: `Unsupported image type: ${mime}` }, { status: 415 });

  const buffer = Buffer.from(await file.arrayBuffer());
  if (!buffer.length)
    return NextResponse.json({ error: "The photo was empty" }, { status: 400 });
  if (buffer.length > MAX_BYTES)
    return NextResponse.json({ error: "Photo is larger than 8 MB" }, { status: 413 });

  let meta = {};
  const rawMeta = form.get("meta");
  if (rawMeta) {
    try { meta = JSON.parse(String(rawMeta)); }
    catch { return NextResponse.json({ error: "meta is not valid JSON" }, { status: 400 }); }
  }

  if (!meta.site_id && !meta.site_code)
    return NextResponse.json({ error: "A site is required" }, { status: 422 });

  try {
    const photo = await insertPhoto(
      {
        ...meta,
        mime,
        // The signed-in user, not whatever the client claims — `technician` is
        // a chosen name on the form, this is who actually uploaded it.
        captured_by: me.name || me.email || null,
      },
      buffer
    );
    logAudit(request, {
      action: "Site photo captured",
      category: "Sites",
      detail: `${photo.photo_type} at ${photo.site_code || photo.site_name || "a site"}` +
        `${photo.technician ? ` by ${photo.technician}` : ""}`,
    });
    return NextResponse.json({ photo }, { status: 201 });
  } catch (err) {
    console.error("[media POST] error", err);
    // A bad site_id trips the foreign key rather than a validation branch.
    if (String(err?.code) === "23503")
      return NextResponse.json({ error: "That site does not exist" }, { status: 422 });
    // Names the setup step instead of making someone read the server log. Safe
    // to show: it describes a deployment task, not the schema.
    if (String(err?.code) === "SITE_PHOTOS_MISSING")
      return NextResponse.json(
        { error: "Photo storage is not set up on the server yet.", code: "SITE_PHOTOS_MISSING" },
        { status: 503 }
      );
    return NextResponse.json({ error: "Failed to save the photo" }, { status: 500 });
  }
}
