// app/api/mainapp/ports/parse-errors/route.js
// GET /api/mainapp/ports/parse-errors?limit=100  (admin)
// Recent frames that failed to parse, newest first.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { listParseErrors } from "../../../apiUtils/dataControl/parseErrors.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const url = new URL(request.url);
  const limit = Number(url.searchParams.get("limit") || 100);
  const errors = await listParseErrors({ limit });
  return NextResponse.json({ errors });
}
