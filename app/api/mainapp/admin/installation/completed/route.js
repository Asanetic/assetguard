// app/api/mainapp/admin/installation/completed/route.js
// GET /api/mainapp/admin/installation/completed   (admin)
//   ?q=&from=&to=&type=install|maintain&outcome=passed|abandoned&page=&pageSize=
//   -> { rows, total, page, pageSize }
//
// The permanent, SEARCHABLE history of finished jobs — installs and maintenance.
// Paginated server-side because this grows into the thousands.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../apiUtils/authUtils/session.js";
import { listCompleted } from "../../../../apiUtils/dataControl/installation.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const page = Math.max(Number(searchParams.get("page")) || 1, 1);
  const pageSize = Math.min(Math.max(Number(searchParams.get("pageSize")) || 25, 1), 100);

  try {
    const { rows, total } = await listCompleted({
      q: searchParams.get("q") || undefined,
      from: searchParams.get("from") || undefined,
      to: searchParams.get("to") || undefined,
      jobType: searchParams.get("type") || undefined,
      outcome: searchParams.get("outcome") || undefined,
      limit: pageSize,
      offset: (page - 1) * pageSize,
    });
    return NextResponse.json({ rows, total, page, pageSize });
  } catch (err) {
    console.error("[admin/installation/completed] error", err);
    return NextResponse.json({ error: "Failed to load completed jobs" }, { status: 500 });
  }
}
