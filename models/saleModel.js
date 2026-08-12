// models/saleModel.js
const pool = require("../config/db");

// Inside the sale transaction — takes a connection, not the pool.
async function create(connection, { customerId, userId, totalAmount }) {
  const [result] = await connection.query(
    `INSERT INTO sales (customer_id, user_id, total_amount, status)
     VALUES (?, ?, ?, 'completed')`,
    [customerId || null, userId, totalAmount],
  );
  return result.insertId;
}

async function findRecent(limit = 20) {
  const [rows] = await pool.query(
    `SELECT s.id, s.created_at AS sale_date, s.total_amount, s.status,
            COALESCE(c.name, 'Walk-in Customer') AS customer_name,
            u.name AS staff_name,
            (SELECT COUNT(*) FROM order_items oi WHERE oi.sale_id = s.id) AS item_count
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     JOIN users u ON u.id = s.user_id
     ORDER BY s.created_at DESC
     LIMIT ?`,
    [limit],
  );
  return rows;
}

async function findByIdWithItems(id) {
  const [saleRows] = await pool.query(
    `SELECT s.*, COALESCE(c.name, 'Walk-in Customer') AS customer_name, u.name AS staff_name
     FROM sales s
     LEFT JOIN customers c ON c.id = s.customer_id
     JOIN users u ON u.id = s.user_id
     WHERE s.id = ?`,
    [id],
  );
  const sale = saleRows[0];
  if (!sale) return null;

  const [items] = await pool.query(
    `SELECT oi.*, p.name AS product_name
     FROM order_items oi
     JOIN products p ON p.id = oi.product_id
     WHERE oi.sale_id = ?`,
    [id],
  );
  return { ...sale, items };
}

// Today-at-a-glance stats (Section 10 of the doc / matches the UI video's
// "Sales today / Revenue today / Items sold / Avg. sale value" panel).
async function findTodaySummary() {
  const [rows] = await pool.query(
    `SELECT
       COUNT(*) AS sales_today,
       COALESCE(SUM(total_amount), 0) AS revenue_today,
       COALESCE((
         SELECT SUM(oi.quantity) FROM order_items oi
         JOIN sales s2 ON s2.id = oi.sale_id
       WHERE DATE(s2.created_at) = CURDATE()
       ), 0) AS items_sold
     FROM sales
     WHERE DATE(created_at) = CURDATE()`,
  );
  const row = rows[0];
  const avg = row.sales_today > 0 ? row.revenue_today / row.sales_today : 0;
  return { ...row, avg_sale_value: avg };
}

module.exports = { create, findRecent, findByIdWithItems, findTodaySummary };
