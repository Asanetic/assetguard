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

  // OPEN THE DEVICE TCP LISTENERS ON BOOT — in the INGEST instance only.
  //
  // Nothing used to open the listeners automatically: they were reopened only
  // when an admin loaded the Ports page (ports/route.js → syncFromDb). So after
  // any restart, port 9000 stayed CLOSED and the trackers could not connect
  // until someone happened to open that page — ingest silently went dark.
  //
  // Now the ingest instance binds the enabled ports as soon as it boots. Only
  // ONE instance should (a TCP port binds once), so this is gated to the ingest
  // process — the one started on PORT 3000 (pm2 name gps-3000). Set
  // OPEN_LISTENERS=1 to force it on. The web instance (3010) leaves the sockets
  // alone, so restarting the web never drops device ingest.
  const isIngest = process.env.OPEN_LISTENERS === "1" || process.env.PORT === "3000";
  if (isIngest) {
    try {
      const { syncFromDb } = await import("./app/api/apiUtils/ingest/portManager.js");
      await syncFromDb();
      console.log("[instrumentation] device TCP listeners opened on boot (ingest instance)");
    } catch (e) {
      console.error("[instrumentation] could not open device listeners:", e?.message || e);
    }
  }
}
