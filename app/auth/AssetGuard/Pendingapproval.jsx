"use client";

import { Hourglass } from "lucide-react";
import Link from "next/link";

export default function PendingApproval({ firstName = "there", company = "your organization" }) {
  return (
    <div className="text-center">
      <div
        className="d-flex align-items-center justify-content-center mx-auto mb-3"
        style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#FEF3C7" }}
      >
        <Hourglass size={32} color="#B45309" />
      </div>
      <h1 className="fw-bold mb-2" style={{ fontSize: 20, color: "#0F274A" }}>
        Waiting for admin verification
      </h1>
      <p className="mb-4" style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
        Thanks for registering, {firstName}. An administrator at {company} must verify your account
        before you can log in.
      </p>
      <p className="mb-0" style={{ fontSize: 13.5, color: "#64748B" }}>
        Questions about your account? <span className="fw-semibold" style={{ color: "#334155" }}>Contact your administrator</span>
      </p>
      <Link href="/login" className="d-inline-block mt-4 fw-semibold text-decoration-none" style={{ color: "#2E6CF5", fontSize: 14 }}>
        Back to log in
      </Link>
    </div>
  );
}