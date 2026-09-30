// app/api/mainapp/response/geo/route.js
// GET    -> { regions, clusters, companies } for the Settings + Response Teams pages —
//           all pulled from tables (no hardcoded data). `companies` = security
//           companies (Response). `clusters` carry their company + regional-manager.
// POST   -> register/update a region or cluster (admin). Body: { kind:'region'|'cluster', ... }
// DELETE -> remove a region or cluster (admin). Body: { kind, name }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth, requireAdmin } from "../../../apiUtils/authUtils/session.js";
import {
  listRegions, listClustersFull, saveRegion, deleteRegion, saveCluster, deleteCluster,
} from "../../../apiUtils/dataControl/response.js";
import { listCompaniesByPurpose } from "../../../apiUtils/dataControl/companies.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    const [regions, clusters, companies] = await Promise.all([
      listRegions(), listClustersFull(), listCompaniesByPurpose("Response"),
    ]);
    return NextResponse.json({ regions, clusters, companies });
  } catch (err) {
    console.error("[response geo]", err);
    return NextResponse.json({ regions: [], clusters: [], companies: [] }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  try {
    if (body.kind === "region") {
      const name = await saveRegion(body.name);
      logAudit(request, { action: "Security region saved", category: "Settings", detail: name });
      return NextResponse.json({ ok: true, name }, { status: 201 });
    }
    if (body.kind === "cluster") {
      const name = await saveCluster({
        name: body.name, region: body.region ?? null, company: body.company ?? null,
        rm: body.rm ?? null, rmPhones: body.rmPhones || [], rmEmails: body.rmEmails || [],
        originalName: body.originalName,
      });
      logAudit(request, { action: "Response cluster saved", category: "Settings", detail: name });
      return NextResponse.json({ ok: true, name }, { status: 201 });
    }
    return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
  } catch (err) {
    console.error("[response geo POST]", err);
    return NextResponse.json({ error: err?.message || "Could not save" }, { status: 500 });
  }
}

export async function DELETE(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const name = String(body.name || "").trim();
  if (!name) return NextResponse.json({ error: "name required" }, { status: 400 });
  try {
    if (body.kind === "region") await deleteRegion(name);
    else if (body.kind === "cluster") await deleteCluster(name);
    else return NextResponse.json({ error: "Unknown kind" }, { status: 400 });
    logAudit(request, { action: `${body.kind === "region" ? "Security region" : "Response cluster"} removed`, category: "Settings", detail: name });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[response geo DELETE]", err);
    return NextResponse.json({ error: err?.message || "Could not delete" }, { status: 500 });
  }
}
