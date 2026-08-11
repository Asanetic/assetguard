// app/api/mainapp/ports/raw/route.js
// GET /api/mainapp/ports/raw?q=&port=&device=&from=&to=&limit=
//   -> raw frames (exactly as trackers sent them) + total count
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { searchRaw, countRaw } from "../../../apiUtils/dataControl/rawLogs.js";

export async function GET(request) {
  if (!getAuth(request)) return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  const { searchParams } = new URL(request.url);
  try {
    const [rows, total] = await Promise.all([
      searchRaw({
        q: searchParams.get("q") || null,
        port: searchParams.get("port") || null,
        device: searchParams.get("device") || null,
        from: searchParams.get("from") || null,
        to: searchParams.get("to") || null,
        limit: Number(searchParams.get("limit")) || 300,
      }),
      countRaw(),
    ]);
    return NextResponse.json({ raw: rows, count: rows.length, total });
  } catch (err) {
    console.error("[ports raw] error", err);
    return NextResponse.json({ raw: [], count: 0, total: 0 });
  }
}
