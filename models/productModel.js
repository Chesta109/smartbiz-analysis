const pool = require("../config/db");

async function findAll({ search, category, stockLevel, businessId } = {}) {
  const where = ["business_id = :businessId"];
  const params = { businessId };
  if (search) {
    where.push("(name LIKE :q OR sku LIKE :q)");
    params.q = `%${search}%`;
  }
  if (category) {
    where.push("category = :category");
    params.category = category;
  }
  if (stockLevel === "low")
    where.push("stock_qty > 0 AND stock_qty <= reorder_level");
  if (stockLevel === "out") where.push("stock_qty = 0");
  if (stockLevel === "in") where.push("stock_qty > reorder_level");
  const [rows] = await pool.query(
    `SELECT * FROM products WHERE ${where.join(" AND ")} ORDER BY name ASC`,
    params,
  );
  return rows;
}

async function findById(id, businessId) {
  const [rows] = await pool.query("SELECT * FROM products WHERE id = :id AND business_id = :businessId", {
    id, businessId
  });
  return rows[0] || null;
}

async function findBySku(sku, businessId) {
  const [rows] = await pool.query("SELECT * FROM products WHERE sku = :sku AND business_id = :businessId", {
    sku, businessId
  });
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO products (business_id, name, sku, category, price, cost, stock_qty, reorder_level)
     VALUES (:business_id, :name, :sku, :category, :price, :cost, :stock_qty, :reorder_level)`,
    {
      business_id: data.businessId,
      name: data.name,
      sku: data.sku,
      category: data.category || null,
      price: data.price,
      cost: data.cost ?? 0,
      stock_qty: data.stock_qty ?? 0,
      reorder_level: data.reorder_level ?? 5,
    },
  );
  return findById(result.insertId, data.businessId);
}

async function update(id, data, businessId) {
  const fields = [
    "name",
    "sku",
    "category",
    "price",
    "cost",
    "stock_qty",
    "reorder_level",
  ];
  const setClauses = [];
  const params = { id, businessId };

  for (const field of fields) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = :${field}`);
      params[field] = data[field];
    }
  }
  if (setClauses.length === 0) return findById(id, businessId);

  await pool.query(
    `UPDATE products SET ${setClauses.join(", ")} WHERE id = :id AND business_id = :businessId`,
    params,
  );
  return findById(id, businessId);
}

async function remove(id, businessId) {
  const [result] = await pool.query("DELETE FROM products WHERE id = :id AND business_id = :businessId", {
    id, businessId
  });
  return result.affectedRows > 0;
}

async function adjustStockWithConnection(conn, productId, delta) {
  await conn.query(
    "UPDATE products SET stock_qty = stock_qty + :delta WHERE id = :id",
    { delta, id: productId },
  );
}

async function restock(id, quantity, businessId) {
  const [result] = await pool.query(
    "UPDATE products SET stock_qty = stock_qty + :quantity WHERE id = :id AND business_id = :businessId",
    { quantity, id, businessId },
  );
  if (result.affectedRows === 0) return null;
  return findById(id, businessId);
}

module.exports = {
  findAll,
  findById,
  findBySku,
  create,
  update,
  remove,
  adjustStockWithConnection,
  restock,
};
