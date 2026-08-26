// app/mainapp/lib/useFacets.js
// Client hook: fetch the live entity option lists (regions, clusters, vendors,
// companies, teams, firmwares, sim providers, data plans …) once, cached across
// components for 60s so every dropdown is in sync with the system without each
// component refetching. Always returns arrays (empty until loaded).
"use client";
import { useEffect, useState } from "react";

let CACHE = null;         // { facets, at }
let INFLIGHT = null;      // Promise
const TTL = 60_000;
const SUBS = new Set();

const EMPTY = {
  regions: [], securityRegions: [], clusters: [], vendors: [], counties: [],
  clientCompanies: [], securityCompanies: [], monitoringCompanies: [],
  nocTeams: [], responseTeams: [], firmwares: [], simProviders: [], dataPlans: [],
};

async function fetchFacets(force) {
  if (!force && CACHE && Date.now() - CACHE.at < TTL) return CACHE.facets;
  if (INFLIGHT) return INFLIGHT;
  INFLIGHT = (async () => {
    try {
      const r = await fetch("/api/mainapp/facets", { cache: "no-store" });
      const j = await r.json();
      CACHE = { facets: { ...EMPTY, ...(j.facets || {}) }, at: Date.now() };
    } catch {
      CACHE = { facets: { ...EMPTY }, at: Date.now() };
    } finally { INFLIGHT = null; }
    SUBS.forEach((fn) => { try { fn(CACHE.facets); } catch {} });
    return CACHE.facets;
  })();
  return INFLIGHT;
}

/** Returns the live facets object (arrays). Re-renders when it loads. */
export function useFacets() {
  const [facets, setFacets] = useState(() => (CACHE ? CACHE.facets : EMPTY));
  useEffect(() => {
    let alive = true;
    const sub = (f) => { if (alive) setFacets(f); };
    SUBS.add(sub);
    fetchFacets(false).then((f) => { if (alive) setFacets(f); });
    return () => { alive = false; SUBS.delete(sub); };
  }, []);
  return facets;
}

/** Force a refresh (e.g. after adding a company/site) so pickers pick it up now. */
export function refreshFacets() { return fetchFacets(true); }
