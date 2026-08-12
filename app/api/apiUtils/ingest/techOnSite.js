// app/api/apiUtils/ingest/techOnSite.js
// -----------------------------------------------------------------------------
// "Is a technician on site right now?" — the single hook the alarm engine consults
// before raising a DISTURBANCE. When it returns true, that one alarm is downgraded
// to the Low "Disturbance — tech on site" tier (every other alarm is untouched).
//
// PER PRODUCT DECISION: the real signal will come from the site ACCESS-CONTROL
// system in a FUTURE integration (a tech badging in / a booked work window). Until
// that lands this hook is intentionally INERT — it always returns false, so
// behaviour is unchanged. Keeping the hook here (rather than a scattered TODO)
// means wiring it later is a one-file change: replace the body with a lookup
// against the access-control / bookings source, keyed by siteId + time.
// -----------------------------------------------------------------------------

/**
 * @param {number|string|null} siteId  the device's site id (null for unregistered)
 * @param {Date} [at]                  the instant to check (defaults to now)
 * @returns {Promise<boolean>}         true if a technician is on site
 */
export async function isTechOnSite(siteId, at = new Date()) {
  void siteId; void at;
  // FUTURE: consult the access-control / bookings system, e.g.
  //   return await accessControl.hasActiveTechVisit(siteId, at);
  return false;
}
