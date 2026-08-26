// app/api/mainapp/facets/route.js
// GET /api/mainapp/facets  (signed in) -> live option lists for every entity
// dropdown (regions, clusters, vendors, companies, teams, firmwares, …), always
// in sync with the data. Short cache so pickers are snappy without going stale.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../apiUtils/authUtils/session.js";
import { getFacets } from "../../apiUtils/dataControl/facets.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const facets = await getFacets();
    return NextResponse.json({ facets }, { headers: { "Cache-Control": "private, max-age=60" } });
  } catch (err) {
    console.error("[facets GET] error", err);
    return NextResponse.json({ error: "Failed to load options" }, { status: 500 });
  }
}
