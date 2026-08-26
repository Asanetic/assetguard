// app/api/mainapp/track/live-detail/route.js
// GET /api/mainapp/track/live-detail?device=<device_id>  (signed in)
//
// NEW FILE. Nothing existing is touched.
//
// The Android tracking screen shows a device card with Battery, Fix source and
// Accuracy on it. `track/live` returns only position, speed and time, and the
// web build depends on exactly that shape — so rather than widen a route the
// web already uses, this is a second, richer read of the same row. `track/live`
// keeps working byte for byte, and the web keeps calling it.
//
// Everything here is a SELECT. No schema changes, no writes.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { query } from "../../../apiUtils/s_env/db.js";

/**
 * `accuracy` and `loc_source` arrive with the `telemetry_geo` migration, and
 * `dataControl/telemetry.js` carries a fallback INSERT that writes neither — so
 * an install that has not run that migration has a device_telemetry table
 * without them. Selecting a column that does not exist fails the WHOLE query
 * and would blank the card, so ask the catalogue first and select only what is
 * really there. Cached for the life of the process; columns do not appear while
 * the server is running.
 */
let columnCache = null;
async function presentColumns() {
  if (columnCache) return columnCache;
  const { rows } = await query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'device_telemetry'`
  );
  columnCache = new Set(rows.map((r) => r.column_name));
  return columnCache;
}

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const device = searchParams.get("device");
  if (!device) return NextResponse.json({ error: "device is required" }, { status: 400 });

  try {
    const cols = await presentColumns();
    const optional = ["battery", "accuracy", "loc_source", "course", "fix"]
      .filter((c) => cols.has(c))
      .map((c) => `, t.${c}`)
      .join("");

    const { rows } = await query(
      `SELECT COALESCE(t.device_time, t.received_at) AS at, t.lat, t.lng, t.speed${optional}
         FROM device_telemetry t JOIN devices d ON d.id = t.device_id
        WHERE d.device_id = $1 AND t.lat IS NOT NULL AND t.lng IS NOT NULL
        ORDER BY COALESCE(t.device_time, t.received_at) DESC
        LIMIT 1`,
      [String(device)]
    );

    const r = rows[0];
    if (!r) return NextResponse.json({ pos: null });

    // 'gps' | 'network'. Older rows predate the column: a row carrying a GL-28
    // 'A' fix is GPS, and anything else is left unknown rather than guessed —
    // an accuracy figure attached to the wrong source is worse than none.
    let locSource = r.loc_source || null;
    if (!locSource && r.fix != null) {
      locSource = String(r.fix).toUpperCase() === "A" ? "gps" : null;
    }

    // Same `pos` shape `track/live` returns, plus the extra fields. Keeping the
    // shape identical means the app can fall back to `track/live` on an older
    // server without any branching — it just gets dashes in those rows.
    const pos = {
      lat: Number(r.lat),
      lng: Number(r.lng),
      speed: r.speed != null ? Math.round(Number(r.speed)) : null,
      at: r.at,
      battery: r.battery != null ? Math.round(Number(r.battery)) : null,
      accuracy: r.accuracy != null ? Math.round(Number(r.accuracy)) : null,
      loc_source: locSource,
      course: r.course != null ? Number(r.course) : null
    };
    return NextResponse.json({ pos });
  } catch (err) {
    console.error("[track live-detail] error", err);
    return NextResponse.json({ pos: null });
  }
}
