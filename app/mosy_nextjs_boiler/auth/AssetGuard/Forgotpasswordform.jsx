"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, ChevronDown, Eye, EyeOff, CircleCheck } from "lucide-react";

const BLUE = "#2E6CF5";
const BORDER = "#E2E8F0";

export default function ForgotPasswordForm({ onComplete, loginHref = "/login" }) {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1 choose method, 2 verify code, 3 new password, 4 success
  const [method, setMethod] = useState("email");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pw1, setPw1] = useState("");
  const [pw2, setPw2] = useState("");
  const [show1, setShow1] = useState(false);
  const [show2, setShow2] = useState(false);
  const [error, setError] = useState("");

  const destination = method === "email" ? email : phone;

  const sendCode = () => {
    if (!destination) {
      setError(`Enter your ${method === "email" ? "email address" : "phone number"}`);
      return;
    }
    setError("");
    setStep(2);
  };

  const verifyCode = () => {
    if (code.trim().length < 4) {
      setError("Enter the code we sent you");
      return;
    }
    setError("");
    setStep(3);
  };

  const resetPassword = async () => {
    if (pw1.length < 8 || !/\d/.test(pw1)) {
      setError("Password must be at least 8 characters and include a number");
      return;
    }
    if (pw1 !== pw2) {
      setError("Passwords do not match");
      return;
    }
    setError("");
    if (onComplete) await onComplete({ method, destination, password: pw1 });
    setStep(4);
  };

  return (
    <div>
      {step === 1 && (
        <>
          <p className="mb-3" style={{ fontSize: 14.5, color: "#64748B" }}>
            Choose where we should send your verification code
          </p>
          <div className="ag-seg mb-4" role="tablist">
            <button type="button" className={method === "email" ? "on" : ""} aria-pressed={method === "email"} onClick={() => setMethod("email")}>
              <span className="ag-chip" style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}>
                <Mail size={14} />
              </span>
              Email
            </button>
            <button type="button" className={method === "phone" ? "on" : ""} aria-pressed={method === "phone"} onClick={() => setMethod("phone")}>
              <span className="ag-chip" style={{ backgroundColor: "#D1FAE5", color: "#047857" }}>
                <Phone size={14} />
              </span>
              Phone
            </button>
          </div>

          {method === "email" ? (
            <div className="mb-3">
              <label className="ag-label" htmlFor="fp-email">
                Email address
              </label>
              <input
                id="fp-email"
                type="email"
                className="ag-input"
                placeholder="admin@symphony.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          ) : (
            <div className="mb-3">
              <label className="ag-label" htmlFor="fp-phone">
                Phone number
              </label>
              <div className="d-flex" style={{ gap: 9 }}>
                <span
                  className="d-flex align-items-center fw-semibold flex-shrink-0"
                  style={{ gap: 5, padding: "0 13px", border: `1px solid ${BORDER}`, borderRadius: 10, backgroundColor: "#F8FAFC", fontSize: 14.5, color: "#334155" }}
                >
                  +254 <ChevronDown size={14} />
                </span>
                <input
                  id="fp-phone"
                  type="tel"
                  inputMode="tel"
                  className="ag-input"
                  style={{ flex: "1 1 auto", width: "auto" }}
                  placeholder="712 345 678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="fw-semibold mb-2" style={{ fontSize: 12.5, color: "#DC2626" }}>
              {error}
            </div>
          )}
          <button type="button" className="ag-cta" onClick={sendCode}>
            Send reset code
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <p className="mb-3" style={{ fontSize: 14.5, color: "#64748B" }}>
            We sent a 6-digit code to <span className="fw-semibold" style={{ color: "#334155" }}>{destination}</span>
          </p>
          <input className="ag-code" maxLength={6} inputMode="numeric" placeholder="______" value={code} onChange={(e) => setCode(e.target.value)} />
          <div className="d-flex align-items-center justify-content-between my-3" style={{ fontSize: 13.5, color: "#64748B" }}>
            <span>Didn&apos;t get it?</span>
            <button type="button" className="ag-link" onClick={sendCode}>
              Resend code
            </button>
          </div>
          {error && (
            <div className="fw-semibold mb-2" style={{ fontSize: 12.5, color: "#DC2626" }}>
              {error}
            </div>
          )}
          <button type="button" className="ag-cta" onClick={verifyCode}>
            Verify code
          </button>
        </>
      )}

      {step === 3 && (
        <>
          <p className="mb-3" style={{ fontSize: 13, color: "#64748B" }}>
            At least 8 characters, including a number
          </p>
          <div className="mb-3">
            <label className="ag-label" htmlFor="fp-pw1">
              New password
            </label>
            <div className="position-relative">
              <input
                id="fp-pw1"
                type={show1 ? "text" : "password"}
                className="ag-input"
                style={{ paddingRight: 44 }}
                placeholder="Enter new password"
                value={pw1}
                onChange={(e) => setPw1(e.target.value)}
              />
              <button type="button" className="ag-eyebtn" aria-label={show1 ? "Hide password" : "Show password"} onClick={() => setShow1((v) => !v)}>
                {show1 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div className="mb-2">
            <label className="ag-label" htmlFor="fp-pw2">
              Confirm password
            </label>
            <div className="position-relative">
              <input
                id="fp-pw2"
                type={show2 ? "text" : "password"}
                className="ag-input"
                style={{ paddingRight: 44 }}
                placeholder="Repeat new password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
              />
              <button type="button" className="ag-eyebtn" aria-label={show2 ? "Hide password" : "Show password"} onClick={() => setShow2((v) => !v)}>
                {show2 ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <div className="fw-semibold mb-3" style={{ fontSize: 12.5, color: "#DC2626" }}>
              {error}
            </div>
          )}
          <button type="button" className="ag-cta" onClick={resetPassword}>
            Reset password
          </button>
        </>
      )}

      {step === 4 && (
        <div className="text-center py-2">
          <CircleCheck size={56} color="#059669" />
          <div className="fw-bold mt-3" style={{ fontSize: 19, color: "#0F274A" }}>
            Password reset successfully
          </div>
          <p className="mt-2 mb-4" style={{ fontSize: 13.5, color: "#64748B" }}>
            You can now log in with your new password
          </p>
          <button type="button" className="ag-cta" onClick={() => router.push(loginHref)}>
            Back to log in
          </button>
        </div>
      )}

      {step < 4 && (
        <div className="text-center mt-4" style={{ fontSize: 14, color: "#64748B" }}>
          Remember your password?{" "}
          <Link href={loginHref} className="fw-semibold text-decoration-none" style={{ color: BLUE }}>
            Log in
          </Link>
        </div>
      )}
    </div>
  );
}