"use client";

import { useState } from "react";
import {
  Hourglass,
  CircleCheck,
  CircleX,
  Check,
  UserCheck,
  Lock,
  LockOpen,
  Bell,
  X as XIcon,
  FeatherIcon,
  CircleAlert,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { mosyGetData } from "../../MosyUtils/hiveUtils";
import { MosyNotify } from "../../MosyUtils/ActionModals";

// ---- ADD this new function anywhere in hiveUtils.jsx ----

/**
 * mosyCheckRegistrationStatus
 * Reusable across the pending-approval page (and anywhere else
 * that needs "is this account approved yet?"). Public — no auth
 * token required, since the person checking may not have one.
 *
 * @param {string} identifier  email or phone used at registration
 * @returns {Promise<{status:'success'|'error', message?:string, data?:Object}>}
 */
export async function mosyCheckRegistrationStatus(identifier) {
  return mosyGetData({
    endpoint: "/api/auth/status",
    params: { identifier },
    requiresAuth: false,
  });
}

/**
 * Three-step "Registered → Admin verification → Log in" progress bar.
 * step: "pending" | "approved" | "rejected"
 */
function ApprovalSteps({ step }) {
  const rejected = step === "rejected";
  const approved = step === "approved";

  const node2Style = rejected
    ? { background: "#FEE2E2", color: "#DC2626" }
    : approved
    ? { background: "#D1FAE5", color: "#059669" }
    : { background: "#DBE7FE", color: "#2E6CF5" };

  const node3Style = approved
    ? { background: "#DBE7FE", color: "#2E6CF5" }
    : { background: "#F1F5F9", color: "#94A3B8" };

  const connector2Color = approved ? "#059669" : "#E2E8F0";

  return (
    <div>
      <div className="d-flex align-items-center" style={{ margin: "26px 0 8px" }}>
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ width: 36, height: 36, borderRadius: "50%", background: "#D1FAE5", color: "#059669", flex: "none" }}
        >
          <Check size={17} />
        </div>
        <div style={{ flex: 1, height: 2, background: "#059669", margin: "0 8px" }} />
        <div
          className="d-flex align-items-center justify-content-center position-relative"
          style={{ width: 36, height: 36, borderRadius: "50%", flex: "none", ...node2Style }}
        >
          {rejected ? <XIcon size={17} /> : approved ? <Check size={17} /> : <UserCheck size={17} />}
        </div>
        <div style={{ flex: 1, height: 2, background: connector2Color, margin: "0 8px" }} />
        <div
          className="d-flex align-items-center justify-content-center"
          style={{ width: 36, height: 36, borderRadius: "50%", flex: "none", ...node3Style }}
        >
          {approved ? <LockOpen size={17} /> : <Lock size={17} />}
        </div>
      </div>
      <div className="d-flex justify-content-between" style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
        <span>Registered</span>
        <span style={rejected ? { color: "#DC2626" } : undefined}>
          {rejected ? "Approval declined" : "Admin verification"}
        </span>
        <span>Log in</span>
      </div>
    </div>
  );
}

/**
 * PendingApproval
 * Now behaves as a general status-check page: it shows a different
 * message, icon, and progress state depending on accountStatus
 * ("pending" | "approved" | "rejected"), driven by the result of
 * mosyCheckRegistrationStatus.
 *
 * identifier (email or phone) resolves in this order:
 *   1. explicit `identifier` prop
 *   2. ?identifier= in the URL (e.g. redirected here after register
 *      with /pending-approval?identifier=jane%40symphony.com)
 *   3. whatever the user types into the fallback input below
 * If none of these are present, we show a small input so the user
 * can type their email or phone before checking status.
 */
