// app/api/mainapp/ingest/test/route.js
// POST /api/mainapp/ingest/test { raw: "[3G*IMEI*LEN*UD,...]" }
// Feeds a raw packet through the real parse -> resolve -> store pipeline, so you
// can verify the flow (and DB mapping) without a physical tracker.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { injectTest } from "../../../apiUtils/ingest/listener.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const raw = String(body?.raw || "").trim();
  if (!raw) return NextResponse.json({ error: "Provide a raw packet" }, { status: 400 });

  try {
    const results = await injectTest(raw);
    return NextResponse.json({ ok: true, results });
  } catch (err) {
    console.error("[ingest test] error", err);
    return NextResponse.json({ error: "Could not process packet" }, { status: 500 });
  }
}
