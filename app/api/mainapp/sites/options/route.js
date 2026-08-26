// app/api/mainapp/sites/options/route.js
// GET /api/mainapp/sites/options   (any signed-in user) -> [{ id, code, name, region }]
//
// Why this exists: `GET /api/mainapp/sites` is `requireAdmin`, which is right —
// it returns coordinates, contacts, security arrangements and the full details
// blob. But a FIELD TECHNICIAN has to be able to say which site they are
// standing at, and Capture is their screen. Without this they get a 403 and the
// Save button can never enable.
//
// So this returns the four fields a picker needs and nothing else. It is not a
// loosening of the sites route; it is a different, much smaller answer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "../../../apiUtils/s_env/db.js";
import { getAuth } from "../../../apiUtils/authUtils/session.js";

export async function GET(request) {
  if (!getAuth(request))
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  try {
    const { rows } = await query(
      `SELECT id, code, name, region FROM sites
        WHERE lower(coalesce(status, '')) <> 'inactive'
        ORDER BY name ASC`
    );
    return NextResponse.json({ sites: rows });
  } catch (err) {
    console.error("[sites options] error", err);
    return NextResponse.json({ error: "Failed to load sites" }, { status: 500 });
  }
}
