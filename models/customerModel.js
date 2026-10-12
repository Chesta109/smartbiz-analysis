const pool = require("../config/db");

async function findAll({ search, businessId } = {}) {
  const [rows] = await pool.query(
    `SELECT * FROM customers WHERE business_id = :businessId ${search ? "AND (name LIKE :q OR email LIKE :q OR phone LIKE :q)" : ""} ORDER BY name ASC`,
    search ? { q: `%${search}%`, businessId } : { businessId },
  );
  return rows;
}
async function findById(id, businessId) {
  const [rows] = await pool.query("SELECT * FROM customers WHERE id = ? AND business_id = ?", [id, businessId]);
  return rows[0] || null;
}
async function searchByPrefix(q, limit = 8, businessId) {
  const escaped = q.replace(/[\\%_]/g, "\\$&");
  const prefix = escaped + "%";
  const wordPrefix = "% " + escaped + "%";
  const [rows] = await pool.query(
    "SELECT id, name, phone, email FROM customers WHERE business_id = ? AND (name LIKE ? OR name LIKE ?) ORDER BY name ASC LIMIT ?",
    [businessId, prefix, wordPrefix, limit]
  );
  return rows;
}
async function create(data) {
  const [result] = await pool.query(
    "INSERT INTO customers (business_id, name, email, phone, address) VALUES (?, ?, ?, ?, ?)",
    [data.businessId, data.name, data.email || null, data.phone || null, data.address || null],
  );
  return findById(result.insertId, data.businessId);
}
async function update(id, data, businessId) {
  await pool.query(
    "UPDATE customers SET name = ?, email = ?, phone = ?, address = ? WHERE id = ? AND business_id = ?",
    [
      data.name,
      data.email || null,
      data.phone || null,
      data.address || null,
      id,
      businessId,
    ],
  );
  return findById(id, businessId);
}
async function remove(id, businessId) {
  const [result] = await pool.query("DELETE FROM customers WHERE id = ? AND business_id = ?", [id, businessId]);
  return result.affectedRows > 0;
}
async function findPurchaseHistory(id, businessId) {
  const [rows] = await pool.query(
    `SELECT s.id AS sale_id, s.created_at AS sale_date, s.status, oi.quantity, oi.unit_price, p.name AS product_name 
     FROM sales s 
     JOIN order_items oi ON oi.sale_id = s.id 
     JOIN products p ON p.id = oi.product_id 
     WHERE s.customer_id = ? AND s.business_id = ? ORDER BY s.created_at DESC`,
    [id, businessId],
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
  searchByPrefix,
};
