// app/api/mainapp/sites/batch/route.js
// POST /api/mainapp/sites/batch   (admin) -> run a batch operation on many sites.
// Body: { ids: number[], op: string, value?: any }
//   op ∈ reg | secreg | clus | ven | secu | noc            (column transfers)
//      | status                                             (Live/Testing/Maintenance → cascades to devices)
//      | arm | disarm                                       (monitoring on/off)
//      | mute        value = { amount, unit }               (downgrade alarms to Low for a window)
//      | sync                                               (push each site's devices' config as commands)
//      | export | pdf                                       (handled client-side / Part 2)
//      | delete
import { NextResponse } from "next/server";
import {
  batchUpdateSites, batchDeleteSites,
  cascadeStatusToDevices, recomputeSiteStatus,
  setSitesArmed, setSitesMute,
  setSitesClientCompany, setSitesMaintenanceWindow,
} from "../../../apiUtils/dataControl/sites.js";
import { listDevices } from "../../../apiUtils/dataControl/devices.js";
import { syncDevicesConfig } from "../../../apiUtils/dataControl/deviceCommands.js";
import { insertLiveAlarm } from "../../../apiUtils/dataControl/alarms.js";
import { notifyAlarmRaised } from "../../../apiUtils/notify/alarmNotify.js";
import { requireAdmin } from "../../../apiUtils/authUtils/session.js";
import { logAudit } from "../../../apiUtils/dataControl/audit.js";

// Alarm types a manual test can simulate → a representative sample value each.
const TEST_TYPES = {
  DISTURBANCE: "test", GEOFENCE_EXIT: "120", CRITICAL_MOTION: "18 km/h",
  CRITICAL_LOW_BATTERY: "8", LOW_BATTERY: "15", HIGH_TEMPERATURE: "64", DEVICE_OFFLINE: "",
};
const ALL_TEST_TYPES = Object.keys(TEST_TYPES);

// Statuses an operator may push to a site (Inactive/Offline are device-derived).
const SITE_SETTABLE = ["Live", "Testing", "Maintenance"];
const newBatchId = () => `SB-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

// Column-transfer ops -> the patch they write.
function patchFor(op, value) {
  switch (op) {
    case "reg": return { region: value, dist_region: value };
    case "secreg": return { security_region: value };
    case "clus": return { response_cluster: value };
    case "ven": return { smpms_vendor: value };
    case "secu": return { security_company: value };
    case "noc": return { monitoring_company: value };
    default: return null;
  }
}
const LABEL = {
  reg: "Transferred region", secreg: "Transferred security region", clus: "Transferred response cluster",
  ven: "Transferred SMPMS vendor", secu: "Transferred security company", noc: "Transferred NOC team",
  status: "Changed status", arm: "Armed monitoring", disarm: "Disarmed monitoring",
  mute: "Muted alarms", sync: "Synced device configurations", delete: "Deleted sites",
  comp: "Transferred client company", maint: "Scheduled maintenance window", testalarm: "Sent test alarm",
};

export async function POST(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  const who = gate.user?.name || gate.user?.email || gate.user?.sub || null;

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
    let extra = "";

    if (op === "delete") {
      affected = await batchDeleteSites(ids);

    } else if (op === "status") {
      const status = String(value || "");
      if (!SITE_SETTABLE.includes(status))
        return NextResponse.json({ error: "Status must be Live, Testing or Maintenance" }, { status: 400 });
      // Site wins: set the site, cascade to its devices, then reconcile from devices.
      affected = await batchUpdateSites(ids, { status });
      const devN = await cascadeStatusToDevices(ids, status);
      for (const id of ids) { try { await recomputeSiteStatus(id); } catch {} }
      extra = ` → ${status} (${devN} device${devN === 1 ? "" : "s"})`;

    } else if (op === "arm" || op === "disarm") {
      affected = await setSitesArmed(ids, op === "arm");

    } else if (op === "mute") {
      const amount = Number(value?.amount) || 0;
      const unit = value?.unit || "hours";
      affected = await setSitesMute(ids, amount, unit);
      extra = amount > 0 ? ` for ${amount} ${unit}` : " (unmuted)";

    } else if (op === "comp") {
      if (!value) return NextResponse.json({ error: "Pick a company" }, { status: 400 });
      affected = await setSitesClientCompany(ids, value);
      extra = ` → ${value}`;

    } else if (op === "maint") {
      const start = value?.start, end = value?.end;
      if (start && end && Date.parse(end) <= Date.parse(start))
        return NextResponse.json({ error: "End must be after start" }, { status: 400 });
      affected = await setSitesMaintenanceWindow(ids, start, end);
      extra = start && end ? ` ${start} → ${end}` : " (cleared)";

    } else if (op === "testalarm") {
      const types = value?.type && value.type !== "all" ? [value.type] : ALL_TEST_TYPES;
      const wantDevice = value?.deviceId && value.deviceId !== "all" ? String(value.deviceId) : null;
      let raised = 0, devN = 0;
      for (const siteId of ids) {
        const devs = await listDevices({ site_id: siteId }).catch(() => []);
        const targets = wantDevice ? devs.filter((d) => String(d.id) === wantDevice) : devs;
        for (const d of targets) {
          devN++;
          for (const ty of types) {
            try {
              const row = await insertLiveAlarm({
                alarmType: ty, value: TEST_TYPES[ty] ?? "",
                deviceIdText: d.device_id || d.imei, site: d.site || null, serial: d.imei || null,
                lat: d.site_lat ?? null, lng: d.site_lng ?? null,
              });
              if (row) { await notifyAlarmRaised(row, { siteId, forceTest: true }); raised++; }
            } catch (e) { console.error("[testalarm] raise error:", e?.message || e); }
          }
        }
      }
      affected = raised;
      extra = ` — ${raised} test alarm(s) across ${devN} device(s)`;

    } else if (op === "sync") {
      const batchId = newBatchId();
      let queued = 0, siteN = 0;
      for (const id of ids) {
        const devs = await listDevices({ site_id: id }).catch(() => []);
        if (!devs.length) continue;
        const r = await syncDevicesConfig(devs.map((d) => d.id), { batchId, createdBy: who });
        queued += r.queued; siteN++;
      }
      affected = siteN;
      extra = ` — queued ${queued} config command(s) across ${siteN} site(s), IMEI excluded`;

    } else {
      const patch = patchFor(op, value);
      if (!patch) return NextResponse.json({ error: "Unknown operation" }, { status: 400 });
      if (value === undefined || value === null || value === "")
        return NextResponse.json({ error: "A target value is required" }, { status: 400 });
      affected = await batchUpdateSites(ids, patch);
      extra = ` → ${value}`;
    }

    logAudit(request, {
      action: "Batch site operation", category: "Sites",
      detail: `${LABEL[op] || op}${extra} on ${affected} site${affected === 1 ? "" : "s"}`,
    });
    return NextResponse.json({ affected });
  } catch (err) {
    console.error("[sites batch] error", err);
    return NextResponse.json({ error: "Batch operation failed" }, { status: 500 });
  }
}
