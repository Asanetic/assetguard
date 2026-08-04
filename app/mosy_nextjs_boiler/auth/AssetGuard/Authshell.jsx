"use client";

import { Lock } from "lucide-react";
import { Brand } from "../../components/AssetGuard/Brand";
import DynamicModalProvider from "../../components/DynamicModalProvider";

const DEFAULT_PILLS = ["Live tracking", "Smart alerts", "Reporting", "Field ops"];

/**
 * Shared shell every auth screen sits inside: a navy hero panel on the left
 * (brand, headline, supporting copy, feature pills, decorative orb) and the
 * white form panel on the right. Stacks to a single column below 860px.
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
    <div
      className="d-flex flex-column align-items-center justify-content-center min-vh-100 px-3 py-5"
      style={{ backgroundColor: "#F5F7FB" }}
    >
      <div className="ag-shell">
        <div className="ag-shell-panel">
          <div className="ag-orb" aria-hidden="true">
            <span style={{ inset: 0 }} />
            <span style={{ inset: 64 }} />
            <span style={{ inset: 128 }} />
            <i className="ag-ping" />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            <Brand variant="drawer" />
            <div className="fw-bold text-white" style={{ fontSize: 34, lineHeight: 1.28, marginTop: 60 }}>
              {heroHeadline}
            </div>
            <p style={{ fontSize: 15.5, lineHeight: 1.7, color: "#B9C7DE", marginTop: 16, maxWidth: 330 }}>
              {heroSubtext}
            </p>
            {pills?.length > 0 && (
              <div className="d-flex flex-wrap" style={{ gap: 7, marginTop: 28 }}>
                {pills.map((p) => (
                  <span key={p} className="ag-pill">
                    {p}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="ag-shell-form">
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
            <DynamicModalProvider/>

            <div
              className="d-flex align-items-center justify-content-center gap-2 mt-4"
              style={{ fontSize: 12.5, color: "#94A3B8" }}
            >
              <Lock size={14} /> Secured by Symphony Technologies Limited — AssetGuard v1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}