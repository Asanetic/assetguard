// app/api/apiUtils/ingest/batteryModel.js
// -----------------------------------------------------------------------------
// Software fuel gauge for the tracker's LiMnO2 (CR17450) cell — turns raw terminal
// voltage into a smooth, phone-like battery %. Three stages:
//
//   1) CURVE   voltage -> % via a discharge look-up table (1% resolution). LiMnO2
//              has a long flat plateau (~2.88–3.05 V holds most of the charge) then
//              a steep knee. The plateau reads a flat ~95–100% so tens of mV of
//              jitter don't move the number; the knee (2.86 -> 2.40 V) carries the
//              real, well-resolved countdown. The cell KEEPS WORKING down to ~2.4 V,
//              so 2.40 V ≈ 1% and 0% only at 2.35 V (not 2.50 V as before).
//
//   2) SMOOTH  average recent readings instead of trusting one packet. Settling
//              only pulls voltage DOWN (a reading caught before the cell recovers
//              from the previous transmit reads low), and the odd packet spikes
//              high — so we take the MEDIAN OF THE UPPER HALF of the recent window:
//              rejects both post-transmit dips and lone spikes.
//
//   3) GAUGE   a primary (non-rechargeable) cell never charges, so the displayed %
//              must never climb. fuelGauge() holds or EASES DOWN toward the curve
//              value and refuses to rise — which is what kills "15% then 20% then
//              15% again". A genuine battery SWAP (a large, clear upward jump) is
//              the one allowed reset.
//
// Tune the LUT / knobs freely from real fleet data; the logic doesn't change.
// -----------------------------------------------------------------------------

// [voltage, percent] — DESCENDING by voltage. This is the battery curve supplied for
// this cell type. Anchors 3.00–2.60 V are exactly as given; empty (0%) is at 2.40 V and
// ANYTHING BELOW 2.40 V is also 0% (voltageToPercent clamps at V_EMPTY).
export const BATTERY_LUT = [
  [3.00, 100], [2.92, 99], [2.90, 98], [2.88, 95], [2.86, 90], [2.84, 82],
  [2.82, 73],  [2.80, 63], [2.78, 53], [2.75, 42], [2.72, 33], [2.68, 23],
  [2.64, 15],  [2.60, 9],  [2.55, 6],  [2.50, 4],  [2.45, 2],  [2.40, 0],
];
export const V_FULL = BATTERY_LUT[0][0];                       // 3.00
export const V_EMPTY = BATTERY_LUT[BATTERY_LUT.length - 1][0]; // 2.35

// Map a single voltage -> % (0–100), linear-interpolated between anchors.
// 1% resolution (no 5% snapping). Returns null for a non-finite input.
export function voltageToPercent(v) {
  const V = Number(v);
  if (!Number.isFinite(V)) return null;
  if (V >= V_FULL) return 100;
  if (V <= V_EMPTY) return 0;
  for (let i = 0; i < BATTERY_LUT.length - 1; i++) {
    const [vh, ph] = BATTERY_LUT[i];       // higher voltage
    const [vl, pl] = BATTERY_LUT[i + 1];   // lower voltage
    if (V <= vh && V >= vl) {
      const pct = pl + ((V - vl) / (vh - vl)) * (ph - pl);
      return Math.round(pct);              // 1% resolution
    }
  }
  return 0;
}

// Robust "resting" voltage from the current reading + a recent window.
// Settling only lowers voltage, so the truth sits near the TOP of the window — but
// a single spike shouldn't win. Median of the upper half rejects both dips & spikes.
export function smoothVoltage(currentV, recentVoltages = []) {
  const vals = [Number(currentV), ...(recentVoltages || []).map(Number)]
    .filter((x) => Number.isFinite(x) && x > 0)
    .sort((a, b) => a - b);
  if (!vals.length) return null;
  const upper = vals.slice(Math.floor(vals.length / 2)); // top ~50%
  return upper[Math.floor(upper.length / 2)];            // its median
}

/**
 * The software fuel gauge. Returns { percent, settledV }.
 *  - currentV        latest raw voltage
 *  - recentVoltages  recent raw readings (any order)
 *  - prevPercent     the last displayed % for this device (device.battery), or null
 *  - opts.swapJump   % upward jump that counts as a battery swap (default 8)
 *  - opts.alpha      ease-down smoothing factor 0..1 (default 0.35 — gentle)
 */
export function fuelGauge(currentV, recentVoltages = [], prevPercent = null, opts = {}) {
  const settledV = smoothVoltage(currentV, recentVoltages);
  if (settledV == null) return { percent: prevPercent ?? null, settledV: null };
  const raw = voltageToPercent(settledV);
  if (raw == null) return { percent: prevPercent ?? null, settledV };

  const prev = Number.isFinite(Number(prevPercent)) ? Number(prevPercent) : null;
  if (prev == null) return { percent: raw, settledV };          // first ever reading

  const swapJump = Number(opts.swapJump ?? 8);
  const alpha = Number(opts.alpha ?? 0.35);
  const warmup = Number(opts.warmup ?? 4);
  // A battery swap shows as a clear jump up to a fresh-cell voltage. This cell operates
  // ~2.3–2.55 V under load, so "fresh" is >=2.55 V here (not the old 2.86 V plateau).
  const vSwap = Number(opts.vSwap ?? 2.55);

  // Warm-up: until we have a real window of history the smoothed value can still be
  // settling, so let the reading track the curve freely (up or down). Once enough
  // history exists the monotonic rule below locks in.
  const history = (recentVoltages || []).filter((x) => Number.isFinite(Number(x)) && Number(x) > 0).length;
  if (history < warmup) return { percent: raw, settledV };

  // Battery swapped? A clear jump up AND a fresh-cell resting voltage (plateau).
  if (raw >= prev + swapJump && settledV >= vSwap) return { percent: raw, settledV };

  // Otherwise the gauge only holds or eases DOWN (a primary cell never recharges).
  const target = Math.min(prev, raw);
  if (target >= prev) return { percent: prev, settledV };        // hold — never rise
  const eased = prev + alpha * (target - prev);                  // between target and prev
  const next = Math.max(target, Math.floor(eased));              // ≥1 step down, not past target
  return { percent: next, settledV };
}

// Back-compat: previous callers used settledPercent (max-over-window -> nearest 5%).
// Kept as a thin wrapper over the new smoothing (now 1% and median-of-upper-half).
export function settledPercent(currentV, recentVoltages = []) {
  const settledV = smoothVoltage(currentV, recentVoltages);
  if (settledV == null) return { settledV: null, percent: null };
  return { settledV, percent: voltageToPercent(settledV) };
}

// Coarse status band from % (for colour/labels).
export function batteryBand(pct) {
  if (pct == null) return "unknown";
  if (pct >= 60) return "good";
  if (pct >= 30) return "monitor";
  if (pct >= 12) return "low";
  return "critical";
}
