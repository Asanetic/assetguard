// app/api/mainapp/sites/batch/route.js
// POST /api/mainapp/sites/batch   (admin) -> run a batch operation on many sites.
// Body: { ids: number[], op: string, value?: string }
//   op ∈ reg | secreg | clus | ven | secu | noc | status | delete
import { NextResponse } from "next/server";
import { batchUpdateSites, batchDeleteSites } from "../../../apiUtils/dataControl/sites.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

// op -> the column patch it writes
function patchFor(op, value) {
  switch (op) {
    case "reg": return { region: value, dist_region: value };
    case "secreg": return { security_region: value };
    case "clus": return { response_cluster: value };
    case "ven": return { smpms_vendor: value };
    case "secu": return { security_company: value };
    case "noc": return { monitoring_company: value };
    case "status": return { status: value };
    default: return null;
  }
}
const LABEL = {
  reg: "Transferred region", secreg: "Transferred security region", clus: "Transferred response cluster",
  ven: "Transferred SMPMS vendor", secu: "Transferred security company", noc: "Transferred NOC team",
  status: "Changed status", delete: "Deleted sites",
};

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const ids = Array.isArray(body?.ids) ? body.ids.map(Number).filter(Boolean) : [];
  const op = body?.op;
  const value = body?.value;
  if (!ids.length) return NextResponse.json({ error: "No sites selected" }, { status: 400 });
  if (!op) return NextResponse.json({ error: "No operation" }, { status: 400 });

  try {
    let affected = 0;
    if (op === "delete") {
      affected = await batchDeleteSites(ids);
    } else {
      const patch = patchFor(op, value);
      if (!patch) return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
      if (value === undefined || value === null || value === "")
        return NextResponse.json({ error: "A target value is required" }, { status: 400 });
      affected = await batchUpdateSites(ids, patch);
    }
    logAudit(request, {
      action: "Batch site operation", category: "Sites",
      detail: `${LABEL[op] || op}${value ? ` → ${value}` : ""} on ${affected} site${affected === 1 ? "" : "s"}`,
    });
    return NextResponse.json({ affected });
  } catch (err) {
    console.error("[sites batch] error", err);
    return NextResponse.json({ error: "Batch operation failed" }, { status: 500 });
  }
}