export default function PendingApproval({
  firstName = "there",
  company = "your organization",
  identifier: identifierProp,
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlIdentifier = searchParams.get("identifier") || "";
  const hasKnownIdentifier = Boolean(identifierProp || urlIdentifier);

  // Manual fallback — only used when neither prop nor URL gave us one
  const [manualIdentifier, setManualIdentifier] = useState("");

  const identifier = identifierProp || urlIdentifier || manualIdentifier.trim();

  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { accountStatus, name, company, email, tel, role, reason? }

  const handleCheck = async () => {
    if (!identifier) {
      setError("Please enter the email or phone number you registered with.");
      return;
    }
    setChecking(true);
    setError("");

    try {
      const res = await mosyCheckRegistrationStatus(identifier);

      if (res?.status !== "success") {
        MosyNotify({ message: res?.message || "Couldn't check status right now — try again shortly.", icon:"times-circle" , iconColor:"text-danger" });
        setError(res?.message || "Couldn't check status right now — try again shortly.");
        return;
      }

      setResult(res.data);
      if (res.data.accountStatus === "approved") {
        setTimeout(() => router.push("./login"), 4000);
      }
    } catch (err) {
      setError(err?.message || "Couldn't check status right now — try again shortly.");
    } finally {
      setChecking(false);
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    handleCheck();
  };

  const status = result?.accountStatus || "pending"; // "pending" | "approved" | "rejected"
  const approved = status === "approved";
  const rejected = status === "rejected";

  const iconWrapStyle = rejected
    ? { background: "#FEE2E2" }
    : approved
    ? { background: "#D1FAE5" }
    : { background: "#FEF3C7" };

  const displayName = result?.name || firstName;
  const displayCompany = result?.company || company;
  const displayContact = result?.email || result?.tel || identifier || null;

  let heading = ""//"Waiting for admin verification";
  let subtext = ""//`Thanks for registering, ${firstName}. An administrator at ${company} must verify your account before you can log in. This usually takes less than 24 hours.`;

  if (approved) {
    heading = "Account approved";
    subtext = `You're all set, ${displayName}.`// Your administrator has verified your account — redirecting you to log in…`;
  } else if (rejected) {
    heading = "Registration not approved";
    subtext = `Sorry ${displayName}, the administrator at ${displayCompany} was unable to verify your account.`;
  }

  return (
    <div className="text-center">
      <div
        className="d-flex align-items-center justify-content-center mx-auto mb-3"
        style={{ width: 64, height: 64, borderRadius: "50%", ...iconWrapStyle }}
      >
        {approved ? (
          <CircleCheck size={32} color="#059669" />
        ) : rejected ? (
          <CircleAlert size={32} color="#DC2626" />
        ) : (
          <Hourglass size={32} color="#B45309" />
        )}
      </div>

      {/* Progress steps */}
      <ApprovalSteps step={rejected ? "rejected" : approved ? "approved" : "pending"} />


      <h1 className="fw-bold my-2" style={{ fontSize: 20, color: "#0F274A" }}>
        {heading}
      </h1>

      <p className="mb-0" style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6 }}>
        {subtext}
      </p>

      {/* Status banner */}
      {!checking && result && (
        <div
          className="fw-semibold"
          style={{
            fontSize: 13,
            borderRadius: 10,
            padding: "10px 13px",
            marginTop: 18,
            ...(rejected
              ? { background: "#FEE2E2", border: "1px solid #FECACA", color: "#991B1B" }
              : approved
              ? { background: "#D1FAE5", border: "1px solid #A7F3D0", color: "#065F46" }
              : { background: "#FEF3C7", border: "1px solid #FDE68A", color: "#92400E" }),
          }}
        >
          {rejected ? (
            result?.reason ? (
              <>Reason from administrator: {result.reason}</>
            ) : (
              "Contact your administrator for details on why your registration wasn't approved."
            )
          ) : approved ? (
            "Approved by your administrator — redirecting you to log in…"
          ) : (
            "Still pending — hang tight, we'll notify you once approved"
          )}
        </div>
      )}

      {/* Registered-as summary — only once we actually have a result to show */}
      {result && (
        <div
          className="text-start"
          style={{
            background: "#F8FAFC",
            border: "1px solid #EEF2F7",
            borderRadius: 10,
            padding: "12px 14px",
            margin: "18px 0",
            fontSize: 13.5,
            color: "#475569",
            lineHeight: 1.6,
          }}
        >
          {rejected ? "Submitted as " : "Registered as "}
          <span className="fw-semibold" style={{ color: "#334155" }}>
            {displayName}
          </span>
          {displayContact ? <> — {displayContact}</> : null}
          <br />
          Company: {displayCompany}
        </div>
      )}

      {!approved && (
        <>
          {/* Fallback input — only shown when we don't already know the identifier */}
          {!hasKnownIdentifier && (
            <form onSubmit={handleManualSubmit} className="mb-3 mx-auto mt-4" style={{ maxWidth: 320 }}>
              <label
                htmlFor="pending-approval-identifier"
                className="d-block fw-semibold mb-2 text-start"
                style={{ fontSize: 13, color: "#334155" }}
              >
                Enter the email or phone you registered with
              </label>
              <input
                id="pending-approval-identifier"
                type="text"
                inputMode="email"
                autoComplete="username"
                placeholder="you@example.com or +1 555 000 0000"
                value={manualIdentifier}
                onChange={(e) => {
                  setManualIdentifier(e.target.value);
                  if (error) setError("");
                }}
                className="form-control"
                style={{ fontSize: 14 }}
              />
            </form>
          )}

          {!rejected && (
            <div
              className="d-flex align-items-center text-start py-2"
              style={{ gap: 10, margin: "18px 0", justifyContent: "flex-start" }}
            >
              <span
                className="d-flex align-items-center justify-content-center"
                style={{ width: 26, height: 26, borderRadius: 8, background: "#DBE7FE", color: "#2E6CF5", flex: "none" }}
              >
                <Bell size={15} />
              </span>
              <span style={{ fontSize: 13.5, color: "#475569" }}>
                We'll send you an email and an SMS after approval.
              </span>
            </div>
          )}

          <button
            type="button"
            className="ag-cta"
            style={{ width: "100%", height: 48, marginTop: 4 }}
            onClick={handleCheck}
            disabled={checking || !identifier}
          >
            {checking ? "Checking…" : rejected ? "Check again" : "Check status"}
          </button>

          {error && (
            <div className="fw-semibold mt-3" style={{ fontSize: 13, color: "#DC2626" }}>
              {error}
            </div>
          )}
        </>
      )}

      <p className="mb-0 mt-4" style={{ fontSize: 13.5, color: "#64748B" }}>
        Questions about your account?{" "}
        <span className="fw-semibold" style={{ color: "#334155" }}>
          Contact your administrator
        </span>
      </p>
      <Link
        href="./login"
        className="d-inline-block mt-4 fw-semibold text-decoration-none"
        style={{ color: "#2E6CF5", fontSize: 14 }}
      >
        Back to log in
      </Link>
    </div>
  );
}