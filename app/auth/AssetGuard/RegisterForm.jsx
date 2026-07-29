"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hiveRoutes } from "../../appConfigs/hiveRoutes";
import { mosyGetData, mosyPostData } from "../../MosyUtils/hiveUtils";
import { MosyNotify } from "../../MosyUtils/ActionModals";

/**
 * mosyRegisterUser
 * Reusable across RegisterForm (web/mobile) and any future
 * "request access" style form. Posts straight to the public
 * register endpoint — no auth token required.
 *
 * @param {Object} form  { firstName, lastName, email, phone, company, password }
 * @returns {Promise<{status:'success'|'error', message:string, data?:Object}>}
 */
export async function mosyRegisterUser(form) {
  return mosyPostData({
    url: '/api/auth/register',
    data: form,
    method: 'POST',
    requiresAuth: false,
  });
}

const BLUE = "#2E6CF5";

// Fallback shown before the real list loads / if the fetch fails —
// same {id, name} shape as the live data so the <select> never needs
// to branch on where the list came from.
const DEFAULT_COMPANIES = [
  { id: "Symphony Technologies Limited", name: "Symphony Technologies Limited" },
  { id: "Kilimani Estates", name: "Kilimani Estates" },
  { id: "Nairobi Logistics Co.", name: "Nairobi Logistics Co." },
  { id: "Other", name: "Other" },
];

// Normalizes the companies list endpoint's { status, message, data,
// pagination } response down to just what the dropdown needs:
// company_id as the option value, company_name as the label.
async function fetchCompanies() {
  const res = await mosyGetData({
    endpoint: "/api/assetguard/companies/list",
    requiresAuth: false,
  });

  if (res?.status !== "success") return [];

  return (res.data || []).map((c) => ({
    id: c.company_id,
    name: c.company_name,
  }));
}

/**
 * RegisterForm
 * Simplified: no OTP-gating (the previous verify/confirm flow was
 * dead code — the Verify buttons were commented out, so
 * verified.email/verified.phone could never flip to true and every
 * submit was silently blocked). Registration now just validates
 * required fields and posts once, via the shared mosyRegisterUser
 * helper — the same helper any other signup surface (mobile, request
 * access, etc.) can reuse.
 */
export default function RegisterForm({
  companies = DEFAULT_COMPANIES,
  onRegister = mosyRegisterUser,
  redirectTo = "./accstatus",
}) {
  const router = useRouter();
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    company: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // companies prop is the initial/fallback list — replaced once the
  // real list resolves. A client component can't `await` mid-render,
  // so this has to be an effect, not a top-level `await`.
  const [companiesList, setCompaniesList] = useState(companies);
  const [companiesLoading, setCompaniesLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchCompanies()
      .then((list) => {
        if (!cancelled && list.length > 0) setCompaniesList(list);
      })
      .catch(() => {
        // keep the fallback list on failure — don't block registration
      })
      .finally(() => {
        if (!cancelled) setCompaniesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    const required = ["firstName", "lastName", "email", "phone", "company", "password"];
    if (required.some((k) => !form[k])) {
      setError("Fill in all required fields");
      return;
    }
    if (form.password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setError("");
    setSubmitting(true);

    try {
      const result = await onRegister(form);

      if (result?.status === "error") {
        MosyNotify({ icon: "times-circle text-danger", iconColor: "text-danger", message: result.message, addTimer: false });
        setError(result.message || "We couldn't create your account. Try again.");
        return;
      }

      setDone(true);
      const dest = `${redirectTo}?identifier=${encodeURIComponent(form.email)}`;
      setTimeout(() => router.push(dest), 1200);
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
        <input
          id="reg-email"
          type="email"
          className="ag-input"
          placeholder="admin@symphony.com"
          value={form.email}
          onChange={update("email")}
          autoComplete="email"
        />
      </div>

      <div className="mt-3">
        <label className="ag-label" htmlFor="reg-phone">
          Phone number <span className="ag-req">*</span>
        </label>
        <input
          id="reg-phone"
          type="tel"
          className="ag-input"
          placeholder="+254 712 345 678"
          value={form.phone}
          onChange={update("phone")}
          autoComplete="tel"
        />
      </div>

      <div className="mt-3">
        <label className="ag-label" htmlFor="reg-company">
          Company <span className="ag-req">*</span>
        </label>
        <select
          id="reg-company"
          className="ag-input"
          value={form.company}
          onChange={update("company")}
          disabled={companiesLoading}
        >
          <option value="" disabled>
            {companiesLoading ? "Loading companies…" : "Select your company"}
          </option>
          {companiesList.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
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
        <Link href={`${hiveRoutes.auth}/login`} className="fw-semibold text-decoration-none mr-2" style={{ color: BLUE }}>
          Log in
        </Link>
        |
        <Link href={`${hiveRoutes.auth}/accstatus`} className="fw-semibold ml-2 text-decoration-none" style={{ color: BLUE }}>
          Check status
        </Link>
      </div>
    </form>
  );
}