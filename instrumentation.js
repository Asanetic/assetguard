// instrumentation.js  (Next.js server-startup hook, project root)
// Starts the background sweeps in the WEB process on boot — independent of device
// traffic — so the Device-Offline sweep, the site-status reconcile, and the
// test-alarm 30-min AUTO-CLOSE all run even when no packets are flowing into the
// TCP listener. ensureOfflineSweep() is idempotent (guarded per process).
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return; // skip the edge runtime
  try {
    const { ensureOfflineSweep } = await import("./app/api/apiUtils/ingest/offlineSweep.js");
    ensureOfflineSweep();
    console.log("[instrumentation] background sweeps started in the web process");
  } catch (e) {
    console.error("[instrumentation] could not start sweeps:", e?.message || e);
  }
}
