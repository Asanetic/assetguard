// app/api/mainapp/track/directions/route.js
// GET /api/mainapp/track/directions?from=lat,lng&to=lat,lng
//   -> { distance_text, distance_m, duration_text, duration_s, polyline, steps: [] }
//
// WHY THIS EXISTS: the web calls Google's DirectionsService straight from the
// browser, because the Maps JavaScript SDK includes one. The Android Maps SDK
// does NOT — there is no DirectionsService on Android at all. The only way to
// get a route there is the Directions WEB service, and that service refuses an
// Android-restricted API key (it wants an IP-restricted or unrestricted one).
// Handing the app an unrestricted key so it could call Google directly would
// put a billable key in an APK anyone can unzip.
//
// So the server calls it, with the key it already holds for `maps-config`, and
// the app never sees a key at all.
//
// COST: the app re-routes while navigating, throttled to one call every 4
// seconds — the same cadence the web uses. That is ~15 Directions requests per
// minute per navigating user, and Directions is billed per request. Worth
// knowing before several responders drive to an incident at once.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAuth } from "../../../apiUtils/authUtils/session.js";
import { getMapsConfig } from "../../../apiUtils/dataControl/appConfig.js";

/** "-1.2673,36.8110" -> "-1.2673,36.8110", or null if it is not a coordinate pair. */
function coordinate(raw) {
  const parts = String(raw || "").split(",");
  if (parts.length !== 2) return null;
  const lat = Number(parts[0]);
  const lng = Number(parts[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  // Rebuilt from the parsed numbers rather than passed through: this string
  // goes into a URL we call, and echoing user input into an outbound request
  // is how an SSRF starts.
  return `${lat},${lng}`;
}

/** Google puts markup in `html_instructions` — the phone speaks plain text. */
function stripHtml(text) {
  return String(text || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

export async function GET(request) {
  if (!getAuth(request))
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = coordinate(searchParams.get("from"));
  const to = coordinate(searchParams.get("to"));
  if (!from || !to) {
    return NextResponse.json(
      { error: "from and to must both be lat,lng" },
      { status: 422 }
    );
  }

  let key;
  try {
    const config = await getMapsConfig();
    key = config?.apiKey;
  } catch (err) {
    console.error("[directions] maps config", err);
  }
  if (!key) {
    return NextResponse.json(
      { error: "No Google Maps key configured — set one in Admin → Google Maps.", code: "NO_MAPS_KEY" },
      { status: 503 }
    );
  }

  const url =
    "https://maps.googleapis.com/maps/api/directions/json" +
    `?origin=${encodeURIComponent(from)}` +
    `&destination=${encodeURIComponent(to)}` +
    "&mode=driving" +
    `&key=${encodeURIComponent(key)}`;

  let payload;
  try {
    const response = await fetch(url, { cache: "no-store" });
    payload = await response.json();
  } catch (err) {
    console.error("[directions] upstream", err);
    return NextResponse.json({ error: "Could not reach Google Directions." }, { status: 502 });
  }

  // Google answers 200 with a status field; REQUEST_DENIED usually means the
  // Directions API is not enabled on the project, or the key is restricted in a
  // way that excludes web services. Said plainly, because "no route" and "the
  // API is switched off" need different actions.
  if (payload?.status !== "OK") {
    const status = payload?.status || "UNKNOWN";
    const detail = payload?.error_message ? ` — ${payload.error_message}` : "";
    const httpStatus = status === "ZERO_RESULTS" ? 404 : 502;
    return NextResponse.json(
      { error: `Directions unavailable (${status})${detail}`, code: status },
      { status: httpStatus }
    );
  }

  const route = payload.routes?.[0];
  const leg = route?.legs?.[0];
  if (!leg) return NextResponse.json({ error: "No route found" }, { status: 404 });

  return NextResponse.json({
    distance_text: leg.distance?.text || null,
    distance_m: leg.distance?.value ?? null,
    duration_text: leg.duration?.text || null,
    duration_s: leg.duration?.value ?? null,
    // The encoded overview polyline — the app decodes and draws it.
    polyline: route.overview_polyline?.points || null,
    steps: (leg.steps || []).map((step) => ({
      instruction: stripHtml(step.html_instructions),
      distance_text: step.distance?.text || null,
      distance_m: step.distance?.value ?? null,
      lat: step.start_location?.lat ?? null,
      lng: step.start_location?.lng ?? null,
      maneuver: step.maneuver || null,
    })),
  });
}
