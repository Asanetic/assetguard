// app/api/mainapp/ingest/route.js
// GET  /api/mainapp/ingest             -> listener status (incl. connections)
// POST /api/mainapp/ingest { action }  -> "start" | "stop" | "ack"
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getStatus, startListener, stopListener, setAutoAck } from "../../apiUtils/ingest/listener.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  return NextResponse.json(getStatus());
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const action = body?.action;

  if (action === "start") {
    const port = Number(body.port) || 9000;
    if (port < 1 || port > 65535)
      return NextResponse.json({ error: "Port must be 1–65535" }, { status: 400 });
    const res = await startListener(port);
    return NextResponse.json(res, { status: res.ok ? 200 : 409 });
  }
  if (action === "stop") {
    return NextResponse.json(await stopListener());
  }
  if (action === "ack") {
    const autoAck = setAutoAck({ enabled: body.enabled, text: body.text });
    return NextResponse.json({ ok: true, autoAck, ...getStatus() });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
