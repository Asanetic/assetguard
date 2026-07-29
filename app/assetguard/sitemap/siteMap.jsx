"use client";

import React, { useMemo, useState } from "react";

const STATUS_CONFIG = {
  live: {
    label: "Live",
    color: "#10B981",
    bg: "#D1FAE5",
    text: "#065F46",
  },
  testing: {
    label: "Testing",
    color: "#F59E0B",
    bg: "#FEF3C7",
    text: "#92400E",
  },
  offline: {
    label: "Offline",
    color: "#EF4444",
    bg: "#FEE2E2",
    text: "#991B1B",
  },
  inactive: {
    label: "Inactive",
    color: "#8B5CF6",
    bg: "#EDE9FE",
    text: "#5B21B6",
  },
  maintenance: {
    label: "Maintenance",
    color: "#0EA5E9",
    bg: "#E0F2FE",
    text: "#075985",
  },
  smpms: {
    label: "SMPMS",
    color: "#EC4899",
    bg: "#FCE7F3",
    text: "#9D174D",
  },
  pending: {
    label: "Pending",
    color: "#64748B",
    bg: "#F1F5F9",
    text: "#475569",
  },
};

const SITES = [
  {
    id: 1,
    name: "Nairobi Headquarters",
    code: "NBI-HQ-001",
    location: "Westlands, Nairobi",
    devices: 14,
    status: "live",
    x: 38,
    y: 55,
  },
  {
    id: 2,
    name: "Mombasa Branch",
    code: "MBA-BR-002",
    location: "Nyali, Mombasa",
    devices: 9,
    status: "live",
    x: 67,
    y: 72,
  },
  {
    id: 3,
    name: "Kisumu Office",
    code: "KSM-OF-003",
    location: "Milimani, Kisumu",
    devices: 4,
    status: "testing",
    technician: "Brian Otieno",
    x: 16,
    y: 50,
  },
  {
    id: 4,
    name: "Nakuru Depot",
    code: "NKR-DP-004",
    location: "Industrial Area, Nakuru",
    devices: 7,
    status: "live",
    x: 52,
    y: 43,
  },
  {
    id: 5,
    name: "Eldoret Station",
    code: "ELD-ST-005",
    location: "Eldoret Town",
    devices: 3,
    status: "maintenance",
    technician: "Mercy Achieng",
    x: 28,
    y: 27,
  },
  {
    id: 6,
    name: "Athi River Plant",
    code: "ATR-PL-009",
    location: "Athi River, Machakos",
    devices: 8,
    status: "smpms",
    technician: "Daniel Kiprop",
    x: 73,
    y: 81,
  },
  {
    id: 7,
    name: "Thika Warehouse",
    code: "THK-WH-006",
    location: "Thika Road, Thika",
    devices: 0,
    status: "pending",
    x: 57,
    y: 60,
  },
  {
    id: 8,
    name: "Garissa Substation",
    code: "GRS-SB-007",
    location: "Garissa Town",
    devices: 5,
    status: "offline",
    x: 85,
    y: 37,
  },
  {
    id: 9,
    name: "Malindi Yard",
    code: "MLD-YD-008",
    location: "Malindi",
    devices: 6,
    status: "inactive",
    x: 88,
    y: 87,
  },
];

const FILTERS = [
  "all",
  "live",
  "testing",
  "offline",
  "inactive",
  "maintenance",
  "smpms",
  "pending",
];

