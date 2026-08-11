// app/api/mainapp/ports/route.js
// GET  /api/mainapp/ports          -> managed TCP ports (config + live state)
// POST /api/mainapp/ports { port, deviceModel }  -> add a port to the list
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin, getAuth } from "../../apiUtils/authUtils/session.js";
import { listPorts, addPort } from "../../apiUtils/dataControl/listenerPorts.js";
import { portRuntime, syncFromDb } from "../../apiUtils/ingest/portManager.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  try {
    await syncFromDb(); // reopen enabled ports after a restart
    const rows = await listPorts();
    const ports = rows.map((r) => ({
      port: r.port, proto: r.proto || "TCP", deviceModel: r.device_model, enabled: r.enabled,
      ...portRuntime(r.port),
    }));
    return NextResponse.json({ ports });
  } catch (err) {
    console.error("[ports GET] error", err);
    return NextResponse.json({ error: "Failed to load ports" }, { status: 500 });
  }
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const port = Number(body.port);
  if (!port || port < 1 || port > 65535) return NextResponse.json({ error: "Port must be 1–65535" }, { status: 400 });
  try {
    const row = await addPort({ port, deviceModel: body.deviceModel });
    return NextResponse.json({ ok: true, port: row });
  } catch (err) {
    console.error("[ports POST] error", err);
    return NextResponse.json({ error: "Failed to add port" }, { status: 500 });
  }
}
