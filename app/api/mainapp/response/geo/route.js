// app/api/mainapp/response/geo/route.js
// GET -> { regions, clusters, companies } for the Response Teams page — all pulled
// from tables (no hardcoded data). `companies` = security companies (Response).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { listRegions, listClusters } from "../../../apiUtils/dataControl/response.js";
import { listCompaniesByPurpose } from "../../../apiUtils/dataControl/companies.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const [regions, clusters, companies] = await Promise.all([
      listRegions(), listClusters(), listCompaniesByPurpose("Response"),
    ]);
    return NextResponse.json({ regions, clusters, companies });
  } catch (err) {
    console.error("[response geo]", err);
    return NextResponse.json({ regions: [], clusters: [], companies: [] }, { status: 500 });
  }
}
