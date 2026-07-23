// app/api/smartapi/route.js

import { processAuthToken } from "../../auth/authManager";
import { sendUtilMessage } from "../messages/logicControl/send-util-message";
import { createPayrequest } from "../smartpaymentrequests/logicControl/generate-request";

// ================================
// ACTION HANDLERS (REGISTER HERE)
// ================================

// One map. One truth.
const ACTIONS = {
  sendUtilMessage,
  createPayrequest
};
// ================================
// UTILS
// ================================

async function parseBody(request) {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const body = {};

    for (const [key, value] of formData.entries()) {
      body[key] = value;
    }

    return body;
  }

  // Default: JSON
  return await request.json();
}

function buildPayloadFromQuery(url) {
  const payload = {};

  for (const [key, value] of url.searchParams.entries()) {
    if (key !== "action") {
      payload[key] = value;
    }
  }

  return payload;
}

// ================================
// GET
// ================================

export async function GET(request) {
  try {
    // ---- Auth
    const { valid, reason, data: auth } = processAuthToken(request);

    if (!valid) {
      return Response.json(
        { status: "unauthorized", message: reason },
        { status: 403 }
      );
    }

    // ---- Action & Payload
    const url = new URL(request.url);
    const action = url.searchParams.get("action");

    if (!action) {
      return Response.json(
        { status: "error", message: "Action is required" },
        { status: 400 }
      );
    }

    const handler = ACTIONS[action];

    if (!handler) {
      return Response.json(
        { status: "error", message: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    const payload = buildPayloadFromQuery(url);

    // ---- Execute
    const result = await handler({ auth, payload });

    return Response.json({
      status: "success",
      action,
      data: result
    });

  } catch (err) {
    console.error("SMARTAPI GET ERROR:", err);
    return Response.json(
      { status: "error", message: err.message || "Server error" },
      { status: 500 }
    );
  }
}

// ================================
// POST
// ================================

export async function POST(request) {
  try {
    // ---- Parse body (JSON or multipart)
    const body = await parseBody(request);
    const { action, payload = {} } = body || {};

    if (!action) {
      return Response.json(
        { status: "error", message: "Action is required" },
        { status: 400 }
      );
    }

    // ---- Auth
    const { valid, reason, data: auth } = processAuthToken(request);

    if (!valid) {
      return Response.json(
        { status: "unauthorized", message: reason },
        { status: 403 }
      );
    }

    // ---- Resolve handler
    const handler = ACTIONS[action];

    if (!handler) {
      return Response.json(
        { status: "error", message: `Unknown action: ${action}` },
        { status: 400 }
      );
    }

    // ---- Execute
    const result = await handler({ auth, payload });

    return Response.json({
      status: "success",
      action,
      data: result
    });

  } catch (err) {
    console.error("SMARTAPI POST ERROR:", err);
    return Response.json(
      { status: "error", message: err.message || "Server error" },
      { status: 500 }
    );
  }
}
