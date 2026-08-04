import { mosyFlexSelect, toNum } from "../../../apiUtils/dataControl/dataUtils";
import { processAuthToken } from "../../../auth/authManager";

function bucketRowsByTank(rows = []) {
  const map = new Map();

  for (const row of rows) {
    const tankId = String(row?.tank_id || "").trim() || "unknown";
    const tankName = String(row?.tank_name || row?.tank_id || "Unknown Tank");

    if (!map.has(tankId)) {
      map.set(tankId, { tank_id: tankId, tank_name: tankName, data: [] });
    }

    map.get(tankId).data.push({
      period: row?.period,
      value: Number(row?.value || 0),
    });
  }

  return Array.from(map.values());
}

export async function GET(request) {
  const { valid: isTokenValid, reason: tokenError, data: authData } = processAuthToken(request);

  if (!isTokenValid) {
    return Response.json(
      { status: "unauthorized", message: tokenError },
      { status: 403 }
    );
  }

  const safeHiveSiteId = String(authData?.hive_site_id || "").replace(/'/g, "\\'");
  const siteWhere = safeHiveSiteId ? `WHERE hive_site_id='${safeHiveSiteId}'` : "";

  const totalStationsQ = {
    tbl: "fuel_stations",
    colstr: btoa("COUNT(*) as total_stations"),
    q: btoa(siteWhere),
  };

  const totalDevicesQ = {
    tbl: "tank_devices",
    colstr: btoa("COUNT(*) as total_devices"),
    q: btoa(siteWhere),
  };

  const activeDevicesQ = {
    tbl: "tank_devices",
    colstr: btoa("COUNT(*) as active_devices"),
    q: btoa(`${siteWhere} ${siteWhere ? "AND" : "WHERE"} LOWER(status)='active'`),
  };

  const totalPumpsQ = {
    tbl: "fuel_pumps",
    colstr: btoa("COUNT(*) as total_pumps"),
    q: btoa(siteWhere),
  };

  const movementByDayQ = {
    tbl: "tank_level_history",
    colstr: btoa(
      "tank_level_history.tank_id, COALESCE(t.tank_name, tank_level_history.tank_id, 'Unknown Tank') as tank_name, DATE(tank_level_history.movement_time) as period, COALESCE(SUM(tank_level_history.liters_in - tank_level_history.liters_out), 0) as value"
    ),
    q: btoa(
      `LEFT JOIN tanks t ON t.tank_id = tank_level_history.tank_id ${
        safeHiveSiteId ? `WHERE tank_level_history.hive_site_id='${safeHiveSiteId}'` : ""
      } GROUP BY tank_level_history.tank_id, COALESCE(t.tank_name, tank_level_history.tank_id, 'Unknown Tank'), DATE(tank_level_history.movement_time) ORDER BY period ASC`
    ),
  };

  const movementByMonthQ = {
    tbl: "tank_level_history",
    colstr: btoa(
      "tank_level_history.tank_id, COALESCE(t.tank_name, tank_level_history.tank_id, 'Unknown Tank') as tank_name, DATE_FORMAT(tank_level_history.movement_time, '%Y-%m') as period, COALESCE(SUM(tank_level_history.liters_in - tank_level_history.liters_out), 0) as value"
    ),
    q: btoa(
      `LEFT JOIN tanks t ON t.tank_id = tank_level_history.tank_id ${
        safeHiveSiteId ? `WHERE tank_level_history.hive_site_id='${safeHiveSiteId}'` : ""
      } GROUP BY tank_level_history.tank_id, COALESCE(t.tank_name, tank_level_history.tank_id, 'Unknown Tank'), DATE_FORMAT(tank_level_history.movement_time, '%Y-%m') ORDER BY period ASC`
    ),
  };

  const [
    totalStations,
    totalDevices,
    activeDevices,
    totalPumps,
    movementByDay,
    movementByMonth,
  ] = await Promise.all([
    mosyFlexSelect(totalStationsQ),
    mosyFlexSelect(totalDevicesQ),
    mosyFlexSelect(activeDevicesQ),
    mosyFlexSelect(totalPumpsQ),
    mosyFlexSelect(movementByDayQ),
    mosyFlexSelect(movementByMonthQ),
  ]);

  const dayByTank = bucketRowsByTank(movementByDay?.data || []);
  const monthByTank = bucketRowsByTank(movementByMonth?.data || []);

  const dayMap = new Map(dayByTank.map((x) => [x.tank_id, x]));
  const monthMap = new Map(monthByTank.map((x) => [x.tank_id, x]));
  const allTankIds = Array.from(new Set([...dayMap.keys(), ...monthMap.keys()]));

  const chartData = [];

  for (const tankId of allTankIds) {
    const tankDayData = dayMap.get(tankId);
    const tankMonthData = monthMap.get(tankId);
    const tankName =
      tankDayData?.tank_name || tankMonthData?.tank_name || tankId || "Unknown Tank";
    const dayData = tankDayData?.data || [];
    const monthData = tankMonthData?.data || [];

    chartData.push({
      title: `Tank movement by day - ${tankName}`,
      chartType: "line",
      dataKey: "period",
      data: dayData,
      series: [{ key: "value", color: "#2663A6", name: "Movement (Ltrs)" }],
      height: 320,
      containerClass: "col-md-12",
    });

    chartData.push({
      title: `Tank movement by month - ${tankName}`,
      chartType: "bar",
      dataKey: "period",
      data: monthData,
      series: [{ key: "value", color: "#1D951B", name: "Movement (Ltrs)" }],
      height: 320,
      containerClass: "col-md-12",
    });
  }

  const cardData = [
    {
      title: "Total stations",
      value: `${toNum(totalStations?.data?.[0]?.total_stations || 0)}`,
      percentage: "",
      icon: "FaList",
    },
    {
      title: "Total devices",
      value: `${toNum(totalDevices?.data?.[0]?.total_devices || 0)}`,
      percentage: "",
      icon: "FaMicrochip",
    },
    {
      title: "Active devices",
      value: `${toNum(activeDevices?.data?.[0]?.active_devices || 0)}`,
      percentage: "",
      icon: "FaCheckCircle",
    },
    {
      title: "Total pumps",
      value: `${toNum(totalPumps?.data?.[0]?.total_pumps || 0)}`,
      percentage: "",
      icon: "FaTachometerAlt",
    },
  ];

  return Response.json({
    status: "success",
    message: "Realtime metrics ready!",
    chart_data: chartData,
    cards_data: cardData,
  });
}
