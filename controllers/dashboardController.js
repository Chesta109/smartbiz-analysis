const { renderView } = require("../utils/viewLocals");
const pool = require("../config/db");
const analyticsService = require("../services/analyticsService");

async function index(req, res) {
  const [
    summary,
    profitSummary,
    [lowStockItems],
  ] = await Promise.all([
    analyticsService.getSummary(),
    analyticsService.getProfitSummary(),
    pool.query(
      "SELECT name, stock_qty, reorder_level FROM products WHERE stock_qty <= reorder_level ORDER BY stock_qty ASC LIMIT 5"
    ),
  ]);

  renderView(req, res, "dashboard/index", {
    title: "Dashboard",

    metrics: [
      {
        label: "Total Revenue",
        value: `₹${Number(summary.total_revenue || 0).toFixed(2)}`
      },
      {
        label: "Total Orders",
        value: summary.total_orders || 0
      },
      {
        label: "Total Profit",
        value: `₹${Number(profitSummary.total_profit || 0).toFixed(2)}`
      },
      {
        label: "Profit Margin",
        value: `${Number(profitSummary.profit_margin_percentage || 0).toFixed(2)}%`
      }
    ],

    lowStockItems,
    recommendations: [],
    topProducts: [],
    revenueTrend: [],
  });
}

module.exports = { index };