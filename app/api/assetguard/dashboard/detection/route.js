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
  const soWhere = safeHiveSiteId ? `WHERE sales_orders.hive_site_id='${safeHiveSiteId}'` : "";
  const soiWhere = safeHiveSiteId ? `WHERE sales_order_items.hive_site_id='${safeHiveSiteId}'` : "";

  const salesOverallQ = {
    tbl: "sales_orders",
    colstr: btoa("COALESCE(SUM(grand_total), 0) as sales_overall"),
    q: btoa(soWhere),
  };

  const profitOverallQ = {
    tbl: "sales_order_items",
    colstr: btoa("COALESCE(SUM(margin_price), 0) as profit_overall"),
    q: btoa(soiWhere),
  };

  const salesThisMonthQ = {
    tbl: "sales_orders",
    colstr: btoa("COALESCE(SUM(grand_total), 0) as sales_this_month"),
    q: btoa(
      `${soWhere} ${soWhere ? "AND" : "WHERE"} DATE_FORMAT(order_date, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`
    ),
  };

  const profitThisMonthQ = {
    tbl: "sales_order_items",
    colstr: btoa("COALESCE(SUM(margin_price), 0) as profit_this_month"),
    q: btoa(
      `${soiWhere} ${soiWhere ? "AND" : "WHERE"} DATE_FORMAT(created_at, '%Y-%m') = DATE_FORMAT(CURDATE(), '%Y-%m')`
    ),
  };

  const salesByMonthQ = {
    tbl: "sales_orders",
    colstr: btoa("DATE_FORMAT(order_date, '%Y-%m') as month, COALESCE(SUM(grand_total), 0) as value"),
    q: btoa(`${soWhere} GROUP BY DATE_FORMAT(order_date, '%Y-%m') ORDER BY month ASC`),
  };

  const profitByMonthQ = {
    tbl: "sales_order_items",
    colstr: btoa("DATE_FORMAT(created_at, '%Y-%m') as month, COALESCE(SUM(margin_price), 0) as value"),
    q: btoa(`${soiWhere} GROUP BY DATE_FORMAT(created_at, '%Y-%m') ORDER BY month ASC`),
  };

  const profitPerFuelQ = {
    tbl: "sales_order_items",
    colstr: btoa("COALESCE(product_name, product_code, 'Unknown') as fuel_item, COALESCE(SUM(margin_price), 0) as value"),
    q: btoa(`${soiWhere} GROUP BY COALESCE(product_name, product_code, 'Unknown') ORDER BY value DESC`),
  };

  const salesPerFuelQ = {
    tbl: "sales_order_items",
    colstr: btoa("COALESCE(product_name, product_code, 'Unknown') as fuel_item, COALESCE(SUM(total_price), 0) as value"),
    q: btoa(`${soiWhere} GROUP BY COALESCE(product_name, product_code, 'Unknown') ORDER BY value DESC`),
  };

  const [
    salesOverall,
    profitOverall,
    salesThisMonth,
    profitThisMonth,
    salesByMonth,
    profitByMonth,
    profitPerFuel,
    salesPerFuel,
  ] = await Promise.all([
    mosyFlexSelect(salesOverallQ),
    mosyFlexSelect(profitOverallQ),
    mosyFlexSelect(salesThisMonthQ),
    mosyFlexSelect(profitThisMonthQ),
    mosyFlexSelect(salesByMonthQ),
    mosyFlexSelect(profitByMonthQ),
    mosyFlexSelect(profitPerFuelQ),
    mosyFlexSelect(salesPerFuelQ),
  ]);

  const cardData = [
    {
      title: "Sales overall",
      value: `${toNum(salesOverall?.data?.[0]?.sales_overall || 0)}`,
      percentage: "",
      icon: "FaChartLine",
    },
    {
      title: "Profit overall",
      value: `${toNum(profitOverall?.data?.[0]?.profit_overall || 0)}`,
      percentage: "",
      icon: "FaMoneyBillWave",
    },
    {
      title: "Sales this month",
      value: `${toNum(salesThisMonth?.data?.[0]?.sales_this_month || 0)}`,
      percentage: "",
      icon: "FaCalendarDay",
    },
    {
      title: "Profit this month",
      value: `${toNum(profitThisMonth?.data?.[0]?.profit_this_month || 0)}`,
      percentage: "",
      icon: "FaCoins",
    },
  ];

  const chartData = [
    {
      title: "Sales by month",
      chartType: "line",
      dataKey: "month",
      data: salesByMonth?.data ?? [],
      series: [{ key: "value", color: "#2663A6", name: "Sales" }],
      height: 350,
      containerClass: "col-md-6",
    },
    {
      title: "Profit by month",
      chartType: "line",
      dataKey: "month",
      data: profitByMonth?.data ?? [],
      series: [{ key: "value", color: "#1D951B", name: "Profit" }],
      height: 350,
      containerClass: "col-md-6",
    },
    {
      title: "Profit per fuel",
      chartType: "bar",
      dataKey: "fuel_item",
      data: profitPerFuel?.data ?? [],
      series: [{ key: "value", color: "#481F11", name: "Profit" }],
      height: 350,
      containerClass: "col-md-12",
    },
    {
      title: "Sales per fuel",
      chartType: "bar",
      dataKey: "fuel_item",
      data: salesPerFuel?.data ?? [],
      series: [{ key: "value", color: "#000000", name: "Sales" }],
      height: 350,
      containerClass: "col-md-12",
    },
  ];

  return Response.json({
    status: "success",
    message: "Detection dashboard data ready!",
    chart_data: chartData,
    cards_data: cardData,
  });
}
