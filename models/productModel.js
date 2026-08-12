const pool = require("../config/db");

async function findAll({ search, category, stockLevel } = {}) {
  const where = [];
  const params = {};
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
    `SELECT * FROM products${where.length ? ` WHERE ${where.join(" AND ")}` : ""} ORDER BY name ASC`,
    params,
  );
  return rows;
}

async function findById(id) {
  const [rows] = await pool.query("SELECT * FROM products WHERE id = :id", {
    id,
  });
  return rows[0] || null;
}

async function findBySku(sku) {
  const [rows] = await pool.query("SELECT * FROM products WHERE sku = :sku", {
    sku,
  });
  return rows[0] || null;
}

async function create(data) {
  const [result] = await pool.query(
    `INSERT INTO products (name, sku, category, price, cost, stock_qty, reorder_level)
     VALUES (:name, :sku, :category, :price, :cost, :stock_qty, :reorder_level)`,
    {
      name: data.name,
      sku: data.sku,
      category: data.category || null,
      price: data.price,
      cost: data.cost ?? 0,
      stock_qty: data.stock_qty ?? 0,
      reorder_level: data.reorder_level ?? 5,
    },
  );
  return findById(result.insertId);
}

async function update(id, data) {
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
  const params = { id };

  for (const field of fields) {
    if (data[field] !== undefined) {
      setClauses.push(`${field} = :${field}`);
      params[field] = data[field];
    }
  }
  if (setClauses.length === 0) return findById(id);

  await pool.query(
    `UPDATE products SET ${setClauses.join(", ")} WHERE id = :id`,
    params,
  );
  return findById(id);
}

async function remove(id) {
  const [result] = await pool.query("DELETE FROM products WHERE id = :id", {
    id,
  });
  return result.affectedRows > 0;
}

// Used inside services/salesService.js's transaction (not this module) via a
// passed connection, so the multi-table sale stays atomic.
async function adjustStockWithConnection(conn, productId, delta) {
  await conn.query(
    "UPDATE products SET stock_qty = stock_qty + :delta WHERE id = :id",
    { delta, id: productId },
  );
}

module.exports = {
  findAll,
  findById,
  findBySku,
  create,
  update,
  remove,
  adjustStockWithConnection,
};
