"use client";

import { CircleX } from "lucide-react";
import Link from "next/link";

export default function RegistrationRejected({
  reason = "We couldn't verify your affiliation with this company.",
}) {
  return (
    <div className="text-center">
      <div
        className="d-flex align-items-center justify-content-center mx-auto mb-3"
        style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "#FEE2E2" }}
      >
        <CircleX size={32} color="#DC2626" />
      </div>
      <h1 className="fw-bold mb-2" style={{ fontSize: 20, color: "#0F274A" }}>
        Registration not approved
      </h1>
      <p className="mb-4" style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
        {reason}
      </p>
      <p className="mb-4" style={{ fontSize: 13.5, color: "#64748B" }}>
        If you believe this is a mistake, reach out to your administrator or request access again.
      </p>
      <div className="d-flex flex-column flex-sm-row gap-2 justify-content-center">
        <Link
          href="/request-access"
          className="ag-cta d-inline-flex align-items-center justify-content-center text-decoration-none"
          style={{ width: "auto", padding: "0 22px" }}
        >
          Request access
        </Link>
        <Link
          href="/login"
          className="fw-semibold text-decoration-none d-inline-flex align-items-center justify-content-center"
          style={{ color: "#2E6CF5", fontSize: 14 }}
        >
          Back to log in
        </Link>
      </div>
    </div>
  );
}