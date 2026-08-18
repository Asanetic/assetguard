// app/api/mainapp/ingest/send-command/route.js
// Downlink control for the IN-APP listener (single-process deployment).
//   GET  -> { connected: [{imei, port, ip, since}] }   (who's connected now)
//   POST { imei, cmd, wrap? } -> writes the command to that device's live socket.
//         imei may be "ALL"; wrap=false (default) sends the bare bytes (e.g.
//         "upgrade#"), wrap=true sends the GL-28 frame [3G*IMEI*LEN*upgrade#].
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { sendToDevice, listConnectedDevices } from "../../../apiUtils/ingest/portManager.js";
import { query } from "../../../apiUtils/s_env/db.js";

// Log each send attempt (best-effort — never blocks or fails the request).
// Powers the dashboard "Commands sent" + "Firmware updates" tiles.
function logCommand(row) {
  query(
    `INSERT INTO command_log (imei, cmd, wrap, targets, sent, status, by_user)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [row.imei, row.cmd, row.wrap, row.targets, row.sent, row.status, row.by]
  ).catch(() => {});
}

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  return NextResponse.json({ connected: listConnectedDevices() });
}

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  let body = {};
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }
  const imei = String(body.imei || "").trim();
  const cmd = String(body.cmd || "").trim();
  const wrap = !!body.wrap;
  if (!imei || !cmd) return NextResponse.json({ error: "imei and cmd are required" }, { status: 400 });
  const r = sendToDevice(imei, cmd, { wrap });
  const status = r.sent > 0 ? "sent" : "failed";
  logCommand({ imei, cmd, wrap, targets: r.targets, sent: r.sent, status, by: gate.user?.sub || gate.user?.email || null });
  if (r.targets === 0) {
    return NextResponse.json({ error: `No connected device for IMEI ${imei}`, connected: listConnectedDevices() }, { status: 404 });
  }
  return NextResponse.json({ ok: true, imei, cmd, wrap, ...r });
}
