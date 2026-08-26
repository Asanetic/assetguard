// app/api/mainapp/media/[id]/route.js
// GET    /api/mainapp/media/:id        (signed in) -> the image BYTES
// DELETE /api/mainapp/media/:id        (admin)     -> remove one photo
//
// The bytes live on their own route so that listing photos never drags
// megabytes through JSON, and so an <img src> / Coil load is a plain GET.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getPhotoBytes, getPhotoMeta, deletePhoto } from "../../../apiUtils/dataControl/media.js";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

const EXT = { "image/jpeg": "jpg", "image/jpg": "jpg", "image/png": "png", "image/webp": "webp" };

/**
 * A filename someone can still identify after it has been emailed on:
 *   AQF-001_Before-works_2026-08-22_1103.jpg
 *
 * Everything outside [A-Za-z0-9._-] is stripped rather than escaped. A quote or
 * a newline reaching a Content-Disposition header is a header-injection bug,
 * and site names in this system are user-entered.
 */
function downloadName(row) {
  const safe = (s, fallback) =>
    String(s || "").replace(/[^A-Za-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || fallback;

  const when = row.taken_at ? new Date(row.taken_at) : null;
  const stamp =
    when && !isNaN(when)
      ? `${when.toISOString().slice(0, 10)}_${String(when.getUTCHours()).padStart(2, "0")}${String(
          when.getUTCMinutes()
        ).padStart(2, "0")}`
      : "undated";

  return [
    safe(row.site_code || row.site_name, "site"),
    safe(row.photo_type, "photo"),
    stamp,
  ].join("_") + "." + (EXT[row.mime] || "jpg");
}

export async function GET(request, { params }) {
  if (!getAuth(request))
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  const { searchParams } = new URL(request.url);

  try {
    const row = await getPhotoBytes(id);
    if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const headers = {
      "Content-Type": row.mime || "image/jpeg",
      "Content-Length": String(row.image.length),
      // The bytes for an id never change, so let the client keep them. Private:
      // this is behind a session and must not sit in a shared cache.
      "Cache-Control": "private, max-age=31536000, immutable",
    };

    // ?download=1 -> save to disk with a name that means something a year from
    // now, instead of the row id.
    if (searchParams.get("download")) {
      headers["Content-Disposition"] = `attachment; filename="${downloadName(row)}"`;
    }

    return new Response(row.image, { headers });
  } catch (err) {
    console.error("[media bytes] error", err);
    return NextResponse.json({ error: "Failed to load the photo" }, { status: 500 });
  }
}

/**
 * How long a technician may undo their own capture.
 *
 * Long enough for the real case — a blurred or mis-framed shot noticed while
 * still standing at the site — and short enough that a photo cannot be scrubbed
 * days later by the person it documents. The whole point of this feature is
 * that the record is hard to alter after the fact; an unlimited self-delete
 * would quietly remove that property.
 */
const RETAKE_WINDOW_MS = 30 * 60 * 1000;

export async function DELETE(request, { params }) {
  const me = getAuth(request);
  if (!me) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { id: idParam } = await params;
  const id = Number(idParam);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });

  try {
    const meta = await getPhotoMeta(id);
    if (!meta) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const admin = me.role === "admin" || me.role === "superadmin";
    // captured_by is set server-side at upload from the session, never from the
    // client, so it is a safe thing to compare against.
    const mine =
      !!meta.captured_by &&
      (meta.captured_by === me.name || meta.captured_by === me.email);
    const ageMs = Date.now() - new Date(meta.created_at).getTime();

    if (!admin) {
      if (!mine)
        return NextResponse.json(
          { error: "You can only remove photos you captured.", code: "NOT_YOURS" },
          { status: 403 }
        );
      if (!(ageMs >= 0 && ageMs < RETAKE_WINDOW_MS))
        return NextResponse.json(
          {
            error: "This photo is older than 30 minutes — ask an administrator to remove it.",
            code: "RETAKE_WINDOW_CLOSED",
          },
          { status: 403 }
        );
    }

    await deletePhoto(id);
    logAudit(request, {
      action: "Site photo deleted",
      category: "Sites",
      // Says WHO and under which rule. A deletion that leaves no trace of its
      // justification is the thing an audit log exists to prevent.
      detail:
        `${meta.photo_type} at ${meta.site_code || meta.site_name || "a site"}` +
        ` — removed by ${me.name || me.email}` +
        (admin ? " (administrator)" : ` (own capture, ${Math.round(ageMs / 60000)} min old)`),
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[media DELETE] error", err);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
