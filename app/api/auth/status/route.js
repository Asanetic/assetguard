// app/api/auth/status/route.js
// GET /api/auth/status?identity=<email or phone>
// Public: lets a registrant check whether their account has been approved.
import { NextResponse } from "next/server";
import { findUserByIdentity } from "../../apiUtils/dataControl/users.js";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const identity = searchParams.get("identity");
  if (!identity)
    return NextResponse.json({ error: "Enter your email or phone number" }, { status: 400 });

  try {
    const u = await findUserByIdentity(identity);
    if (!u)
      return NextResponse.json({ error: "No account found for that email or phone" }, { status: 404 });
    return NextResponse.json({
      status: u.status, // Pending | Active | Suspended | Rejected
      name: u.name,
      email: u.email,
      company: u.company,
    });
  } catch (err) {
    console.error("[status] error", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
