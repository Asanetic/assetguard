"use client";

import { Lock } from "lucide-react";
import { Brand } from "../../components/AssetGuard/Brand";
import DynamicModalProvider from "../../components/DynamicModalProvider";

const DEFAULT_PILLS = ["Live tracking", "Smart alerts", "Reporting", "Field ops"];

// Same shield-check mark used across the app's headers/drawers, inlined here
// so the mobile hero (icon + wordmark, centered/stacked) doesn't depend on
// how the shared <Brand> component happens to lay itself out.
function MarkIcon({ size = 48 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" aria-hidden="true">
      <rect width="96" height="96" rx="24" fill="#2E6CF5" />
      <g transform="translate(1.04,3.76) scale(3.881)">
        <path
          d="M11.9 2 C11.9 2 9.1 5.9 3.3 6.2 L3.3 12.8 C3.3 16.2 6.2 19 10.4 20.8 M11.9 2 C11.9 2 14.9 5.9 20.9 6.2 L20.9 12.8"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.45"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M14.4 18 L16.8 20.6 L20.8 15.8"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="1.45"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path
          d="M12.4 7.2 C10.42 7.2 8.8 8.82 8.8 10.8 C8.8 13.4 11.6 16.5 12.03 16.99 C12.21 17.18 12.59 17.18 12.77 16.99 C13.2 16.5 16 13.4 16 10.8 C16 8.82 14.38 7.2 12.4 7.2 Z M11 10.8 A1.4 1.4 0 1 0 13.8 10.8 A1.4 1.4 0 1 0 11 10.8 Z"
          fill="#FFFFFF"
          fillRule="evenodd"
        />
      </g>
    </svg>
  );
}

/**
 * Shared shell every auth screen sits inside.
 *
 * Desktop (>= 860px): navy hero panel on the left (brand, headline, supporting
 * copy, feature pills, decorative orb) beside a white form panel on the right —
 * unchanged from before.
 *
 * Mobile (< 860px): collapses to the app's mobile pattern — a short navy header
 * with the centered logo/wordmark + tagline, and the form in a white card with
 * rounded top corners that overlaps the header (matches the mobile login
 * screenshot: rounded card pulled up over the navy hero, no pills/long copy).
 */
