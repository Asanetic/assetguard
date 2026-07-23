"use client";

import { useState } from "react";
import Link from "next/link";
import { CircleCheck } from "lucide-react";

const BLUE = "#2E6CF5";

export default function RequestAccess({ onSubmit }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.company) {
      setError("Fill in all required fields");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      if (onSubmit) await onSubmit(form);
      setSubmitted(true);
    } catch (err) {
      setError(err?.message || "We couldn't send your request. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-2">
        <CircleCheck size={56} color="#059669" />
        <div className="fw-bold mt-3" style={{ fontSize: 19, color: "#0F274A" }}>
          Request sent
        </div>
        <p className="mt-2 mb-4" style={{ fontSize: 13.5, color: "#64748B", lineHeight: 1.6 }}>
          We&apos;ve let your AssetGuard administrator know. You&apos;ll get an email once your access is set up.
        </p>
        <Link
          href="/login"
          className="ag-cta d-inline-flex align-items-center justify-content-center text-decoration-none"
          style={{ width: "auto", padding: "0 22px" }}
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-3">
        <label className="ag-label" htmlFor="ra-name">
          Full name <span className="ag-req">*</span>
        </label>
        <input id="ra-name" className="ag-input" value={form.name} onChange={update("name")} autoComplete="name" />
      </div>
      <div className="mb-3">
        <label className="ag-label" htmlFor="ra-email">
          Work email <span className="ag-req">*</span>
        </label>
        <input id="ra-email" type="email" className="ag-input" placeholder="you@company.com" value={form.email} onChange={update("email")} autoComplete="email" />
      </div>
      <div className="mb-3">
        <label className="ag-label" htmlFor="ra-company">
          Company <span className="ag-req">*</span>
        </label>
        <input id="ra-company" className="ag-input" value={form.company} onChange={update("company")} autoComplete="organization" />
      </div>
      <div className="mb-3">
        <label className="ag-label" htmlFor="ra-message">
          What do you need access to? <span style={{ color: "#94A3B8", fontWeight: 500 }}>(optional)</span>
        </label>
        <textarea id="ra-message" className="ag-input" style={{ height: 90, padding: "12px 14px", resize: "vertical" }} value={form.message} onChange={update("message")} />
      </div>
      {error && (
        <div className="fw-semibold mb-3" style={{ fontSize: 13, color: "#DC2626" }}>
          {error}
        </div>
      )}
      <button type="submit" disabled={submitting} className="ag-cta">
        {submitting ? "Sending…" : "Send request"}
      </button>
      <div className="text-center mt-4" style={{ fontSize: 14, color: "#64748B" }}>
        Already have an account?{" "}
        <Link href="/login" className="fw-semibold text-decoration-none" style={{ color: BLUE }}>
          Log in
        </Link>
      </div>
    </form>
  );
}