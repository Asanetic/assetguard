// app/modulecomingsoon.jsx
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Compass, Search, LayoutGrid } from "lucide-react";
import availableModules from "./moduleRegistry";

const NAVY = "#14315D";
const BLUE = "#2E6CF5";

/**
 * ModuleComingSoon
 *
 * Drop this into any route that isn't built yet, or use it as the body of
 * app/not-found.jsx for a global 404. The module list is pulled from
 * appConfigs/moduleMenu.js (via app/registry.js) — same source the sidebar
 * uses — so it scales to however many modules the app has without editing
 * this file.
 *
 * Props:
 * - moduleName   Name of the module the user tried to reach (optional)
 * - description  One-line explainer shown under the heading (optional)
 * - homeHref     Where "Back to dashboard" points (default "/dashboard")
 */
export default function ModuleComingSoon({
  moduleName,
  description,
  homeHref = "/dashboard",
}) {
  const [query, setQuery] = useState("");

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? availableModules.filter(
          (m) =>
            m.name.toLowerCase().includes(q) ||
            m.group.toLowerCase().includes(q)
        )
      : availableModules;

    const byGroup = new Map();
    for (const m of filtered) {
      if (!byGroup.has(m.group)) byGroup.set(m.group, []);
      byGroup.get(m.group).push(m);
    }
    return Array.from(byGroup.entries());
  }, [query]);

  const totalCount = availableModules.length;
  const visibleCount = groups.reduce((n, [, items]) => n + items.length, 0);

  return (
    <div
      className="d-flex align-items-center justify-content-center min-vh-100 px-3 py-5"
      style={{
        background:
          "radial-gradient(1200px 600px at 50% -10%, #eef3ff 0%, #f7f9fc 55%, #f7f9fc 100%)",
      }}
    >
      <div className="w-100" style={{ maxWidth: 760 }}>
        <div
          className="bg-white"
          style={{
            borderRadius: 20,
            border: "1px solid #e7ecf5",
            boxShadow: "0 24px 60px -24px rgba(20, 49, 93, 0.25)",
            overflow: "hidden",
          }}
        >
          {/* Hero */}
          <div className="text-center p-4 p-md-5 pb-4">
            <div
              className="d-inline-flex align-items-center justify-content-center mb-4"
              style={{
                width: 60,
                height: 60,
                borderRadius: 16,
                background: `linear-gradient(135deg, ${NAVY} 0%, ${BLUE} 100%)`,
              }}
            >
              <Compass size={26} color="#fff" strokeWidth={1.75} />
            </div>

            <div
              className="d-inline-flex align-items-center gap-2 px-3 py-1 mb-3"
              style={{
                borderRadius: 999,
                background: "#EEF3FF",
                color: BLUE,
                fontSize: 12.5,
                fontWeight: 700,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              Coming soon
            </div>

            <h1 className="mb-2" style={{ color: NAVY, fontWeight: 800, fontSize: "1.6rem" }}>
              {moduleName ? `${moduleName} is under development` : "Module under development"}
            </h1>

            <p className="text-muted mb-4 mx-auto" style={{ fontSize: 14.5, lineHeight: 1.6, maxWidth: 460 }}>
              {description ||
                "We're still building this module. In the meantime, here's everything that's already available."}
            </p>

            {/* <Link
              href={homeHref}
              className="d-inline-flex align-items-center gap-2"
              style={{
                color: "#fff",
                background: NAVY,
                borderRadius: 10,
                padding: "10px 18px",
                fontSize: 14,
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              <ArrowLeft size={16} />
              Back to dashboard
            </Link> */}
          </div>

          {/* Module browser */}
          <div style={{ borderTop: "1px solid #e7ecf5", background: "#fafbfd" }}>
            <div className="d-flex align-items-center justify-content-between px-4 pt-3 pb-2">
              <span
                className="d-flex align-items-center gap-2 text-uppercase"
                style={{ color: "#8a94a6", fontSize: 11.5, fontWeight: 700, letterSpacing: 0.5 }}
              >
                <LayoutGrid size={14} />
                {visibleCount} of {totalCount} modules
              </span>
            </div>

            <div className="px-4 pb-3">
              <div
                className="d-flex align-items-center gap-2 px-3"
                style={{
                  background: "#fff",
                  border: "1px solid #e7ecf5",
                  borderRadius: 10,
                  height: 40,
                }}
              >
                <Search size={16} color="#8a94a6" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search modules…"
                  className="border-0 flex-grow-1"
                  style={{ outline: "none", fontSize: 14, background: "transparent" }}
                />
              </div>
            </div>

            <div
              className="px-4 pb-4"
              style={{ maxHeight: 380, overflowY: "auto" }}
            >
              {groups.length === 0 && (
                <div className="text-center text-muted py-4" style={{ fontSize: 13.5 }}>
                  No modules match “{query}”.
                </div>
              )}

              {groups.map(([groupName, items]) => (
                <div key={groupName} className="mb-3">
                  <div
                    className="mb-2"
                    style={{ color: "#8a94a6", fontSize: 11.5, fontWeight: 700, letterSpacing: 0.3 }}
                  >
                    {groupName}
                  </div>
                  <div
                    className="d-grid"
                    style={{
                      gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                      gap: 8,
                    }}
                  >
                    {items.map((m) => {
                      const Icon = m.icon;
                      return (
                        <Link
                          key={m.key}
                          href={m.href}
                          className="d-flex align-items-center gap-2 px-3 py-2 module-link"
                          style={{
                            borderRadius: 10,
                            border: "1px solid #e7ecf5",
                            background: "#fff",
                            textDecoration: "none",
                            transition: "border-color .15s ease, background .15s ease",
                          }}
                        >
                          {Icon ? (
                            <Icon size={15} color={m.color || BLUE} strokeWidth={2} />
                          ) : null}
                          <span
                            className="text-truncate"
                            style={{ color: NAVY, fontWeight: 600, fontSize: 13.5 }}
                          >
                            {m.name}
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .module-link:hover {
          border-color: ${BLUE} !important;
          background: #f7faff !important;
        }
      `}</style>
    </div>
  );
}