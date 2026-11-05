// app/api/mainapp/export/xlsx/route.js
// POST /api/mainapp/export/xlsx   (signed in) -> a branded .xlsx download
//
// The one place spreadsheets are generated, so every export in the app carries
// the company branding. Send either the CSV the client already builds, or
// structured sheets:
//   { filename, csv, sheetName?, title? }
//   { filename, sheets: [{ name, title?, header?, rows }] }
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { buildBrandedXlsx, parseCsv } from "../../../apiUtils/export/brandedWorkbook.js";

function safeName(n) {
  return String(n || "export")
    .replace(/\.xlsx$/i, "")
    .replace(/[^A-Za-z0-9_\-. ]+/g, "_")
    .trim()
    .slice(0, 120) || "export";
}

export async function POST(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Expected JSON" }, { status: 400 }); }

  let sheets = Array.isArray(body.sheets) ? body.sheets : null;
  if (!sheets) {
    if (typeof body.csv !== "string") {
      return NextResponse.json({ error: "csv or sheets is required" }, { status: 400 });
    }
    sheets = [{ name: body.sheetName || "Export", title: body.title || "", rows: parseCsv(body.csv) }];
  }

  try {
    const buf = await buildBrandedXlsx({ sheets });
    const filename = `${safeName(body.filename)}.xlsx`;
    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("[export/xlsx] error", err);
    return NextResponse.json({ error: "Failed to build spreadsheet" }, { status: 500 });
  }
}