export default function SitesMap() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [collapsed, setCollapsed] = useState(false);
  const [selectedSite, setSelectedSite] = useState(null);
  const [zoom, setZoom] = useState(1);

  const filteredSites = useMemo(() => {
    const query = search.trim().toLowerCase();

    return SITES.filter((site) => {
      const matchesStatus =
        filter === "all" || site.status === filter;

      const matchesSearch =
        !query ||
        site.name.toLowerCase().includes(query) ||
        site.code.toLowerCase().includes(query) ||
        site.location.toLowerCase().includes(query);

      return matchesStatus && matchesSearch;
    });
  }, [search, filter]);

  const statusCounts = useMemo(() => {
    return Object.keys(STATUS_CONFIG).reduce((result, status) => {
      result[status] = SITES.filter(
        (site) => site.status === status
      ).length;

      return result;
    }, {});
  }, []);

  const handleZoomIn = () => {
    setZoom((current) => Math.min(current + 0.1, 1.5));
  };

  const handleZoomOut = () => {
    setZoom((current) => Math.max(current - 0.1, 0.7));
  };

  return (
    <>
      <div className="sites-map-component">
        <div
          className={`sites-layout ${
            collapsed ? "sidebar-collapsed" : ""
          }`}
        >
          {/* =========================================
              SITES SIDEBAR
          ========================================= */}
          <aside className="sites-sidebar">
            <div className="sites-sidebar-header">
              <div className="sites-title-row">
                <h2>Sites</h2>

                <span className="sites-count">
                  {SITES.length}
                </span>
              </div>

              <div className="sites-search">
                <i className="ti ti-search" />

                <input
                  type="text"
                  placeholder="Search sites"
                  value={search}
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              <div className="sites-filters">
                {FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={
                      filter === item ? "active" : ""
                    }
                    onClick={() => setFilter(item)}
                  >
                    {item === "all"
                      ? "All"
                      : STATUS_CONFIG[item]?.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="sites-list">
              {filteredSites.map((site) => {
                const status =
                  STATUS_CONFIG[site.status];

                return (
                  <button
                    key={site.id}
                    type="button"
                    className={`site-row ${
                      selectedSite?.id === site.id
                        ? "selected"
                        : ""
                    }`}
                    onClick={() => setSelectedSite(site)}
                  >
                    <div className="site-main-row">
                      <strong>{site.name}</strong>

                      <span
                        className="site-status"
                        style={{
                          background: status.bg,
                          color: status.text,
                        }}
                      >
                        {status.label}
                      </span>
                    </div>

                    <div className="site-description">
                      {site.location} — {site.devices} devices ·{" "}
                      {site.code}
                    </div>

                    {site.technician && (
                      <div className="site-technician">
                        <span
                          className="technician-name"
                          style={{
                            color: status.color,
                          }}
                        >
                          <i className="ti ti-user-check" />

                          <span>
                            {site.technician} on site
                          </span>
                        </span>

                        <span className="via">
                          via Accyss
                        </span>
                      </div>
                    )}
                  </button>
                );
              })}

              {filteredSites.length === 0 && (
                <div className="empty-sites">
                  <i className="ti ti-map-pin-off" />
                  <span>No sites found</span>
                </div>
              )}
            </div>
          </aside>

          {/* =========================================
              COLLAPSE BUTTON
          ========================================= */}
          <button
            type="button"
            className="sidebar-toggle"
            onClick={() => setCollapsed(!collapsed)}
            aria-label={
              collapsed
                ? "Expand sites"
                : "Collapse sites"
            }
          >
            <i
              className={`ti ${
                collapsed
                  ? "ti-chevron-right"
                  : "ti-chevron-left"
              }`}
            />
          </button>

          {/* =========================================
              MAP
          ========================================= */}
          <main className="sites-map">
            <div
              className="map-content"
              style={{
                transform: `scale(${zoom})`,
              }}
            >
              <svg
                className="map-background"
                viewBox="0 0 700 644"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path
                  d="
                    M600 0
                    L700 0
                    L700 644
                    L520 644
                    C560 522 590 384 572 262
                    C562 182 582 81 600 0
                    Z
                  "
                  fill="#CFE3F5"
                />

                <path
                  d="
                    M0 212
                    C150 191 320 241 530 212
                  "
                  stroke="#FFFFFF"
                  strokeWidth="5"
                  fill="none"
                />

                <path
                  d="
                    M115 0
                    C152 201 190 423 162 644
                  "
                  stroke="#FFFFFF"
                  strokeWidth="4"
                  fill="none"
                />

                <path
                  d="
                    M0 433
                    C208 403 397 474 586 433
                  "
                  stroke="#F1E9D2"
                  strokeWidth="4"
                  fill="none"
                />

                <text
                  x="280"
                  y="300"
                  fill="#B7C4B4"
                  fontSize="15"
                  letterSpacing="3"
                >
                  CENTRAL
                </text>

                <text
                  x="490"
                  y="483"
                  fill="#B7C4B4"
                  fontSize="15"
                  letterSpacing="3"
                >
                  COAST
                </text>
              </svg>

              {SITES.map((site) => {
                const status =
                  STATUS_CONFIG[site.status];

                const visible =
                  filter === "all" ||
                  filter === site.status;

                if (!visible) return null;

                return (
                  <button
                    key={site.id}
                    type="button"
                    className={`map-pin ${
                      selectedSite?.id === site.id
                        ? "selected"
                        : ""
                    }`}
                    style={{
                      left: `${site.x}%`,
                      top: `${site.y}%`,
                      backgroundColor: status.color,
                    }}
                    onClick={() => setSelectedSite(site)}
                    title={site.name}
                  >
                    <i className="ti ti-map-pin" />
                  </button>
                );
              })}
            </div>

            {/* =========================================
                STATUS LEGEND
            ========================================= */}
            <div className="map-topbar">
              <div className="status-legend">
                {Object.entries(STATUS_CONFIG).map(
                  ([key, status]) => (
                    <button
                      key={key}
                      type="button"
                      className={`legend-item ${
                        filter === key ? "selected" : ""
                      }`}
                      onClick={() =>
                        setFilter(
                          filter === key ? "all" : key
                        )
                      }
                    >
                      <span
                        className="legend-dot"
                        style={{
                          background: status.color,
                        }}
                      />

                      {statusCounts[key]} {status.label}
                    </button>
                  )
                )}
              </div>

              <div className="user-avatar">JW</div>
            </div>

            {/* =========================================
                SITE POPUP
            ========================================= */}
            {selectedSite && (
              <div className="site-popup">
                <button
                  type="button"
                  className="popup-close"
                  onClick={() => setSelectedSite(null)}
                >
                  <i className="ti ti-x" />
                </button>

                <div className="popup-title">
                  <span
                    className="popup-status-dot"
                    style={{
                      background:
                        STATUS_CONFIG[
                          selectedSite.status
                        ].color,
                    }}
                  />

                  {selectedSite.name}
                </div>

                <div className="popup-code">
                  {selectedSite.code}
                </div>

                <div className="popup-details">
                  <div>
                    <span>Location</span>
                    <strong>
                      {selectedSite.location}
                    </strong>
                  </div>

                  <div>
                    <span>Devices</span>
                    <strong>
                      {selectedSite.devices}
                    </strong>
                  </div>

                  <div>
                    <span>Status</span>
                    <strong>
                      {
                        STATUS_CONFIG[
                          selectedSite.status
                        ].label
                      }
                    </strong>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================
                ZOOM
            ========================================= */}
            <div className="map-controls">
              <button
                type="button"
                onClick={handleZoomIn}
                aria-label="Zoom in"
              >
                +
              </button>

              <button
                type="button"
                onClick={handleZoomOut}
                aria-label="Zoom out"
              >
                −
              </button>
            </div>
          </main>
        </div>
      </div>

      <style jsx>{`
        .sites-map-component {
          width: 100%;
          height: calc(100vh - 70px);
          min-height: 480px;
          overflow: hidden;
          background: #ffffff;
          font-family:
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .sites-layout {
          width: 100%;
          height: 100%;
          display: grid;
          grid-template-columns: 292px 1fr;
          position: relative;
          transition: grid-template-columns 0.25s ease;
        }

        .sites-layout.sidebar-collapsed {
          grid-template-columns: 0 1fr;
        }

        /* =========================================
           SIDEBAR
        ========================================= */

        .sites-sidebar {
          min-width: 0;
          height: 100%;
          overflow: hidden;
          background: #ffffff;
          border-right: 1px solid #e9eef5;
          position: relative;
          z-index: 4;
        }

        .sites-sidebar-header {
          padding: 14px 7px 8px;
        }

        .sites-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 1px;
        }

        .sites-title-row h2 {
          margin: 0;
          color: #0f274a;
          font-size: 17px;
          line-height: 22px;
          font-weight: 750;
        }

        .sites-count {
          min-width: 24px;
          height: 19px;
          padding: 0 7px;
          display: inline-flex;
          justify-content: center;
          align-items: center;
          border-radius: 999px;
          background: #14315d;
          color: white;
          font-size: 11px;
          font-weight: 700;
        }

        .sites-search {
          position: relative;
          margin-top: 9px;
        }

        .sites-search i {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 14px;
          pointer-events: none;
        }

        .sites-search input {
          width: 100%;
          height: 37px;
          box-sizing: border-box;
          padding: 0 12px 0 34px;
          border: 1px solid #dce4ef;
          border-radius: 10px;
          outline: none;
          background: #ffffff;
          color: #0f274a;
          font-size: 12px;
          transition:
            border-color 0.15s ease,
            box-shadow 0.15s ease;
        }

        .sites-search input:focus {
          border-color: #2e6cf5;
          box-shadow: 0 0 0 3px rgba(46, 108, 245, 0.08);
        }

        .sites-search input::placeholder {
          color: #64748b;
        }

        /* =========================================
           FILTERS
        ========================================= */

        .sites-filters {
          display: flex;
          gap: 5px;
          overflow-x: auto;
          padding: 9px 0 3px;
          scrollbar-width: thin;
        }

        .sites-filters::-webkit-scrollbar {
          height: 3px;
        }

        .sites-filters::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
        }

        .sites-filters button {
          flex: none;
          height: 27px;
          padding: 0 11px;
          border: 1px solid #dbe4ef;
          border-radius: 999px;
          background: #ffffff;
          color: #334155;
          font-size: 10.5px;
          cursor: pointer;
          white-space: nowrap;
        }

        .sites-filters button.active {
          background: #14315d;
          border-color: #14315d;
          color: #ffffff;
        }

        /* =========================================
           SITE LIST
        ========================================= */

        .sites-list {
          height: calc(100% - 105px);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .sites-list::-webkit-scrollbar {
          width: 5px;
        }

        .sites-list::-webkit-scrollbar-thumb {
          background: #e2e8f0;
          border-radius: 20px;
        }

        .site-row {
          width: 100%;
          display: block;
          padding: 11px 14px 10px 7px;
          border: 0;
          border-bottom: 1px solid #e9eef5;
          background: #ffffff;
          text-align: left;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.15s ease;
        }

        .site-row:hover,
        .site-row.selected {
          background: #f8fbff;
        }

        .site-main-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .site-main-row strong {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          color: #0f274a;
          font-size: 13.5px;
          line-height: 18px;
          font-weight: 750;
        }

        .site-status {
          flex: none;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 10px;
          line-height: 14px;
          font-weight: 700;
        }

        .site-description {
          margin-top: 2px;
          color: #64748b;
          font-size: 11.3px;
          line-height: 16px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .site-technician {
          height: 27px;
          margin-top: 6px;
          padding: 0 8px;
          display: flex;
          align-items: center;
          gap: 7px;
          border: 1px solid #e5eaf1;
          border-radius: 5px;
          background: #ffffff;
          font-size: 10.5px;
        }

        .technician-name {
          display: flex;
          align-items: center;
          gap: 6px;
          min-width: 0;
        }

        .technician-name span {
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .technician-name i {
          flex: none;
          font-size: 13px;
        }

        .via {
          margin-left: auto;
          color: #94a3b8;
          white-space: nowrap;
        }

        .empty-sites {
          padding: 45px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
          font-size: 12px;
        }

        .empty-sites i {
          font-size: 25px;
        }

        /* =========================================
           COLLAPSE BUTTON
        ========================================= */

        .sidebar-toggle {
          position: absolute;
          left: 280px;
          top: 294px;
          width: 26px;
          height: 56px;
          display: flex;
          justify-content: center;
          align-items: center;
          padding: 0;
          border: 1px solid #dce4ef;
          border-left: 0;
          border-radius: 0 10px 10px 0;
          background: #ffffff;
          color: #64748b;
          z-index: 20;
          cursor: pointer;
          transition: left 0.25s ease;
        }

        .sidebar-collapsed .sidebar-toggle {
          left: 0;
        }

        /* =========================================
           MAP
        ========================================= */

        .sites-map {
          position: relative;
          min-width: 0;
          height: 100%;
          overflow: hidden;
          background: #eaf1e6;
        }

        .map-content {
          position: absolute;
          inset: 0;
          transform-origin: center;
          transition: transform 0.2s ease;
        }

        .map-background {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        /* =========================================
           MAP PINS
        ========================================= */

        .map-pin {
          position: absolute;
          width: 31px;
          height: 31px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: translate(-50%, -50%);
          border: 3px solid #ffffff;
          border-radius: 50%;
          color: #ffffff;
          cursor: pointer;
          z-index: 4;
          box-shadow:
            0 1px 3px rgba(15, 39, 74, 0.15),
            0 0 0 1px rgba(15, 39, 74, 0.05);
          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;
        }

        .map-pin i {
          font-size: 14px;
        }

        .map-pin:hover,
        .map-pin.selected {
          transform: translate(-50%, -50%) scale(1.16);
          box-shadow:
            0 4px 12px rgba(15, 39, 74, 0.22),
            0 0 0 3px rgba(255, 255, 255, 0.4);
        }

        /* =========================================
           MAP LEGEND
        ========================================= */

        .map-topbar {
          position: absolute;
          top: 13px;
          left: 13px;
          right: 10px;
          display: flex;
          align-items: center;
          gap: 15px;
          z-index: 10;
          pointer-events: none;
        }

        .status-legend {
          min-width: 0;
          display: flex;
          gap: 7px;
          overflow-x: auto;
          scrollbar-width: none;
          pointer-events: auto;
        }

        .status-legend::-webkit-scrollbar {
          display: none;
        }

        .legend-item {
          flex: none;
          height: 26px;
          padding: 0 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          border: 1px solid #e1e7ef;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.95);
          color: #475569;
          font-size: 10px;
          font-weight: 650;
          cursor: pointer;
          box-shadow: 0 1px 2px rgba(15, 39, 74, 0.03);
        }

        .legend-item.selected {
          border-color: #aab8ca;
          box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.5);
        }

        .legend-dot {
          width: 7px;
          height: 7px;
          flex: none;
          border-radius: 50%;
        }

        .user-avatar {
          flex: none;
          width: 39px;
          height: 39px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffffff;
          border-radius: 50%;
          background: #2e6cf5;
          color: #ffffff;
          font-size: 13px;
          font-weight: 750;
          pointer-events: auto;
          box-shadow: 0 1px 4px rgba(15, 39, 74, 0.15);
        }

        /* =========================================
           MAP CONTROLS
        ========================================= */

        .map-controls {
          position: absolute;
          right: 8px;
          bottom: 10px;
          z-index: 10;
          display: flex;
          flex-direction: column;
          gap: 7px;
        }

        .map-controls button {
          width: 31px;
          height: 31px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #e1e7ef;
          border-radius: 9px;
          background: #ffffff;
          color: #334155;
          font-size: 20px;
          font-weight: 700;
          cursor: pointer;
          box-shadow: 0 1px 3px rgba(15, 39, 74, 0.08);
        }

        /* =========================================
           POPUP
        ========================================= */

        .site-popup {
          position: absolute;
          left: 50%;
          bottom: 25px;
          width: 290px;
          padding: 16px;
          transform: translateX(-50%);
          border: 1px solid #e1e7ef;
          border-radius: 12px;
          background: #ffffff;
          z-index: 15;
          box-shadow: 0 10px 30px rgba(15, 39, 74, 0.16);
        }

        .popup-close {
          position: absolute;
          top: 9px;
          right: 9px;
          width: 26px;
          height: 26px;
          padding: 0;
          border: 0;
          border-radius: 6px;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
        }

        .popup-title {
          display: flex;
          align-items: center;
          gap: 7px;
          padding-right: 30px;
          color: #0f274a;
          font-size: 14px;
          font-weight: 750;
        }

        .popup-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .popup-code {
          margin: 3px 0 12px 15px;
          color: #94a3b8;
          font-size: 10px;
        }

        .popup-details {
          display: grid;
          grid-template-columns: 1fr 70px 80px;
          gap: 10px;
          padding-top: 10px;
          border-top: 1px solid #eef2f7;
        }

        .popup-details div {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .popup-details span {
          color: #94a3b8;
          font-size: 9px;
          text-transform: uppercase;
        }

        .popup-details strong {
          overflow: hidden;
          color: #334155;
          font-size: 11px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        /* =========================================
           RESPONSIVE
        ========================================= */

        @media (max-width: 800px) {
          .sites-layout {
            grid-template-columns: 260px 1fr;
          }

          .sidebar-toggle {
            left: 248px;
          }

          .sites-layout.sidebar-collapsed {
            grid-template-columns: 0 1fr;
          }

          .sidebar-collapsed .sidebar-toggle {
            left: 0;
          }
        }

        @media (max-width: 600px) {
          .sites-map-component {
            height: calc(100vh - 60px);
          }

          .sites-layout {
            grid-template-columns: min(82vw, 300px) 1fr;
          }

          .sidebar-toggle {
            left: calc(min(82vw, 300px) - 12px);
          }

          .sites-layout.sidebar-collapsed {
            grid-template-columns: 0 1fr;
          }

          .sidebar-collapsed .sidebar-toggle {
            left: 0;
          }

          .map-topbar {
            left: 10px;
          }

          .user-avatar {
            width: 35px;
            height: 35px;
          }
        }
      `}</style>
    </>
  );
}