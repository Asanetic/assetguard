// app/api/mainapp/admin/installation/route.js
// GET /api/mainapp/admin/installation   (admin) -> the Installation page feed
//
// One call, polled by the page every few seconds, returning everything the
// admin Installation view draws:
//   technicians[] — live handset positions (the map)
//   started[]     — open install sessions, each with its stage + per-device
//                   "is it on / GPS fix / satellites" status
//   completed[]   — finished installs from the permanent work log, with times
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import {
  listTechnicianPositions,
  listActiveJobs,
  deviceInstallStatus,
} from "../../../apiUtils/dataControl/installation.js";

// The LIVE feed only: technician positions (the map) + jobs in progress
// (install AND maintenance), each with its stage and per-device GPS. This is the
// bit polled every few seconds. The completed history — which grows into the
// thousands — is a separate, searchable, paginated endpoint (./completed).
export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  try {
    const [technicians, active] = await Promise.all([
      listTechnicianPositions({ minutes: 120 }),
      listActiveJobs(),
    ]);

    // Per-device GPS/on status for every tracker across the active jobs, in one
    // query, then attached to each job.
    const allIds = [];
    for (const s of active) {
      const ids = Array.isArray(s.device_ids) && s.device_ids.length ? s.device_ids : [];
      for (const id of ids) allIds.push(id);
    }
    const statusMap = await deviceInstallStatus(allIds);

    const activeOut = active.map((s) => {
      const ids = Array.isArray(s.device_ids) && s.device_ids.length ? s.device_ids : [];
      return {
        ...s,
        devices: ids.map((id) => statusMap[id] || { device_id: id, on: false, has_fix: false, satellites: null }),
      };
    });

    return NextResponse.json({
      technicians,
      active: activeOut,
      at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[admin/installation] error", err);
    return NextResponse.json({ error: "Failed to load installation feed" }, { status: 500 });
  }
}
