// app/api/mainapp/ingest/telemetry/route.js
// GET /api/mainapp/ingest/telemetry?device=<id>&imei=<imei>&from=<iso>&to=<iso>&limit=<n>
// Historical normalized telemetry — the feed playback animates through.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { listTelemetry, latestTelemetry } from "../../../apiUtils/dataControl/telemetry.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const { searchParams } = new URL(request.url);
  const deviceId = searchParams.get("device") ? Number(searchParams.get("device")) : null;
  const imei = searchParams.get("imei") || null;
  const from = searchParams.get("from") || null;
  const to = searchParams.get("to") || null;
  const limit = Number(searchParams.get("limit")) || 500;
  const latestOnly = searchParams.get("latest") === "1";
  const newest = searchParams.get("newest") === "1";
  const q = searchParams.get("q") || null;
  const event = searchParams.get("event") || null;

  try {
    if (latestOnly && deviceId) {
      return NextResponse.json({ latest: await latestTelemetry(deviceId) });
    }
    const rows = await listTelemetry({ deviceId, imei, from, to, limit, newest, q, event });
    return NextResponse.json({ telemetry: rows, count: rows.length });
  } catch (err) {
    console.error("[ingest telemetry] error", err);
    return NextResponse.json({ error: "Failed to load telemetry" }, { status: 500 });
  }
}
