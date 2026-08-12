const pool = require("../config/db");

async function createMany(connection, items) {
  if (!items || items.length === 0) return;
  const values = items.map((item) => [
    item.saleId,
    item.productId,
    item.quantity,
    item.unitPrice,
    item.quantity * item.unitPrice,
  ]);
  await connection.query(
    "INSERT INTO order_items (sale_id, product_id, quantity, unit_price, subtotal) VALUES ?",
    [values],
  );
}

module.exports = { createMany };
