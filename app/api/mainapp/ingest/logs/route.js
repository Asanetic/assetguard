// app/api/mainapp/ingest/logs/route.js
// GET /api/mainapp/ingest/logs?since=<id>&limit=<n>
// Returns listener status + recent parsed logs from the in-memory ring buffer.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStatus, getRecent } from "../../../apiUtils/ingest/listener.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const since = Number(searchParams.get("since")) || 0;
  const limit = Math.min(Number(searchParams.get("limit")) || 200, 500);

  return NextResponse.json({ status: getStatus(), logs: getRecent(since, limit) });
}
