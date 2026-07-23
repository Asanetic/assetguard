"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check } from "lucide-react";
import { hiveRoutes } from "../../appConfigs/hiveRoutes";

const BLUE = "#2E6CF5";

const DEFAULT_COMPANIES = [
  "Symphony Technologies Limited",
  "Kilimani Estates",
  "Nairobi Logistics Co.",
  "Other",
];

export default function RegisterForm({ companies = DEFAULT_COMPANIES, onRegister, redirectTo = "/pending-approval" }) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    password: "",
  });
  const [verified, setVerified] = useState({ email: false, phone: false });
  const [otp, setOtp] = useState({
    email: { sent: false, code: "" },
    phone: { sent: false, code: "" },
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const sendCode = (channel) => {
    if (channel === "email" && !form.email) return;
    if (channel === "phone" && !form.phone) return;
    setOtp((o) => ({ ...o, [channel]: { ...o[channel], sent: true } }));
  };

  const confirmCode = (channel) => {
    if (otp[channel].code.trim().length < 4) return;
    setVerified((v) => ({ ...v, [channel]: true }));
    setOtp((o) => ({ ...o, [channel]: { sent: false, code: "" } }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const required = ["firstName", "lastName", "email", "phone", "company", "password"];
    if (required.some((k) => !form[k])) {
      setError("Fill in all required fields");
      return;
    }
    if (!verified.email || !verified.phone) {
      setError("Verify your email and phone number to continue");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      if (onRegister) {
        await onRegister(form);
      } else {
        await new Promise((resolve) => setTimeout(resolve, 900));
      }
      setDone(true);
      setTimeout(() => router.push(redirectTo), 1200);
    } catch (err) {
      setError(err?.message || "We couldn't create your account. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="row g-3">
        <div className="col-sm-6">
          <label className="ag-label" htmlFor="reg-first">
            First name <span className="ag-req">*</span>
          </label>
          <input id="reg-first" className="ag-input" value={form.firstName} onChange={update("firstName")} autoComplete="given-name" />
        </div>
        <div className="col-sm-6">
          <label className="ag-label" htmlFor="reg-last">
            Last name <span className="ag-req">*</span>
          </label>
          <input id="reg-last" className="ag-input" value={form.lastName} onChange={update("lastName")} autoComplete="family-name" />
        </div>
      </div>

      <div className="mt-3">
        <label className="ag-label" htmlFor="reg-email">
          Email address <span className="ag-req">*</span>
        </label>
        <div className="position-relative">
          <input
            id="reg-email"
            type="email"
            className="ag-input"
            style={{ paddingRight: 92 }}
            placeholder="admin@symphony.com"
            value={form.email}
            onChange={update("email")}
            disabled={verified.email}
            autoComplete="email"
          />
          {/* {verified.email ? (
            <VerifiedChip />
          ) : (
            <VerifyButton onClick={() => sendCode("email")} />
          )} */}
        </div>
        {otp.email.sent && !verified.email && (
          <OtpRow
            value={otp.email.code}
            onChange={(v) => setOtp((o) => ({ ...o, email: { ...o.email, code: v } }))}
            onConfirm={() => confirmCode("email")}
          />
        )}
      </div>

      <div className="mt-3">
        <label className="ag-label" htmlFor="reg-phone">
          Phone number <span className="ag-req">*</span>
        </label>
        <div className="position-relative">
          <input
            id="reg-phone"
            type="tel"
            className="ag-input"
            style={{ paddingRight: 92 }}
            placeholder="+254 712 345 678"
            value={form.phone}
            onChange={update("phone")}
            disabled={verified.phone}
            autoComplete="tel"
          />
          {/* {verified.phone ? (
            <VerifiedChip />
          ) : (
            <VerifyButton onClick={() => sendCode("phone")} />
          )} */}
        </div>
        {otp.phone.sent && !verified.phone && (
          <OtpRow
            value={otp.phone.code}
            onChange={(v) => setOtp((o) => ({ ...o, phone: { ...o.phone, code: v } }))}
            onConfirm={() => confirmCode("phone")}
          />
        )}
      </div>

      <div className="mt-3">
        <label className="ag-label" htmlFor="reg-company">
          Company <span className="ag-req">*</span>
        </label>
        <select id="reg-company" className="ag-input" value={form.company} onChange={update("company")}>
          <option value="" disabled>
            Select your company
          </option>
          {companies.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="mt-3 mb-2">
        <label className="ag-label" htmlFor="reg-password">
          Password <span className="ag-req">*</span>
        </label>
        <input
          id="reg-password"
          type="password"
          className="ag-input"
          value={form.password}
          onChange={update("password")}
          autoComplete="new-password"
        />
      </div>

      {error && (
        <div className="fw-semibold mt-2" style={{ fontSize: 13, color: "#DC2626" }}>
          {error}
        </div>
      )}

      <button type="submit" disabled={submitting || done} className={`ag-cta mt-4 ${done ? "success" : ""}`}>
        {done ? "Account created" : submitting ? "Creating account…" : "Register"}
      </button>

      <div className="text-center mt-4" style={{ fontSize: 14, color: "#64748B" }}>
        Already have an account?{" "}
        <Link href={`${hiveRoutes.auth}/login`} className="fw-semibold text-decoration-none" style={{ color: BLUE }}>
          Log in
        </Link>
      </div>
    </form>
  );
}

function VerifiedChip() {
  return (
    <span
      className="position-absolute d-flex align-items-center gap-1 fw-semibold"
      style={{ right: 12, top: "50%", transform: "translateY(-50%)", color: "#059669", fontSize: 13 }}
    >
      <Check size={14} /> Verified
    </span>
  );
}

function VerifyButton({ onClick }) {
  return (
    <button
      type="button"
      className="position-absolute fw-semibold border-0 bg-transparent"
      style={{ right: 8, top: "50%", transform: "translateY(-50%)", color: BLUE, fontSize: 13, padding: "4px 6px" }}
      onClick={onClick}
    >
      Verify
    </button>
  );
}

function OtpRow({ value, onChange, onConfirm }) {
  return (
    <div className="d-flex align-items-center gap-2 mt-2">
      <input
        className="ag-input"
        style={{ width: 140, letterSpacing: 3 }}
        maxLength={6}
        inputMode="numeric"
        placeholder="Code"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button
        type="button"
        className="ag-cta"
        style={{ width: "auto", height: 38, padding: "0 14px", fontSize: 13 }}
        onClick={onConfirm}
      >
        Confirm
      </button>
    </div>
  );
}