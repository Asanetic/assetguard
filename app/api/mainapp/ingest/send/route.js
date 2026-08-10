// app/api/mainapp/ingest/send/route.js
// POST /api/mainapp/ingest/send { connId?, data, hex? }
// Send bytes to one connected tracker (connId) or broadcast to all (no connId).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { sendData } from "../../../apiUtils/ingest/listener.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const data = body?.data;
  if (data == null || data === "")
    return NextResponse.json({ error: "Nothing to send" }, { status: 400 });

  const res = sendData(body.connId || null, data, !!body.hex);
  return NextResponse.json(res, { status: res.ok ? 200 : 409 });
}
