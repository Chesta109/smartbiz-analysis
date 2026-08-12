const { renderView } = require("../utils/viewLocals");
const pool = require("../config/db");

async function index(req, res) {
  const [
    [summary],
    [lowStockItems],
    [{ totalProducts }],
    [{ totalCustomers }],
  ] = await Promise.all([
    pool.query(
      `SELECT COALESCE(SUM(total_amount), 0) AS revenue, COUNT(*) AS sales FROM sales WHERE status = 'completed'`,
    ),
    pool.query(
      "SELECT name, stock_qty, reorder_level FROM products WHERE stock_qty <= reorder_level ORDER BY stock_qty ASC LIMIT 5",
    ),
    pool.query("SELECT COUNT(*) AS totalProducts FROM products"),
    pool.query("SELECT COUNT(*) AS totalCustomers FROM customers"),
  ]);
  renderView(req, res, "dashboard/index", {
    title: "Dashboard",
    metrics: [
      { label: "Revenue", value: `₹${Number(summary.revenue).toFixed(0)}` },
      { label: "Completed sales", value: summary.sales },
      { label: "Products", value: totalProducts },
      { label: "Customers", value: totalCustomers },
    ],
    lowStockItems,
    recommendations: [],
    topProducts: [],
    revenueTrend: [],
  });
}

module.exports = { index };
