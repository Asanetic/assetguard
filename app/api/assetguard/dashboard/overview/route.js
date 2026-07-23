import { mosyFlexSelect, toNum } from "../../../apiUtils/dataControl/dataUtils";
import { processAuthToken } from "../../../auth/authManager";

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

  const fuelByType = {
    tbl: "fuel_inventory",
    colstr: btoa("fuel_type, count(*) as value"),
    q: btoa(`${siteWhere} GROUP BY fuel_type`),
  };

  const salesByStation = {
    tbl: "fuel_sales",
    colstr: btoa("COALESCE(s.station_name, fuel_sales.fuel_station_id, 'Unknown') as station_name, count(*) as value"),
    q: btoa(
      `LEFT JOIN fuel_stations s ON s.record_id = fuel_sales.fuel_station_id ${
        safeHiveSiteId ? `WHERE fuel_sales.hive_site_id='${safeHiveSiteId}'` : ""
      } GROUP BY COALESCE(s.station_name, fuel_sales.fuel_station_id, 'Unknown')`
    ),
  };

  const paymentsByStation = {
    tbl: "sales_order_payments",
    colstr: btoa("COALESCE(st.station_name, sales_order_payments.location_id, 'Unknown') as station_name, COALESCE(sum(sales_order_payments.amount), 0) as value"),
    q: btoa(
      `LEFT JOIN fuel_stations st ON st.record_id = sales_order_payments.location_id ${
        safeHiveSiteId ? `WHERE sales_order_payments.hive_site_id='${safeHiveSiteId}'` : ""
      } GROUP BY COALESCE(st.station_name, sales_order_payments.location_id, 'Unknown')`
    ),
  };

  const stationsCountQ = {
    tbl: "fuel_stations",
    colstr: btoa("count(*) as total_stations"),
    q: btoa(siteWhere),
  };

  const salesOverallQ = {
    tbl: "fuel_sales",
    colstr: btoa("COALESCE(sum(total_amount), 0) as sales_overall"),
    q: btoa(siteWhere),
  };

  const clientCountQ = {
    tbl: "fuel_clients_vehicles",
    colstr: btoa("count(*) as total_clients"),
    q: btoa(siteWhere),
  };

  const fuelInStockQ = {
    tbl: "fuel_inventory",
    colstr: btoa("COALESCE(sum(current_stock_litres), 0) as fuel_in_stock"),
    q: btoa(siteWhere),
  };

  const [
    fuelByTypeData,
    salesByStationData,
    paymentsByStationData,
    stationsCount,
    salesOverall,
    clientCount,
    fuelInStock,
  ] = await Promise.all([
    mosyFlexSelect(fuelByType),
    mosyFlexSelect(salesByStation),
    mosyFlexSelect(paymentsByStation),
    mosyFlexSelect(stationsCountQ),
    mosyFlexSelect(salesOverallQ),
    mosyFlexSelect(clientCountQ),
    mosyFlexSelect(fuelInStockQ),
  ]);

  const chartData = [
    {
      title: "Fuel instock by type",
      chartType: "doughnut",
      dataKey: "fuel_type",
      data: fuelByTypeData?.data ?? [],
      containerClass: "col-md-6",
    },
    {
      title: "Sales by station",
      chartType: "pie",
      dataKey: "station_name",
      data: salesByStationData?.data ?? [],
      containerClass: "col-md-6",
    },
    {
      title: "Collection per station",
      chartType: "bar",
      dataKey: "station_name",
      data: paymentsByStationData?.data ?? [],
      series: [{ key: "value", color: "#2663A6", name: "Amount" }],
      height: 350,
      containerClass: "col-md-12",
    }
  ];

  const cardData = [
    {
      title: "Total stations",
      value: `${toNum(stationsCount?.data?.[0]?.total_stations || 0)}`,
      percentage: "",
      icon: "FaList",
    },
    {
      title: "Sales overall",
      value: `${toNum(salesOverall?.data?.[0]?.sales_overall || 0)}`,
      percentage: "",
      icon: "FaChartLine",
    },
    {
      title: "Clients",
      value: `${toNum(clientCount?.data?.[0]?.total_clients || 0)}`,
      percentage: "",
      icon: "FaUsers",
    },
    {
      title: "Fuel in stock",
      value: `${toNum(fuelInStock?.data?.[0]?.fuel_in_stock || 0)} Litres`,
      percentage: "",
      icon: "FaCheckCircle",
    },
  ];

  return Response.json({
    status: "success",
    message: "Overview dashboard data ready!",
    chart_data: chartData,
    cards_data: cardData,
  });
}
