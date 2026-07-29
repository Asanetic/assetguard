"use client";

import React, { useMemo, useState } from "react";

const STATUS = {
  Live: {
    color: "#10B981",
    bg: "#D1FAE5",
    text: "#047857",
  },
  Offline: {
    color: "#EF4444",
    bg: "#FEE2E2",
    text: "#B91C1C",
  },
  Testing: {
    color: "#F59E0B",
    bg: "#FEF3C7",
    text: "#B45309",
  },
  Inactive: {
    color: "#8B5CF6",
    bg: "#EDE9FE",
    text: "#6D28D9",
  },
  Maintenance: {
    color: "#0EA5E9",
    bg: "#E0F2FE",
    text: "#0369A1",
  },
};

const SITE_POSITIONS = {
  "NBI-HQ-001": {
    x: 46,
    y: 41,
    name: "Nairobi Headquarters",
  },
  "MBA-BR-002": {
    x: 75,
    y: 74,
    name: "Mombasa Branch",
  },
  "KSM-OF-003": {
    x: 15,
    y: 40,
    name: "Kisumu Office",
  },
  "NKR-DP-004": {
    x: 34,
    y: 36,
    name: "Nakuru Depot",
  },
  "ELD-ST-005": {
    x: 22,
    y: 26,
    name: "Eldoret Station",
  },
  "GRS-SB-007": {
    x: 72,
    y: 28,
    name: "Garissa Substation",
  },
  "MLD-YD-008": {
    x: 82,
    y: 58,
    name: "Malindi Yard",
  },
  "ATR-PL-009": {
    x: 58,
    y: 52,
    name: "Athi River Plant",
  },
};

const DEVICES = [
  {
    id: "001_NairobiHeadquarters_V",
    code: "NBI-HQ-001",
    orientation: "Vertical",
    imei: "352093...34561",
    battery: 87,
    data: "2.1GB",
    seen: "2 min ago",
    status: "Live",
    speed: "0 km/h",
  },
  {
    id: "001_NairobiHeadquarters_H",
    code: "NBI-HQ-001",
    orientation: "Horizontal",
    imei: "352093...34562",
    battery: 92,
    data: "3.4GB",
    seen: "5 min ago",
    status: "Live",
    speed: "0 km/h",
  },
  {
    id: "002_MombasaBranch_H",
    code: "MBA-BR-002",
    orientation: "Horizontal",
    imei: "352093...34567",
    battery: 65,
    data: "0.8GB",
    seen: "3 min ago",
    status: "Live",
    speed: "42 km/h",
  },
  {
    id: "002_MombasaBranch_V",
    code: "MBA-BR-002",
    orientation: "Vertical",
    imei: "352093...34568",
    battery: 74,
    data: "4.2GB",
    seen: "3 min ago",
    status: "Live",
    speed: "0 km/h",
  },
  {
    id: "003_KisumuOffice_V",
    code: "KSM-OF-003",
    orientation: "Vertical",
    imei: "352093...34573",
    battery: 12,
    data: "0.1GB",
    seen: "3 hrs ago",
    status: "Offline",
    speed: "—",
  },
  {
    id: "004_NakuruDepot_H",
    code: "NKR-DP-004",
    orientation: "Horizontal",
    imei: "352093...34579",
    battery: 95,
    data: "4.9GB",
    seen: "1 min ago",
    status: "Live",
    speed: "8 km/h",
  },
  {
    id: "004_NakuruDepot_V",
    code: "NKR-DP-004",
    orientation: "Vertical",
    imei: "352093...34580",
    battery: 81,
    data: "3.0GB",
    seen: "1 min ago",
    status: "Live",
    speed: "0 km/h",
  },
  {
    id: "005_EldoretStation_H",
    code: "ELD-ST-005",
    orientation: "Horizontal",
    imei: "352093...34584",
    battery: 55,
    data: "1.5GB",
    seen: "20 min ago",
    status: "Maintenance",
    speed: "—",
  },
  {
    id: "005_EldoretStation_V",
    code: "ELD-ST-005",
    orientation: "Vertical",
    imei: "352093...34585",
    battery: 60,
    data: "2.0GB",
    seen: "20 min ago",
    status: "Testing",
    speed: "—",
  },
  {
    id: "007_GarissaSubstation_H",
    code: "GRS-SB-007",
    orientation: "Horizontal",
    imei: "352093...34590",
    battery: 54,
    data: "0.0GB",
    seen: "2 days ago",
    status: "Inactive",
    speed: "—",
  },
  {
    id: "008_MalindiYard_V",
    code: "MLD-YD-008",
    orientation: "Vertical",
    imei: "352093...34594",
    battery: 40,
    data: "0.0GB",
    seen: "1 day ago",
    status: "Inactive",
    speed: "—",
  },
  {
    id: "008_MalindiYard_H",
    code: "MLD-YD-008",
    orientation: "Horizontal",
    imei: "352093...34595",
    battery: 44,
    data: "0.0GB",
    seen: "1 day ago",
    status: "Inactive",
    speed: "—",
  },
  {
    id: "009_AthiRiverPlant_V",
    code: "ATR-PL-009",
    orientation: "Vertical",
    imei: "352093...34599",
    battery: 90,
    data: "3.8GB",
    seen: "4 min ago",
    status: "Live",
    speed: "0 km/h",
  },
  {
    id: "009_AthiRiverPlant_H",
    code: "ATR-PL-009",
    orientation: "Horizontal",
    imei: "352093...34600",
    battery: 85,
    data: "2.9GB",
    seen: "4 min ago",
    status: "Live",
    speed: "12 km/h",
  },
];

