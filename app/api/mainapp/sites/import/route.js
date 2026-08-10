// app/api/mainapp/sites/import/route.js
// POST /api/mainapp/sites/import  (admin)
// Body: { rows: [{ code, name, smpms, dist, county, lat, lng, cluster, sec }, ...] }
// Upserts each row by site code. Nothing runs until the client confirms.
import { NextResponse } from "next/server";
import { importSites } from "../../../apiUtils/dataControl/sites.js";
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

  // Guard against oversized uploads.
  if (rows.length > 5000)
    return NextResponse.json({ error: "Too many rows (max 5000)" }, { status: 413 });

  // Reject the whole batch if any row is missing a required field, so the
  // admin's preview count always matches what actually lands in the table.
  const bad = rows.findIndex(
    (r) => !String(r?.code || "").trim() || !String(r?.name || "").trim()
  );
  if (bad !== -1)
    return NextResponse.json(
      { error: `Row ${bad + 1} is missing Site ID or Site Name` },
      { status: 422 }
    );

  try {
    const result = await importSites(rows);
    logAudit(request, {
      action: "Sites imported", category: "Sites",
      detail: `Imported ${rows.length} site${rows.length === 1 ? "" : "s"} from spreadsheet`,
    });
    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("[sites import] error", err);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
