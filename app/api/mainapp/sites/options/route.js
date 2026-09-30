// app/api/mainapp/sites/options/route.js
// GET /api/mainapp/sites/options?q=&region=&status=   (any signed-in user)
//   -> { sites: [{ id, code, name, region, status, lat, lng }] }
//
// Why this exists: `GET /api/mainapp/sites` is `requireAdmin`, which is right —
// it returns contacts, security arrangements and the full details blob. But a
// FIELD TECHNICIAN has to be able to say which site they are standing at, see
// the sites map, and have the app work out which site is nearest. Without this
// they get a 403 and those screens can never load.
//
// So this returns the fields a picker and a map pin need, and nothing else. It
// is not a loosening of the sites route; it is a different, much smaller answer.
//
// COORDINATES: added deliberately, and worth being explicit about, because the
// note above used to give "it returns coordinates" as one reason the full route
// is admin-only. A site's position is not a secret from the person being sent to
// stand at it — it is on their work order and in their maps app already. Three
// things need it:
//   * the sites MAP, which cannot place a pin without it
//   * "detect location", which suggests the nearest site to the current fix
//   * the installation work log, which files the job against a position
// What stays admin-only is everything genuinely sensitive: contacts, security
// company and arrangements, alarm configuration, and the details blob.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "../../../apiUtils/s_env/db.js";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { scopeFilterFor } from "../../../apiUtils/authUtils/regionScope.js";

export async function GET(request) {
  const me = getAuth(request);
  if (!me)
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const region = (searchParams.get("region") || "").trim();
  const status = (searchParams.get("status") || "").trim();

  const where = [`lower(coalesce(status, '')) <> 'inactive'`];
  const params = [];

  // Visibility scope — same rule as the sites list: region-scoped users see sites
  // in their regions; list-scoped users see only their assigned sites (admin = all).
  const { regions, siteIds } = await scopeFilterFor(me);
  if (Array.isArray(regions)) {
    // Case-insensitive region match (see dataControl/sites.js).
    params.push(regions.map((r) => String(r).toLowerCase()));
    where.push(`lower(security_region) = ANY($${params.length}::text[])`);
  }
  if (Array.isArray(siteIds)) {
    params.push(siteIds);
    where.push(`id = ANY($${params.length}::bigint[])`);
  }

  // The same filter names the admin list takes, so a screen can be pointed at
  // either route without its query having to change shape.
  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    const i = params.length;
    where.push(
      `(lower(name) LIKE $${i} OR lower(coalesce(code,'')) LIKE $${i} OR id::text LIKE $${i})`
    );
  }
  if (region && region !== "All") {
    params.push(region);
    where.push(`region = $${params.length}`);
  }
  if (status && status !== "All") {
    params.push(status);
    where.push(`status = $${params.length}`);
  }

  try {
    const { rows } = await query(
      `SELECT id, code, name, region, status, lat, lng
         FROM sites
        WHERE ${where.join(" AND ")}
        ORDER BY name ASC`,
      params
    );
    return NextResponse.json({ sites: rows });
  } catch (err) {
    console.error("[sites options] error", err);
    return NextResponse.json({ error: "Failed to load sites" }, { status: 500 });
  }
}
