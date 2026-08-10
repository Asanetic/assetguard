// app/api/mainapp/devices/batch/route.js
// POST /api/mainapp/devices/batch   (admin) -> run a batch operation on many devices.
// Body: { ids: number[], op: string, value?: string }
//   op ∈ status | fw | resite | del
import { NextResponse } from "next/server";
import { batchUpdateDevices, batchDeleteDevices, reassignDevices } from "../../../apiUtils/dataControl/devices.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

const LABEL = { status: "Changed status", fw: "Updated firmware", resite: "Reassigned site", del: "Decommissioned devices" };

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
  const op = body?.op;
  const value = body?.value;
  if (!ids.length) return NextResponse.json({ error: "No devices selected" }, { status: 400 });

  try {
    let affected = 0;
    if (op === "del") affected = await batchDeleteDevices(ids);
    else if (op === "resite") affected = await reassignDevices(ids, value);
    else if (op === "status") affected = await batchUpdateDevices(ids, { status: value });
    else if (op === "fw") affected = await batchUpdateDevices(ids, { firmware: value });
    else return NextResponse.json({ error: `Unknown operation: ${op}` }, { status: 400 });

    logAudit(request, {
      action: LABEL[op] || "Batch device op", category: "Devices",
      detail: `${LABEL[op] || op}${value ? ` → ${value}` : ""} on ${affected} device${affected === 1 ? "" : "s"}`,
    });
    return NextResponse.json({ affected });
  } catch (err) {
    console.error("[devices batch] error", err);
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 400 });
  }
}
