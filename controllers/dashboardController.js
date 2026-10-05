const { renderView } = require("../utils/viewLocals");
const { runForecast } = require("../services/pythonBridge");
const { buildForecastChart } = require("../utils/forecastChart");
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
      `
      SELECT
        name,
        stock_qty,
        reorder_level
      FROM products
      WHERE stock_qty <= reorder_level
      ORDER BY stock_qty ASC
      LIMIT 5
      `
    ),
  ]);


  // -----------------------------
  // Revenue Forecast
  // -----------------------------

  let forecastResult = null;
  let forecastChart = null;

  try {
    forecastResult = await runForecast();
    console.log("FORECAST DEBUG:", JSON.stringify(forecastResult).slice(0, 300));

    console.log(
      "FORECAST DEBUG:",
      "keys =", Object.keys(forecastResult || {}),
      "| error =", forecastResult && forecastResult.error,
      "| history =", forecastResult && forecastResult.history && forecastResult.history.length,
      "| forecast =", forecastResult && forecastResult.forecast && forecastResult.forecast.length
    );

    forecastChart =
      buildForecastChart(forecastResult);

  } catch (error) {
    console.error(
      "FORECAST DEBUG - Python failed:",
      error.message
    );

    forecastResult = {
      error:
        "The revenue forecast is temporarily unavailable. " +
        "Check that Python and the packages in python/requirements.txt are installed."
    };

    forecastChart = null;
  }


  // -----------------------------
  // Dashboard
  // -----------------------------

  renderView(req, res, "dashboard/index", {
    title: "Dashboard",

    metrics: [
      {
        label: "Total Revenue",
        value: `₹${Number(
          summary.total_revenue || 0
        ).toFixed(2)}`,
      },

      {
        label: "Total Orders",
        value: summary.total_orders || 0,
      },

      {
        label: "Total Profit",
        value: `₹${Number(
          profitSummary.total_profit || 0
        ).toFixed(2)}`,
      },

      {
        label: "Profit Margin",
        value: `${Number(
          profitSummary.profit_margin_percentage || 0
        ).toFixed(2)}%`,
      },
    ],

    lowStockItems,

    recommendations: [],

    topProducts: [],

    revenueTrend: [],

    // Forecast data
    forecastResult,

    forecastChart,
  });
}


module.exports = {
  index,
};