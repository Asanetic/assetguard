// app/api/apiUtils/dataControl/geoUsage.js
// -----------------------------------------------------------------------------
// Persistent request counter for the paid/trial geolocation backups (currently
// Unwired Labs). The count survives app restarts (it lives in the geo_usage
// table, not in memory) so a 50-request free trial is never overrun across
// redeploys. reserveCall() atomically claims one slot ONLY while under the cap,
// so two packets arriving at once can't both slip past the limit.
//
// A "period" is either "total" (a lifetime trial cap) or a calendar month
// "YYYY-MM" (a cap that resets each month). See app_config 'geo'.updateCapWindow.
// -----------------------------------------------------------------------------

import { query } from "../s_env/db.js";

/** Current period bucket for a cap window. */
export function periodKey(window) {
  if (window === "month") {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
  }
  if (window === "day") {
    const d = new Date();
    return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
  }
  return "total";
}

/** Read the current usage for a provider in its active period. */
export async function getUsage(provider, window = "total") {
  const period = periodKey(window);
  try {
    const { rows } = await query(
      `SELECT count FROM geo_usage WHERE provider = $1 AND period = $2`,
      [provider, period]
    );
    return { provider, period, count: rows[0] ? Number(rows[0].count) : 0 };
  } catch (e) {
    // Table not migrated yet — report zero rather than throwing into a maps page.
    console.warn("[geoUsage] getUsage failed:", e?.message || e);
    return { provider, period, count: 0, error: "geo_usage table missing (run db/geo_provider.sql)" };
  }
}

/**
 * Atomically reserve one call slot if still under `cap`. Returns
 *   { allowed, count, period }
 * where `count` is the value AFTER a successful reserve, or the current value
 * when blocked. A cap of 0 blocks everything; a negative/NaN cap is treated as 0.
 */
export async function reserveCall(provider, window, cap) {
  const period = periodKey(window);
  const capN = Math.max(0, Math.round(Number(cap) || 0));
  try {
    // Ensure the row exists (no-op if present) so the conditional UPDATE can hit it.
    await query(
      `INSERT INTO geo_usage (provider, period, count) VALUES ($1, $2, 0)
       ON CONFLICT (provider, period) DO NOTHING`,
      [provider, period]
    );
    // The WHERE count < cap makes the increment atomic under concurrency: only a
    // row still under the cap is updated, and RETURNING tells us it succeeded.
    const { rows } = await query(
      `UPDATE geo_usage SET count = count + 1, updated_at = now()
       WHERE provider = $1 AND period = $2 AND count < $3
       RETURNING count`,
      [provider, period, capN]
    );
    if (rows[0]) return { allowed: true, count: Number(rows[0].count), period };
    const cur = await getUsage(provider, window);
    return { allowed: false, count: cur.count, period };
  } catch (e) {
    // If the counter store is unavailable, fail CLOSED (don't spend the quota).
    console.warn("[geoUsage] reserveCall failed:", e?.message || e);
    return { allowed: false, count: 0, period, error: "geo_usage unavailable" };
  }
}

/** Admin action: reset a provider's counter for its current period back to 0. */
export async function resetUsage(provider, window = "total") {
  const period = periodKey(window);
  await query(
    `INSERT INTO geo_usage (provider, period, count, updated_at) VALUES ($1, $2, 0, now())
     ON CONFLICT (provider, period) DO UPDATE SET count = 0, updated_at = now()`,
    [provider, period]
  );
  return { provider, period, count: 0 };
}
