"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, Eye, EyeOff, ChevronDown } from "lucide-react";
import { hiveRoutes } from "../../appConfigs/hiveRoutes";
import { ProcessUserLogin } from "../AuthUtils";
import { closeMosyModal, MosyNotify } from "../../MosyUtils/ActionModals";

const BLUE = "#2E6CF5";
const BORDER = "#E2E8F0";

export default function LoginForm({ onLogin, redirectTo = "/dashboard" }) {
  const router = useRouter();
  const [method, setMethod] = useState("email"); // "email" | "phone"
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const afterLogin =`${hiveRoutes.main}/systemusers/list`


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier || !password) {
      setError(`Enter your ${method === "email" ? "email" : "phone number"} and password`);
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (onLogin) {
        await onLogin({ method, identifier, password, remember });
      } else {
        // Placeholder delay — wire this up to your real auth call.
        //await new Promise((resolve) => setTimeout(resolve, 1100));
      MosyNotify({message : "Sending request...", addTimer:false})
      e.preventDefault();
      const loginResult = await ProcessUserLogin(e);

      if (loginResult.success) {
        console.log('Yay, logged in!', loginResult.user);
        closeMosyModal()
        
        // Maybe show a toast or do something UI-wise
      } else {
        console.log('Login failed:', loginResult.message);
        MosyNotify({message : "Invalid username or password. \nPlease try again",icon : "times-circle text-danger", duration:20000})
        // Maybe show custom message
      }

      }
      //router.push(afterLogin);
    } catch (err) {
      setError(err?.message || "We couldn't log you in. Check your details and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate id="mosy_form">
      <div className="ag-seg mb-4" role="tablist">
        <button
          type="button"
          className={method === "email" ? "on" : ""}
          aria-pressed={method === "email"}
          onClick={() => setMethod("email")}
        >
          <span className="ag-chip" style={{ backgroundColor: "#FEF3C7", color: "#B45309" }}>
            <Mail size={14} />
          </span>
          Email
        </button>
        <button
          type="button"
          className={method === "phone" ? "on" : ""}
          aria-pressed={method === "phone"}
          onClick={() => setMethod("phone")}
        >
          <span className="ag-chip" style={{ backgroundColor: "#D1FAE5", color: "#047857" }}>
            <Phone size={14} />
          </span>
          Phone
        </button>
      </div>

      {method === "email" ? (
        <div className="mb-3">
          <label className="ag-label" htmlFor="txt_username">
            Email address
          </label>
          <input
            id="txt_username"
            name="txt_username"
            type="email"
            className="ag-input"
            placeholder="admin@symphony.com"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            autoComplete="username"
          />
        </div>
      ) : (
        <div className="mb-3">
          <label className="ag-label" htmlFor="txt_username">
            Phone number
          </label>
          <div className="d-flex" style={{ gap: 9 }}>
            <span
              className="d-flex align-items-center fw-semibold flex-shrink-0"
              style={{
                gap: 5,
                padding: "0 13px",
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                backgroundColor: "#F8FAFC",
                fontSize: 14.5,
                color: "#334155",
                whiteSpace: "nowrap",
              }}
            >
              +254 <ChevronDown size={14} />
            </span>
            <input
              id="txt_username"
              name="txt_username"
              type="tel"
              inputMode="tel"
              className="ag-input"
              style={{ flex: "1 1 auto", width: "auto" }}
              placeholder="712 345 678"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              autoComplete="tel"
            />
          </div>
        </div>
      )}

      <div className="mb-2">
        <label className="ag-label" htmlFor="txt_password">
          Password
        </label>
        <div className="position-relative">
          <input
            id="txt_password"
            name="txt_password"
            type={showPassword ? "text" : "password"}
            className="ag-input"
            style={{ paddingRight: 44 }}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button
            type="button"
            aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)}
            className="ag-eyebtn"
          >
            {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
          </button>
        </div>
      </div>

      {error && (
        <div className="fw-semibold mb-2" style={{ fontSize: 12.5, color: "#DC2626" }}>
          {error}
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center my-3" style={{ fontSize: 14 }}>
        <label className="d-flex align-items-center gap-2" style={{ color: "#475569", cursor: "pointer" }}>
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ accentColor: BLUE, width: 16, height: 16, margin: 0 }}
          />
          <span className="mx-2">Remember me</span>
        </label>
        <Link href="/forgot-password" className="fw-semibold text-decoration-none" style={{ color: BLUE, fontSize: 14 }}>
          Forgot password?
        </Link>
      </div>

      <button type="submit" disabled={loading} className="ag-cta">
        {loading ? "Verifying…" : "Log in"}
      </button>
      <input type="hidden" id="auth_mosy_action" name="auth_mosy_action" value="auth_login" />
      <input type="hidden" id="login_method" name="login_method" value={method} />
      <div className="text-center mt-4" style={{ fontSize: 14, color: "#64748B" }}>
        New to AssetGuard?{" "}
        <div className="col-md-12 py-1"></div>
        <Link href={`${hiveRoutes.auth}/registration`} className="fw-semibold text-decoration-none mr-2" style={{ color: "#334155" }}>
          Request access
        </Link>      
        |
        <Link href={`${hiveRoutes.auth}/accstatus`} className="fw-semibold ml-2 text-decoration-none" style={{ color: BLUE }}>
          Check status 
        </Link> 
      </div>
    </form>
  );
}