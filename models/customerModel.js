const pool = require("../config/db");

async function findAll({ search } = {}) {
  const [rows] = await pool.query(
    `SELECT * FROM customers ${search ? "WHERE name LIKE :q OR email LIKE :q OR phone LIKE :q" : ""} ORDER BY name ASC`,
    search ? { q: `%${search}%` } : {},
  );
  return rows;
}
async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM customers WHERE id = ?", [id]);
  return rows[0] || null;
}
async function create(data) {
  const [result] = await pool.query(
    "INSERT INTO customers (name, email, phone, address) VALUES (?, ?, ?, ?)",
    [data.name, data.email || null, data.phone || null, data.address || null],
  );
  return findById(result.insertId);
}
async function update(id, data) {
  await pool.query(
    "UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ?",
    [
      data.name,
      data.email || null,
      data.phone || null,
      data.address || null,
      id,
    ],
  );
  return findById(id);
}
async function remove(id) {
  const [result] = await pool.query("DELETE FROM customers WHERE id = ?", [id]);
  return result.affectedRows > 0;
}
async function findPurchaseHistory(id) {
  const [rows] = await pool.query(
    `SELECT s.id AS sale_id, s.created_at AS sale_date, s.status, oi.quantity, oi.unit_price, p.name AS product_name FROM sales s JOIN order_items oi ON oi.sale_id = s.id JOIN products p ON p.id = oi.product_id WHERE s.customer_id = ? ORDER BY s.created_at DESC`,
    [id],
  );
  return rows;
}
module.exports = {
  findAll,
  findById,
  create,
  update,
  remove,
  findPurchaseHistory,
};
