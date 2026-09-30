// app/api/mainapp/devices/[id]/sync-debug/route.js
// TEMPORARY diagnostic — shows exactly why the three command-backed values
// (motion / interval / wake) are or aren't reflecting the confirmed command.
// Open:  /api/mainapp/devices/<device id or device_id>/sync-debug
// It reports, per param: the live + pending config keys, how many active jobs,
// the newest CONFIRMED command it can find, the number parsed from it, the value
// it WOULD write, and whether the DB status strings actually match. Then it runs
// the real reconcile and shows the config before/after. Read-only apart from the
// reconcile write (which is the intended, idempotent fix).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { requireAdmin } from "../../../../apiUtils/authUtils/session.js";
import { query } from "../../../../apiUtils/s_env/db.js";
import { PARAM_OPS, reconcileDevicePending } from "../../../../apiUtils/dataControl/deviceCommands.js";

async function findDevice(idParam) {
  const id = String(idParam || "");
  const { rows } = await query(
    `SELECT id, device_id, imei, config FROM devices WHERE device_id = $1 OR id::text = $1 LIMIT 1`,
    [id]
  );
  return rows[0] || null;
}

export async function GET(request, { params }) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;

  const dev = await findDevice(params?.id);
  if (!dev) return NextResponse.json({ error: "Device not found" }, { status: 404 });

  const cfgBefore = dev.config || {};

  // Every queue row for this device in the last 30 days (verb, status, times).
  let queue = [];
  try {
    const { rows } = await query(
      `SELECT id, command, split_part(command, ',', 1) AS verb, status,
              to_char(created_at,   'YYYY-MM-DD HH24:MI:SS') AS created_at,
              to_char(confirmed_at, 'YYYY-MM-DD HH24:MI:SS') AS confirmed_at,
              to_char(acked_at,     'YYYY-MM-DD HH24:MI:SS') AS acked_at
         FROM device_command_queue
        WHERE device_id = $1 AND created_at > now() - interval '30 days'
        ORDER BY created_at DESC LIMIT 40`,
      [dev.id]
    );
    queue = rows;
  } catch (e) { queue = [{ error: String(e?.message || e) }]; }

  // The distinct status strings actually present (so we can see if "confirmed"
  // in the UI is really 'acked' / something else in the DB).
  let statuses = [];
  try {
    const { rows } = await query(
      `SELECT status, count(*)::int AS n FROM device_command_queue WHERE device_id = $1 GROUP BY status ORDER BY n DESC`,
      [dev.id]
    );
    statuses = rows;
  } catch (e) { statuses = [{ error: String(e?.message || e) }]; }

  // Per-param diagnosis — exactly what the reconcile looks at.
  const params_report = [];
  for (const [key, spec] of Object.entries(PARAM_OPS)) {
    const row = { op: key, verb: spec.word, liveKey: spec.live, pendingKey: spec.pending };
    row.liveValueNow = cfgBefore[spec.live] ?? null;
    row.pendingValueNow = cfgBefore[spec.pending] ?? null;

    try {
      const { rows } = await query(
        `SELECT count(*)::int AS n FROM device_command_queue
          WHERE device_id = $1 AND lower(split_part(command, ',', 1)) = lower($2)
            AND status IN ('pending','sent','acked')`,
        [dev.id, spec.word]
      );
      row.activeJobs = rows[0]?.n ?? 0;
    } catch (e) { row.activeJobsError = String(e?.message || e); }

    try {
      const { rows } = await query(
        `SELECT command,
                to_char(COALESCE(confirmed_at, created_at), 'YYYY-MM-DD HH24:MI:SS') AS at
           FROM device_command_queue
          WHERE device_id = $1 AND lower(split_part(command, ',', 1)) = lower($2)
            AND status = 'confirmed'
          ORDER BY COALESCE(confirmed_at, created_at) DESC LIMIT 1`,
        [dev.id, spec.word]
      );
      const cmd = rows[0]?.command || null;
      row.newestConfirmedCommand = cmd;
      row.newestConfirmedAt = rows[0]?.at || null;
      if (cmd) {
        const m = String(cmd).match(/,\s*(\d+)/);
        const arg = m ? Number(m[1]) : null;
        row.parsedArg = arg;
        row.wouldWriteLive = arg != null ? spec.toStored(arg) : null;
        row.willPromote = row.activeJobs === 0 && arg != null &&
          (Number(row.liveValueNow) !== spec.toStored(arg) || row.pendingValueNow != null);
      } else {
        // No 'confirmed' row — what's the newest row of ANY status for this verb?
        try {
          const { rows: any } = await query(
            `SELECT command, status FROM device_command_queue
              WHERE device_id = $1 AND lower(split_part(command, ',', 1)) = lower($2)
              ORDER BY created_at DESC LIMIT 1`,
            [dev.id, spec.word]
          );
          row.newestAnyStatus = any[0] || null;
        } catch {}
        row.willPromote = false;
      }
    } catch (e) { row.confirmedLookupError = String(e?.message || e); }

    params_report.push(row);
  }

  // Now run the real reconcile and show the config after.
  let reconcileError = null;
  try { await reconcileDevicePending(dev.id); }
  catch (e) { reconcileError = String(e?.message || e); }

  let cfgAfter = {};
  try {
    const { rows } = await query(`SELECT config FROM devices WHERE id = $1`, [dev.id]);
    cfgAfter = rows[0]?.config || {};
  } catch (e) { cfgAfter = { error: String(e?.message || e) }; }

  const pick = (c) => ({
    motion_sensitivity: c.motion_sensitivity ?? null,
    upload_interval_s: c.upload_interval_s ?? null,
    wake_interval_sec: c.wake_interval_sec ?? null,
    pending_motion_sensitivity: c.pending_motion_sensitivity ?? null,
    pending_upload_interval_s: c.pending_upload_interval_s ?? null,
    pending_wake_interval_sec: c.pending_wake_interval_sec ?? null,
  });

  return NextResponse.json({
    device: { id: dev.id, device_id: dev.device_id, imei: dev.imei },
    statusesInQueue: statuses,
    configBefore: pick(cfgBefore),
    params: params_report,
    reconcileError,
    configAfter: pick(cfgAfter),
    changed: JSON.stringify(pick(cfgBefore)) !== JSON.stringify(pick(cfgAfter)),
    recentQueue: queue,
  }, { headers: { "Cache-Control": "no-store" } });
}
