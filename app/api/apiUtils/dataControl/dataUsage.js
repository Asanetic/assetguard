// app/api/apiUtils/dataControl/dataUsage.js
// -----------------------------------------------------------------------------
// Data-bundle usage ESTIMATE (until the Safaricom/Airtel APIs are wired). We can't
// query the carrier, so we approximate the bundle a device has consumed from the
// traffic it actually generated:
//   used = uplink (its telemetry frame bytes) + downlink (command bytes sent to it)
//          + a per-packet overhead (TCP/IP headers), counted since the last reset.
// The assigned bundle comes from config.data_bundle_mb (or is parsed from the plan
// label, e.g. "5GB monthly"). "Reset data bundle" just sets config.data_reset_at=now.
// Everything is an estimate and clearly labelled as such in the UI.
// -----------------------------------------------------------------------------
import { query } from "../s_env/db.js";

const OVERHEAD_B = 40;   // ~IP+TCP header bytes per packet
const DEFAULT_UP_B = 90; // assume ~90 B for a frame whose raw wasn't stored
const MB = 1024 * 1024;
const r2 = (n) => Math.round(n * 100) / 100;

/** Assigned bundle in MB from an explicit value or a plan label ("5GB", "500 MB"). */
export function planToMb(plan, explicitMb) {
  const e = Number(explicitMb);
  if (Number.isFinite(e) && e > 0) return e;
  const m = String(plan || "").match(/([\d.]+)\s*(gb|mb)/i);
  if (!m) return 0;
  const n = parseFloat(m[1]);
  return /gb/i.test(m[2]) ? n * 1024 : n;
}

/**
 * Estimate a device's data usage since its last reset.
 * @param {{id:number, imei?:string, config?:object}} device
 * @returns {Promise<{since,assigned_mb,used_mb,remaining_mb,pct,up_mb,down_mb,packets,estimate:true}>}
 */
export async function deviceDataUsage(device) {
  if (!device?.id) return null;
  const cfg = device.config || {};
  const since = cfg.data_reset_at ? String(cfg.data_reset_at) : null;

  const [up, down] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS n,
              COALESCE(SUM(COALESCE(octet_length(raw), $2)), 0)::bigint AS bytes
         FROM device_telemetry
        WHERE device_id = $1 AND ($3::timestamptz IS NULL OR received_at >= $3::timestamptz)`,
      [device.id, DEFAULT_UP_B, since]
    ).then((r) => r.rows[0]).catch(() => ({ n: 0, bytes: 0 })),
    query(
      `SELECT COUNT(*)::int AS n,
              COALESCE(SUM(octet_length('*HQ,' || imei || ',' || command || '#')), 0)::bigint AS bytes
         FROM device_command_queue
        WHERE device_id = $1 AND sent_at IS NOT NULL
          AND ($2::timestamptz IS NULL OR sent_at >= $2::timestamptz)`,
      [device.id, since]
    ).then((r) => r.rows[0]).catch(() => ({ n: 0, bytes: 0 })),
  ]);

  const upB = Number(up.bytes) + Number(up.n) * OVERHEAD_B;
  const dnB = Number(down.bytes) + Number(down.n) * OVERHEAD_B;
  const usedMb = (upB + dnB) / MB;
  const assignedMb = planToMb(cfg.data_plan, cfg.data_bundle_mb);
  const remainingMb = assignedMb > 0 ? Math.max(0, assignedMb - usedMb) : null;

  return {
    since,
    assigned_mb: assignedMb > 0 ? assignedMb : null,
    used_mb: r2(usedMb),
    remaining_mb: remainingMb != null ? r2(remainingMb) : null,
    pct: assignedMb > 0 ? Math.min(100, Math.round((usedMb / assignedMb) * 1000) / 10) : null,
    up_mb: r2(upB / MB),
    down_mb: r2(dnB / MB),
    packets: Number(up.n) + Number(down.n),
    estimate: true,
  };
}

/**
 * Roll each device's usage counter forward when its bundle period has elapsed, so a
 * monthly/annually bundle auto-renews (starts fresh) without a manual reset. Run on
 * the periodic sweep. Returns how many devices were renewed.
 */
export async function renewDataBundles() {
  try {
    const { rowCount } = await query(
      `UPDATE devices
          SET config = config || jsonb_build_object('data_reset_at', now()::text)
        WHERE NULLIF(config->>'data_bundle_period','') IS NOT NULL
          AND NULLIF(config->>'data_reset_at','') IS NOT NULL
          AND (config->>'data_reset_at')::timestamptz <
              now() - CASE WHEN config->>'data_bundle_period' = 'annually'
                           THEN interval '1 year' ELSE interval '1 month' END`
    );
    return rowCount;
  } catch (e) { console.error("[renewDataBundles]", e?.message || e); return 0; }
}

/** MB → a short human string (e.g. 250 MB, 1.8 GB). */
export function fmtMb(mb) {
  if (mb == null) return "—";
  return mb >= 1024 ? `${r2(mb / 1024)} GB` : `${Math.round(mb)} MB`;
}
