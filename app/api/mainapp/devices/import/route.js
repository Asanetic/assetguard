// app/api/mainapp/devices/import/route.js
// POST /api/mainapp/devices/import  (admin)
// Body: { rows: [{ site, imei, ori }, ...] }  — the three template columns only.
// Upserts each device by IMEI. Nothing runs until the client confirms.
import { NextResponse } from "next/server";
import { importDevices } from "../../../apiUtils/dataControl/devices.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const rows = Array.isArray(body?.rows) ? body.rows : null;
  if (!rows || !rows.length)
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  if (rows.length > 5000)
    return NextResponse.json({ error: "Too many rows (max 5000)" }, { status: 413 });

  // Every row needs a site code and an IMEI.
  const bad = rows.findIndex((r) => !String(r?.site || "").trim() || !String(r?.imei || "").trim());
  if (bad !== -1)
    return NextResponse.json({ error: `Row ${bad + 1} is missing a Site code or IMEI` }, { status: 422 });

  try {
    const result = await importDevices(rows);
    logAudit(request, {
      action: "Devices imported", category: "Devices",
      detail: `Imported ${rows.length} device${rows.length === 1 ? "" : "s"} from spreadsheet`,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[devices import] error", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
