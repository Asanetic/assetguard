// app/api/mainapp/sites/recompute-empty/route.js
// POST /api/mainapp/sites/recompute-empty   (admin)
//
// One-time / maintenance backfill. Finds every site that currently has NO
// devices and recomputes its status the same way the live rule does — an empty
// site drops to Pending (an active maintenance window still wins, exactly as in
// recomputeSiteStatus). ONLY empty sites are touched: sites that still have
// devices are left completely alone, so a manually-set status on a populated
// site is never reclassified by running this.
//
// This exists because the forward fix only flips a site to Pending when its
// LAST device is transferred away or removed. Sites that were already empty but
// still show Live (or any other status) predate that fix and need this one run
// to be corrected. Safe to run repeatedly and safe to leave in place.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { query } from "../../../apiUtils/s_env/db.js";
import { recomputeSiteStatus } from "../../../apiUtils/dataControl/sites.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    // Only device-less sites. A site with even one device is out of scope.
    const { rows } = await query(
      `SELECT s.id, s.code, s.name, s.status
         FROM sites s
        WHERE NOT EXISTS (SELECT 1 FROM devices d WHERE d.site_id = s.id)
        ORDER BY s.id`
    );

    const changed = [];
    for (const s of rows) {
      let next = null;
      try { next = await recomputeSiteStatus(s.id); } catch (e) { console.error("[recompute-empty]", s.id, e?.message || e); }
      if (next && next !== s.status) changed.push({ id: s.id, code: s.code, name: s.name, from: s.status, to: next });
    }

    logAudit(request, {
      action: "Empty sites recomputed", category: "Sites",
      detail: `Checked ${rows.length} device-less site(s); ${changed.length} corrected to Pending`,
    });

    return NextResponse.json({ emptySites: rows.length, changed });
  } catch (err) {
    console.error("[sites recompute-empty] error", err);
    return NextResponse.json({ error: "Recompute failed" }, { status: 500 });
  }
}
