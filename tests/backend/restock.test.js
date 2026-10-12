const test = require("node:test");
const assert = require("node:assert/strict");
require("dotenv").config();
const pool = require("../../config/db");
const productService = require("../../services/productService");
const productModel = require("../../models/productModel");
const productController = require("../../controllers/productController");

test("productModel.restock increments stock_qty correctly and scopes to business", async () => {
  // Find a product for business 1
  const [products] = await pool.query(
    "SELECT id, business_id, stock_qty, reorder_level FROM products WHERE business_id = 1 LIMIT 1"
  );
  assert.ok(products.length > 0, "Should have a product in business 1");
  const prod = products[0];
  const initialStock = prod.stock_qty;

  // Restock by 5
  const updated = await productModel.restock(prod.id, 5, 1);
  assert.equal(updated.stock_qty, initialStock + 5);

  // Attempting to restock with business 2 should fail / return null
  const crossBusiness = await productModel.restock(prod.id, 5, 2);
  assert.equal(crossBusiness, null, "Should not update product belonging to another business");

  // Restore original stock
  await pool.query("UPDATE products SET stock_qty = ? WHERE id = ?", [initialStock, prod.id]);
});

test("productService.restockProduct validates quantity and updates stock", async () => {
  const [products] = await pool.query(
    "SELECT id, business_id, stock_qty FROM products WHERE business_id = 1 LIMIT 1"
  );
  const prod = products[0];
  const initialStock = prod.stock_qty;

  // Rejects <= 0 or invalid quantities
  await assert.rejects(
    () => productService.restockProduct(prod.id, 1, 0),
    /positive integer/i
  );
  await assert.rejects(
    () => productService.restockProduct(prod.id, 1, -5),
    /positive integer/i
  );
  await assert.rejects(
    () => productService.restockProduct(prod.id, 1, "invalid"),
    /positive integer/i
  );

  // Rejects 404 for non-existent product
  await assert.rejects(
    () => productService.restockProduct(999999, 1, 10),
    /not found/i
  );

  // Valid restock
  const result = await productService.restockProduct(prod.id, 1, 10);
  assert.equal(result.stock_qty, initialStock + 10);

  // Restore original stock
  await pool.query("UPDATE products SET stock_qty = ? WHERE id = ?", [initialStock, prod.id]);
});

test("productController.restock returns JSON response for AJAX requests", async () => {
  const [products] = await pool.query(
    "SELECT id, business_id, stock_qty FROM products WHERE business_id = 1 LIMIT 1"
  );
  const prod = products[0];
  const initialStock = prod.stock_qty;

  let jsonResult = null;
  const req = {
    session: { user: { id: 1, business_id: 1, role: "owner" } },
    params: { id: String(prod.id) },
    body: { quantity: 15 },
    originalUrl: "/products/" + prod.id + "/restock",
    headers: { accept: "application/json" },
    is: () => true,
    xhr: true
  };
  const res = {
    json: (data) => {
      jsonResult = data;
    }
  };

  await productController.restock(req, res);
  assert.ok(jsonResult, "Should send JSON response");
  assert.equal(jsonResult.success, true);
  assert.equal(jsonResult.product.stock_qty, initialStock + 15);

  // Restore original stock
  await pool.query("UPDATE products SET stock_qty = ? WHERE id = ?", [initialStock, prod.id]);
});