const FILTERS = [
  "All",
  "Live",
  "Offline",
  "Testing",
  "Inactive",
  "Maintenance",
];

export default function DeviceMap() {
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);

  /*
  |--------------------------------------------------------------------------
  | Filter devices
  |--------------------------------------------------------------------------
  */

  const filteredDevices = useMemo(() => {
    const q = search.trim().toLowerCase();

    return DEVICES.filter((device) => {
      const statusMatch =
        filter === "All" || device.status === filter;

      const site = SITE_POSITIONS[device.code];

      const searchMatch =
        !q ||
        device.id.toLowerCase().includes(q) ||
        device.code.toLowerCase().includes(q) ||
        device.imei.toLowerCase().includes(q) ||
        site?.name.toLowerCase().includes(q);

      return statusMatch && searchMatch;
    });
  }, [filter, search]);

  /*
  |--------------------------------------------------------------------------
  | Status counts
  |--------------------------------------------------------------------------
  */

  const counts = useMemo(() => {
    const result = {};

    Object.keys(STATUS).forEach((status) => {
      result[status] = DEVICES.filter(
        (device) => device.status === status
      ).length;
    });

    return result;
  }, []);

  /*
  |--------------------------------------------------------------------------
  | Group devices into map clusters
  |--------------------------------------------------------------------------
  */

  const clusters = useMemo(() => {
    const grouped = {};

    filteredDevices.forEach((device) => {
      if (!grouped[device.code]) {
        grouped[device.code] = [];
      }

      grouped[device.code].push(device);
    });

    return Object.entries(grouped).map(
      ([code, devices]) => ({
        code,
        devices,
        ...SITE_POSITIONS[code],
      })
    );
  }, [filteredDevices]);

  const selectCluster = (cluster) => {
    if (cluster.devices.length === 1) {
      setSelectedDevice(cluster.devices[0]);
      return;
    }

    setSelectedDevice(cluster.devices[0]);
  };

  return (
    <>
      <div className="device-map-page">
        <div
          className={`device-layout ${
            collapsed ? "sidebar-collapsed" : ""
          }`}
        >
          {/* =====================================================
              DEVICE SIDEBAR
          ====================================================== */}

          <aside className="device-sidebar">
            <div className="sidebar-header">
              <div className="device-heading">
                <div className="heading-left">
                  <h2>Devices</h2>

                  <span className="device-count">
                    {DEVICES.length}
                  </span>
                </div>

                <span className="device-heading-link">
                  Devices
                </span>
              </div>

              {/* Search */}

              <div className="device-search">
                <i className="ti ti-search" />

                <input
                  type="text"
                  value={search}
                  placeholder="Search devices..."
                  onChange={(event) =>
                    setSearch(event.target.value)
                  }
                />
              </div>

              {/* Filters */}

              <div className="device-filters">
                {FILTERS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={
                      filter === item ? "active" : ""
                    }
                    onClick={() => setFilter(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>

            {/* =================================================
                DEVICE LIST
            ================================================== */}

            <div className="device-list">
              {filteredDevices.map((device) => {
                const status = STATUS[device.status];

                const site =
                  SITE_POSITIONS[device.code];

                const selected =
                  selectedDevice?.id === device.id;

                return (
                  <button
                    type="button"
                    key={device.id}
                    className={`device-card ${
                      selected ? "selected" : ""
                    }`}
                    onClick={() =>
                      setSelectedDevice(device)
                    }
                  >
                    {/* Device title */}

                    <div className="device-title-row">
                      <strong>{device.id}</strong>

                      <div className="device-title-actions">
                        <span className="orientation">
                          {device.orientation ===
                          "Vertical"
                            ? "V"
                            : "H"}
                        </span>

                        <span
                          className="status-badge"
                          style={{
                            background: status.bg,
                            color: status.text,
                          }}
                        >
                          {device.status}
                        </span>
                      </div>
                    </div>

                    {/* Site */}

                    <div className="device-site">
                      {site?.name} · {device.code}
                    </div>

                    {/* IMEI */}

                    <div className="device-imei">
                      {device.imei}
                    </div>

                    {/* Stats */}

                    <div className="device-stats">
                      <span className="device-stat battery">
                        <i className="ti ti-battery-3" />

                        {device.battery}%
                      </span>

                      <span className="device-stat">
                        <i className="ti ti-chart-bar" />

                        {device.data}
                      </span>
                    </div>
                  </button>
                );
              })}

              {filteredDevices.length === 0 && (
                <div className="no-devices">
                  <i className="ti ti-cpu-off" />

                  <span>
                    No devices match your filters
                  </span>
                </div>
              )}
            </div>
          </aside>

          {/* =====================================================
              SIDEBAR COLLAPSE
          ====================================================== */}

          <button
            type="button"
            className="collapse-handle"
            onClick={() => setCollapsed(!collapsed)}
          >
            <i
              className={`ti ${
                collapsed
                  ? "ti-chevron-right"
                  : "ti-chevron-left"
              }`}
            />
          </button>

          {/* =====================================================
              MAP
          ====================================================== */}

          <main className="map-area">
            {/* Map background */}

            <svg
              className="map-svg"
              viewBox="0 0 700 644"
              preserveAspectRatio="none"
            >
              {/* Ocean */}

              <path
                d="
                M650 0
                L700 0
                L700 644
                L610 644
                C630 560 655 485 670 400
                C685 310 665 220 650 0
                Z
                "
                fill="#CFE3F5"
              />

              {/* Lake Victoria */}

              <ellipse
                cx="130"
                cy="430"
                rx="65"
                ry="42"
                fill="#A9CDF8"
              />

              {/* Roads */}

              <path
                d="M100 0 C110 180 140 350 150 644"
                stroke="#FFFFFF"
                strokeWidth="5"
                fill="none"
              />

              <path
                d="M0 260 C200 245 410 280 700 245"
                stroke="#FFFFFF"
                strokeWidth="5"
                fill="none"
              />

              <path
                d="M0 555 C240 530 450 580 700 540"
                stroke="#F2E8CE"
                strokeWidth="4"
                fill="none"
              />

              {/* Map labels */}

              <text
                x="76"
                y="497"
                fill="#8EB5E8"
                fontSize="13"
                letterSpacing="1"
              >
                L. VICTORIA
              </text>
            </svg>

            {/* =================================================
                STATUS LEGEND
            ================================================== */}

            <div className="map-top">
              <div className="map-legend">
                {Object.entries(STATUS).map(
                  ([name, config]) => {
                    const count = counts[name];

                    if (!count) return null;

                    return (
                      <button
                        type="button"
                        key={name}
                        className={
                          filter === name
                            ? "legend selected"
                            : "legend"
                        }
                        onClick={() =>
                          setFilter(
                            filter === name
                              ? "All"
                              : name
                          )
                        }
                      >
                        <span
                          className="legend-dot"
                          style={{
                            background: config.color,
                          }}
                        />

                        <strong>{count}</strong>

                        {name}
                      </button>
                    );
                  }
                )}
              </div>

              <div className="avatar">JW</div>
            </div>

            {/* =================================================
                DEVICE CLUSTERS
            ================================================== */}

            {clusters.map((cluster) => {
              const primary =
                cluster.devices[0];

              const config =
                STATUS[primary.status];

              const allLive =
                cluster.devices.every(
                  (device) =>
                    device.status === "Live"
                );

              return (
                <button
                  type="button"
                  key={cluster.code}
                  className={`device-marker ${
                    selectedDevice?.code ===
                    cluster.code
                      ? "selected"
                      : ""
                  }`}
                  style={{
                    left: `${cluster.x}%`,
                    top: `${cluster.y}%`,
                    "--marker-color":
                      config.color,
                  }}
                  onClick={() =>
                    selectCluster(cluster)
                  }
                  title={cluster.name}
                >
                  <span
                    className="marker-shell"
                    style={{
                      background:
                        config.color,
                    }}
                  >
                    <i className="ti ti-cpu" />
                  </span>

                  {cluster.devices.length > 1 && (
                    <span className="cluster-count">
                      {cluster.devices.length}
                    </span>
                  )}

                  {allLive && (
                    <span className="live-pulse" />
                  )}
                </button>
              );
            })}

            {/* =================================================
                DEVICE DETAILS
            ================================================== */}

            {selectedDevice && (
              <div className="device-popup">
                <button
                  type="button"
                  className="popup-close"
                  onClick={() =>
                    setSelectedDevice(null)
                  }
                >
                  <i className="ti ti-x" />
                </button>

                <div className="popup-header">
                  <span
                    className="popup-icon"
                    style={{
                      background:
                        STATUS[
                          selectedDevice.status
                        ].color,
                    }}
                  >
                    <i className="ti ti-cpu" />
                  </span>

                  <div>
                    <strong>
                      {selectedDevice.id}
                    </strong>

                    <span>
                      {
                        SITE_POSITIONS[
                          selectedDevice.code
                        ]?.name
                      }
                    </span>
                  </div>
                </div>

                <div className="popup-grid">
                  <div>
                    <span>Status</span>

                    <strong>
                      {selectedDevice.status}
                    </strong>
                  </div>

                  <div>
                    <span>Battery</span>

                    <strong>
                      {selectedDevice.battery}%
                    </strong>
                  </div>

                  <div>
                    <span>Data</span>

                    <strong>
                      {selectedDevice.data}
                    </strong>
                  </div>

                  <div>
                    <span>Speed</span>

                    <strong>
                      {selectedDevice.speed}
                    </strong>
                  </div>
                </div>

                <div className="popup-footer">
                  Last seen {selectedDevice.seen}
                </div>
              </div>
            )}
          </main>
        </div>
      </div>

      <style jsx>{`
        .device-map-page {
          width: 100%;
          height: calc(100vh - 70px);
          min-height: 480px;
          overflow: hidden;
          background: #fff;
          font-family:
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .device-layout {
          position: relative;
          display: grid;
          grid-template-columns: 298px 1fr;
          width: 100%;
          height: 100%;
          transition: grid-template-columns 0.25s ease;
        }

        .device-layout.sidebar-collapsed {
          grid-template-columns: 0 1fr;
        }

        /* =====================================================
           SIDEBAR
        ====================================================== */

        .device-sidebar {
          min-width: 0;
          height: 100%;
          overflow: hidden;
          background: #fff;
          border-right: 1px solid #e2e8f0;
          z-index: 5;
        }

        .sidebar-header {
          padding: 15px 13px 10px;
        }

        .device-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .heading-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .heading-left h2 {
          margin: 0;
          color: #0f274a;
          font-size: 20px;
          line-height: 25px;
          font-weight: 800;
        }

        .device-count {
          min-width: 28px;
          height: 19px;
          padding: 0 7px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          box-sizing: border-box;
          border-radius: 999px;
          background: #14315d;
          color: #fff;
          font-size: 10px;
          font-weight: 800;
        }

        .device-heading-link {
          color: #8aa0c1;
          font-size: 10px;
        }

        /* =====================================================
           SEARCH
        ====================================================== */

        .device-search {
          position: relative;
          margin-top: 15px;
        }

        .device-search i {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 15px;
        }

        .device-search input {
          width: 100%;
          height: 39px;
          box-sizing: border-box;
          padding: 0 13px 0 34px;
          border: 1px solid #dbe3ee;
          border-radius: 10px;
          outline: none;
          background: #fff;
          color: #0f274a;
          font-family: inherit;
          font-size: 12px;
        }

        .device-search input:focus {
          border-color: #2e6cf5;
          box-shadow: 0 0 0 3px
            rgba(46, 108, 245, 0.08);
        }

        /* =====================================================
           FILTERS
        ====================================================== */

        .device-filters {
          display: flex;
          gap: 6px;
          margin-top: 9px;
          padding-bottom: 1px;
          overflow-x: auto;
          scrollbar-width: none;
        }

        .device-filters::-webkit-scrollbar {
          display: none;
        }

        .device-filters button {
          flex: none;
          height: 27px;
          padding: 0 13px;
          border: 1px solid #dbe3ee;
          border-radius: 999px;
          background: #fff;
          color: #334155;
          font-family: inherit;
          font-size: 10.5px;
          font-weight: 500;
          cursor: pointer;
        }

        .device-filters button.active {
          border-color: #14315d;
          background: #14315d;
          color: #fff;
          font-weight: 700;
        }

        /* =====================================================
           LIST
        ====================================================== */

        .device-list {
          height: calc(100% - 128px);
          padding: 0 13px 15px;
          overflow-y: auto;
        }

        .device-list::-webkit-scrollbar {
          width: 5px;
        }

        .device-list::-webkit-scrollbar-thumb {
          border-radius: 99px;
          background: #e2e8f0;
        }

        /* =====================================================
           DEVICE CARD
        ====================================================== */

        .device-card {
          width: 100%;
          margin-bottom: 8px;
          padding: 10px 12px 10px;
          display: block;
          box-sizing: border-box;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          background: #fff;
          text-align: left;
          font-family: inherit;
          cursor: pointer;
          transition:
            border-color 0.15s ease,
            background 0.15s ease,
            box-shadow 0.15s ease;
        }

        .device-card:hover {
          border-color: #cbd5e1;
          background: #fbfdff;
        }

        .device-card.selected {
          border-color: #2e6cf5;
          background: #f8fbff;
          box-shadow: 0 0 0 2px
            rgba(46, 108, 245, 0.07);
        }

        .device-title-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 7px;
        }

        .device-title-row strong {
          min-width: 0;
          overflow: hidden;
          color: #0f274a;
          font-size: 12.5px;
          font-weight: 800;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .device-title-actions {
          flex: none;
          display: flex;
          align-items: center;
          gap: 7px;
        }

        .orientation {
          width: 17px;
          height: 17px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 5px;
          background: #dbe7fe;
          color: #2e6cf5;
          font-size: 9px;
          font-weight: 800;
        }

        .status-badge {
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 9px;
          line-height: 14px;
          font-weight: 700;
        }

        .device-site {
          margin-top: 4px;
          overflow: hidden;
          color: #64748b;
          font-size: 10.5px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .device-imei {
          margin-top: 2px;
          color: #8aa0c1;
          font-size: 10px;
        }

        .device-stats {
          display: flex;
          align-items: center;
          gap: 7px;
          margin-top: 6px;
        }

        .device-stat {
          height: 21px;
          padding: 0 7px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          box-sizing: border-box;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #f8fafc;
          color: #334155;
          font-size: 9.5px;
          font-weight: 700;
        }

        .device-stat i {
          color: #64748b;
          font-size: 10px;
        }

        .device-stat.battery {
          color: #059669;
        }

        .device-stat.battery i {
          color: #059669;
        }

        /* =====================================================
           EMPTY
        ====================================================== */

        .no-devices {
          padding: 45px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 7px;
          color: #94a3b8;
          font-size: 12px;
        }

        .no-devices i {
          font-size: 25px;
        }

        /* =====================================================
           COLLAPSE
        ====================================================== */

        .collapse-handle {
          position: absolute;
          top: 285px;
          left: 297px;
          width: 27px;
          height: 43px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #dbe3ee;
          border-left: 0;
          border-radius: 0 8px 8px 0;
          background: #fff;
          color: #64748b;
          z-index: 30;
          cursor: pointer;
          transition: left 0.25s ease;
        }

        .sidebar-collapsed .collapse-handle {
          left: 0;
        }

        /* =====================================================
           MAP
        ====================================================== */

        .map-area {
          position: relative;
          min-width: 0;
          height: 100%;
          overflow: hidden;
          background: #eaf1e6;
        }

        .map-svg {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }

        /* =====================================================
           LEGEND
        ====================================================== */

        .map-top {
          position: absolute;
          top: 10px;
          left: 15px;
          right: 8px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          pointer-events: none;
        }

        .map-legend {
          min-width: 0;
          display: flex;
          gap: 7px;
          overflow-x: auto;
          scrollbar-width: none;
          pointer-events: auto;
        }

        .map-legend::-webkit-scrollbar {
          display: none;
        }

        .legend {
          flex: none;
          height: 27px;
          padding: 0 11px;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          border: 1px solid #dfe6ee;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.96);
          color: #334155;
          font-family: inherit;
          font-size: 10px;
          cursor: pointer;
        }

        .legend strong {
          color: #0f274a;
          font-size: 10px;
        }

        .legend.selected {
          box-shadow: 0 0 0 2px
            rgba(255, 255, 255, 0.7);
          border-color: #aebccc;
        }

        .legend-dot {
          width: 7px;
          height: 7px;
          flex: none;
          border-radius: 50%;
        }

        .avatar {
          width: 38px;
          height: 38px;
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
          border-radius: 50%;
          background: #2e6cf5;
          color: #fff;
          font-size: 12px;
          font-weight: 800;
          pointer-events: auto;
        }

        /* =====================================================
           DEVICE MARKERS
        ====================================================== */

        .device-marker {
          position: absolute;
          width: 43px;
          height: 43px;
          padding: 0;
          transform: translate(-50%, -50%);
          border: 0;
          background: transparent;
          z-index: 10;
          cursor: pointer;
        }

        .marker-shell {
          position: absolute;
          inset: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 3px solid #fff;
          border-radius: 10px;
          color: #fff;
          box-shadow:
            0 2px 5px rgba(15, 39, 74, 0.22),
            0 0 0 1px
              rgba(15, 39, 74, 0.05);
          z-index: 3;
          transition: transform 0.15s ease;
        }

        .marker-shell i {
          font-size: 18px;
        }

        .device-marker:hover .marker-shell,
        .device-marker.selected .marker-shell {
          transform: scale(1.12);
        }

        .cluster-count {
          position: absolute;
          top: -1px;
          right: -2px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          box-sizing: border-box;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #fff;
          border-radius: 999px;
          background: #14315d;
          color: #fff;
          font-size: 9px;
          font-weight: 800;
          z-index: 5;
        }

        .live-pulse {
          position: absolute;
          inset: -4px;
          border: 2px solid
            rgba(16, 185, 129, 0.2);
          border-radius: 15px;
          animation: devicePulse 2s infinite;
        }

        @keyframes devicePulse {
          0% {
            transform: scale(0.8);
            opacity: 0.8;
          }

          70% {
            transform: scale(1.25);
            opacity: 0;
          }

          100% {
            transform: scale(1.25);
            opacity: 0;
          }
        }

        /* =====================================================
           POPUP
        ====================================================== */

        .device-popup {
          position: absolute;
          left: 50%;
          bottom: 22px;
          width: 310px;
          padding: 15px;
          box-sizing: border-box;
          transform: translateX(-50%);
          border: 1px solid #e2e8f0;
          border-radius: 13px;
          background: #fff;
          z-index: 30;
          box-shadow: 0 12px 35px
            rgba(15, 39, 74, 0.18);
        }

        .popup-close {
          position: absolute;
          top: 8px;
          right: 8px;
          width: 26px;
          height: 26px;
          padding: 0;
          border: 0;
          border-radius: 6px;
          background: #f8fafc;
          color: #64748b;
          cursor: pointer;
        }

        .popup-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding-right: 30px;
        }

        .popup-icon {
          width: 34px;
          height: 34px;
          flex: none;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          color: #fff;
        }

        .popup-icon i {
          font-size: 18px;
        }

        .popup-header div {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .popup-header strong {
          overflow: hidden;
          color: #0f274a;
          font-size: 12px;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .popup-header span {
          margin-top: 2px;
          color: #64748b;
          font-size: 10px;
        }

        .popup-grid {
          display: grid;
          grid-template-columns:
            repeat(4, 1fr);
          gap: 8px;
          margin-top: 14px;
          padding-top: 11px;
          border-top: 1px solid #eef2f7;
        }

        .popup-grid div {
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .popup-grid span {
          color: #94a3b8;
          font-size: 8.5px;
          text-transform: uppercase;
        }

        .popup-grid strong {
          color: #334155;
          font-size: 10px;
        }

        .popup-footer {
          margin-top: 10px;
          color: #94a3b8;
          font-size: 9.5px;
        }

        /* =====================================================
           RESPONSIVE
        ====================================================== */

        @media (max-width: 800px) {
          .device-layout {
            grid-template-columns: 275px 1fr;
          }

          .collapse-handle {
            left: 274px;
          }

          .device-layout.sidebar-collapsed {
            grid-template-columns: 0 1fr;
          }

          .sidebar-collapsed
            .collapse-handle {
            left: 0;
          }
        }

        @media (max-width: 600px) {
          .device-layout {
            grid-template-columns:
              min(85vw, 300px) 1fr;
          }

          .collapse-handle {
            left: calc(
              min(85vw, 300px) - 1px
            );
          }

          .device-layout.sidebar-collapsed {
            grid-template-columns: 0 1fr;
          }

          .sidebar-collapsed
            .collapse-handle {
            left: 0;
          }

          .device-popup {
            width: calc(100% - 30px);
          }
        }
      `}</style>
    </>
  );
}