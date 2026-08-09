// app/api/mainapp/access-requests/route.js
// GET  (admin)  -> list New + Declined requests
// POST (public) -> raise a request from the Request-access screen
import { NextResponse } from "next/server";
import { listAccessRequests, createAccessRequest } from "../../apiUtils/dataControl/accessRequests.js";
import { requireAdmin } from "../../apiUtils/authUtils/session.js";

export async function GET(request) {
  const gate = requireAdmin(request);
  if (gate.error) return gate.error;
  try {
    return NextResponse.json({ requests: await listAccessRequests() });
  } catch (err) {
    console.error("[access-requests GET] error", err);
    return NextResponse.json({ requests: [] }, { status: 500 });
  }
}

export async function POST(request) {
  let body;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: "Invalid body" }, { status: 400 }); }

  const { name, email, phone, company, problem } = body || {};
  if (!name || !name.trim()) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  try {
    const req = await createAccessRequest({
      name: name.trim(), email: (email || "").trim(), phone: (phone || "").trim(),
      company: (company || "").trim(), problem: (problem || "").trim(),
    });
    return NextResponse.json({ request: req }, { status: 201 });
  } catch (err) {
    console.error("[access-requests POST] error", err);
    return NextResponse.json({ error: "Could not submit request" }, { status: 500 });
  }
}
