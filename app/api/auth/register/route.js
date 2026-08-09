// app/api/auth/register/route.js
// -----------------------------------------------------------------------------
// POST /api/auth/register
// Body: { firstName, lastName, email, phone, company, password,
//         emailVerified?, phoneVerified? }
// Files a PENDING account tied to an existing company. An admin approves it
// (assigns a role) before the person can log in.
// -----------------------------------------------------------------------------

import { NextResponse } from "next/server";
import { findUserByIdentity, createUser } from "../../apiUtils/dataControl/users.js";
import { findCompanyByName } from "../../apiUtils/dataControl/companies.js";
import { hashPassword } from "../../apiUtils/authUtils/password.js";
import { hasVerified } from "../../apiUtils/dataControl/verification.js";

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const {
    firstName = "",
    lastName = "",
    email = "",
    phone = "",
    company = "",
    password = "",
    emailVerified = false,
    phoneVerified = false,
  } = body || {};

  const name = `${firstName} ${lastName}`.trim();

  if (!firstName.trim() || !lastName.trim())
    return NextResponse.json({ error: "Enter your first and last name" }, { status: 400 });
  if (!email.trim())
    return NextResponse.json({ error: "Enter your email address" }, { status: 400 });
  if (!phone.trim())
    return NextResponse.json({ error: "Enter your phone number" }, { status: 400 });
  if (!company.trim())
    return NextResponse.json({ error: "Select your company" }, { status: 400 });
  if (password.length < 8 || !/[0-9]/.test(password))
    return NextResponse.json(
      { error: "Password must be at least 8 characters and include a number" },
      { status: 400 }
    );

  try {
    // Email + phone must have been verified via OTP (server-side check —
    // don't trust the client's flags).
    const emailOk = await hasVerified("email", email);
    const phoneOk = await hasVerified("phone", phone);
    if (!emailOk || !phoneOk)
      return NextResponse.json(
        { error: "Verify your email and phone number to continue" },
        { status: 400 }
      );

    // Company must already exist (matches "your company is not on the list").
    const companyRow = await findCompanyByName(company);
    if (!companyRow)
      return NextResponse.json(
        { error: "That company is not registered — contact an administrator" },
        { status: 400 }
      );

    if (await findUserByIdentity(email))
      return NextResponse.json(
        { error: "An account with that email already exists" },
        { status: 409 }
      );
    if (await findUserByIdentity(phone))
      return NextResponse.json(
        { error: "An account with that phone number already exists" },
        { status: 409 }
      );

    const passwordHash = await hashPassword(password);
    const user = await createUser({
      name,
      email: email.trim(),
      phone: phone.trim(),
      companyId: companyRow.id,
      passwordHash,
      status: "Pending",
      emailVerified: !!emailVerified,
      phoneVerified: !!phoneVerified,
    });

    return NextResponse.json(
      {
        message: "Account created — awaiting approval",
        user: { id: user.id, name: user.name, status: user.status },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error("[register] error", err);
    return NextResponse.json({ error: "Something went wrong. Try again." }, { status: 500 });
  }
}