export default function AuthShell({
  formWidth = 420,
  eyebrow,
  title,
  subtitle,
  heroHeadline = "Asset monitoring and protection",
  heroSubtext = "Real-time visibility, protection, and reporting for your assets, field teams, and operations — from a single platform.",
  pills = DEFAULT_PILLS,
  children,
}) {
  return (
    <div className="ag-shell-bg d-flex flex-column align-items-center justify-content-center min-vh-100">
      <div className="ag-shell">
        {/* Hero — full desktop version, condensed header on mobile */}
        <div className="ag-shell-hero">
          <div className="ag-orb" aria-hidden="true">
            <span style={{ inset: 0 }} />
            <span style={{ inset: 64 }} />
            <span style={{ inset: 128 }} />
            <i className="ag-ping" />
          </div>

          <div className="ag-shell-hero-inner">
            {/* Desktop brand row */}
            <div className="ag-shell-brand-desktop">
              <Brand variant="drawer" />
            </div>
            <div className="fw-bold text-white ag-shell-headline">{heroHeadline}</div>
            <p className="ag-shell-subtext">{heroSubtext}</p>
            {pills?.length > 0 && (
              <div className="d-flex flex-wrap ag-shell-pills">
                {pills.map((p) => (
                  <span key={p} className="ag-pill">
                    {p}
                  </span>
                ))}
              </div>
            )}

            {/* Mobile brand row — centered mark + wordmark + tagline, matches the app's mobile header */}
            <div className="ag-shell-brand-mobile text-center mt-4">
              <MarkIcon size={48} />
              <div className="fw-bold ag-shell-wordmark">
                <span style={{ color: "#fff" }}>Asset</span>
                <span style={{ color: "#7EB2FF" }}>Guard</span>
              </div>
              <div className="ag-shell-tagline">{heroHeadline}</div>
            </div>
          </div>
        </div>

        {/* Form panel — plain panel on desktop, floating rounded card on mobile */}
        <div className="ag-shell-form">
          <div className="ag-shell-form-card">
            <div className="w-100" style={{ maxWidth: formWidth }}>
              {eyebrow && (
                <div
                  className="text-uppercase fw-semibold mb-2"
                  style={{ color: "#2E6CF5", letterSpacing: ".06em", fontSize: 12 }}
                >
                  {eyebrow}
                </div>
              )}
              {title && (
                <h1 className="fw-bold mb-1" style={{ fontSize: 28, color: "#0F274A" }}>
                  {title}
                </h1>
              )}
              {subtitle && (
                <p className="mb-4" style={{ fontSize: 14.5, color: "#64748B" }}>
                  {subtitle}
                </p>
              )}

              {children}
              <DynamicModalProvider />

              <div
                className="d-flex align-items-center justify-content-center gap-2 mt-4"
                style={{ fontSize: 12.5, color: "#94A3B8" }}
              >
                <Lock size={14}  /> <span className="mx-2">Secured by Symphony Technologies Limited </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .ag-shell-bg {
          background: #f5f7fb;
          padding: 40px 16px;
        }
        .ag-shell {
          width: 100%;
          max-width: 1040px;
          display: grid;
          grid-template-columns: 460px 1fr;
          background: #fff;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          overflow: hidden;
          box-shadow: 0 20px 60px rgba(15, 23, 42, 0.08);
        }

        /* ---- hero (navy) panel ---- */
        .ag-shell-hero {
          background: #14315d;
          padding: 48px 40px;
          position: relative;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .ag-shell-hero-inner {
          position: relative;
          z-index: 1;
        }
        .ag-shell-headline {
          font-size: 34px;
          line-height: 1.28;
          margin-top: 60px;
        }
        .ag-shell-subtext {
          font-size: 15.5px;
          line-height: 1.7;
          color: #b9c7de;
          margin-top: 16px;
          max-width: 330px;
        }
        .ag-shell-pills {
          gap: 7px;
          margin-top: 28px;
        }
        .ag-pill {
          border: 1px solid rgba(255, 255, 255, 0.22);
          padding: 6px 9px;
          border-radius: 999px;
          font-size: 11.5px;
          color: #d6e1f2;
          white-space: nowrap;
        }
        .ag-orb {
          position: absolute;
          right: -80px;
          bottom: -80px;
          width: 380px;
          height: 380px;
          z-index: 0;
        }
        .ag-orb span {
          position: absolute;
          border: 1px solid rgba(255, 255, 255, 0.09);
          border-radius: 50%;
        }
        .ag-ping {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 11px;
          height: 11px;
          margin: -5px 0 0 -5px;
          border-radius: 50%;
          background: #7eb2ff;
          font-style: normal;
        }
        .ag-ping::after {
          content: "";
          position: absolute;
          inset: -5px;
          border-radius: 50%;
          border: 2px solid rgba(126, 178, 255, 0.55);
          animation: ag-shell-ping 2.2s ease-out infinite;
        }
        @keyframes ag-shell-ping {
          0% {
            transform: scale(0.5);
            opacity: 1;
          }
          100% {
            transform: scale(3.4);
            opacity: 0;
          }
        }

        .ag-shell-brand-mobile {
          display: none;
        }

        /* ---- form panel ---- */
        .ag-shell-form {
          padding: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .ag-shell-form-card {
          width: 100%;
          display: flex;
          justify-content: center;
        }

        /* ---- mobile (< 860px): stacked, overlapping card, matches the app's mobile pattern ---- */
        @media (max-width: 860px) {
          .ag-shell-bg {
            padding: 0;
            align-items: stretch;
          }
          .ag-shell {
            grid-template-columns: 1fr;
            max-width: 100%;
            min-height: 100vh;
            border: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .ag-shell-hero {
            padding: 28px 22px 58px;
            align-items: center;
          }
          .ag-shell-brand-desktop,
          .ag-shell-headline,
          .ag-shell-subtext,
          .ag-shell-pills {
            display: none;
          }
          .ag-shell-brand-mobile {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
          }
          .ag-shell-wordmark {
            font-size: 22px;
            letter-spacing: -0.3px;
            margin-top: 12px;
          }
          .ag-shell-tagline {
            font-size: 12.5px;
            color: #b9c7de;
          }

          .ag-shell-form {
            padding: 0 14px 32px;
            margin-top: -40px;
            position: relative;
            z-index: 2;
          }
          .ag-shell-form-card {
            background: #fff;
            border: 1px solid #eef2f7;
            border-radius: 20px;
            padding: 20px 18px;
          }
        }
      `}</style>
    </div>


  );
}