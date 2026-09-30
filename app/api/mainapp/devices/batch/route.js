// app/api/mainapp/devices/batch/route.js
// POST /api/mainapp/devices/batch   (admin) -> run a batch operation on many devices.
// Body: { ids: number[], op: string, value?: string }
//   op ∈ status | fw | resite | del
import { NextResponse } from "next/server";
import {
  batchUpdateDevices, batchDeleteDevices, reassignDevices,
  setDevicesArmed, setDevicesMute, setDevicesConfig, siteIdsForDevices,
} from "../../../apiUtils/dataControl/devices.js";
import { recomputeSitesForDevices, recomputeSites } from "../../../apiUtils/dataControl/sites.js";
import { planToMb } from "../../../apiUtils/dataControl/dataUsage.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

const LABEL = {
  status: "Changed status", fw: "Updated firmware", resite: "Reassigned site", del: "Decommissioned devices",
  arm: "Armed monitoring", dis: "Disarmed monitoring", mute: "Muted alerts",
  dbp: "Assigned data bundle plan", simp: "Assigned SIM provider", dreset: "Reset data bundle",
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
  if (!ids.length) return NextResponse.json({ error: "No devices selected" }, { status: 400 });

  try {
    let affected = 0;
    let extra = value ? ` → ${value}` : "";

    // Capture the sites these devices sit in BEFORE a move or a removal, so a
    // site that loses its last device can be rolled back to Pending afterwards.
    // (After the op the devices no longer point at the old site — a transfer
    // repoints them and a delete removes them — so it has to be read up front.)
    let priorSiteIds = [];
    if (op === "resite" || op === "del") {
      try { priorSiteIds = await siteIdsForDevices(ids); } catch {}
    }

    if (op === "del") affected = await batchDeleteDevices(ids);
    else if (op === "resite") affected = await reassignDevices(ids, value, body.orientation);
    else if (op === "status") affected = await batchUpdateDevices(ids, { status: value });
    else if (op === "fw") affected = await batchUpdateDevices(ids, { firmware: value });
    else if (op === "arm") { affected = await setDevicesArmed(ids, true); extra = ""; }
    else if (op === "dis") { affected = await setDevicesArmed(ids, false); extra = ""; }
    else if (op === "mute") {
      const amount = Number(value?.amount) || 0;
      const unit = value?.unit || "hours";
      affected = await setDevicesMute(ids, amount, unit);
      extra = amount > 0 ? ` for ${amount} ${unit}` : " (unmuted)";
    }
    else if (op === "dbp") {
      // value can be { amount, unit(MB|GB), period(monthly|annually) } or a legacy label.
      let plan, mb, period;
      if (value && typeof value === "object") {
        const amt = Number(value.amount) || 0;
        const unit = /gb/i.test(value.unit) ? "GB" : "MB";
        mb = unit === "GB" ? amt * 1024 : amt;
        mb = Math.max(1, Math.min(10240, Math.round(mb)));   // clamp 1 MB … 10 GB
        period = /annual|year/i.test(value.period) ? "annually" : "monthly";
        plan = `${amt} ${unit} ${period}`;
      } else {
        plan = String(value || "");
        mb = planToMb(plan) || null;
        period = /annual|year/i.test(plan) ? "annually" : "monthly";
      }
      // Assigning a plan sets the bundle size + period and starts the counter fresh.
      affected = await setDevicesConfig(ids, { data_plan: plan, data_bundle_mb: mb || null, data_bundle_period: period, data_reset_at: new Date().toISOString() });
      extra = ` → ${plan}`;
    }
    else if (op === "dreset") { affected = await setDevicesConfig(ids, { data_reset_at: new Date().toISOString() }); }
    else if (op === "simp") { affected = await setDevicesConfig(ids, { sim_provider: String(value || "") }); }
    else return NextResponse.json({ error: `Unknown operation: ${op}` }, { status: 400 });

    // Roll a status/site change up to the affected site(s).
    if (op === "status" || op === "resite") { try { await recomputeSitesForDevices(ids); } catch {} }
    // Roll up the sites the devices LEFT (transfer) or were removed from (delete):
    // any that are now empty drop back to Pending.
    if (op === "resite" || op === "del") { try { await recomputeSites(priorSiteIds); } catch {} }

    logAudit(request, {
      action: LABEL[op] || "Batch device op", category: "Devices",
      detail: `${LABEL[op] || op}${extra} on ${affected} device${affected === 1 ? "" : "s"}`,
    });
    return NextResponse.json({ affected });
  } catch (err) {
    console.error("[devices batch] error", err);
    return NextResponse.json({ error: err.message || "Operation failed" }, { status: 400 });
  }
}
