const productModel = require("../models/productModel");
const { AppError } = require("../middlewares/errorHandler");

async function listProducts(businessId, filters = {}) {
  return productModel.findAll(
    typeof filters === "string" ? { search: filters, businessId } : { ...filters, businessId },
  );
}

async function getProduct(id, businessId) {
  const product = await productModel.findById(id, businessId);
  if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
  return product;
}

async function createProduct(businessId, data) {
  const existing = await productModel.findBySku(data.sku, businessId);
  if (existing)
    throw new AppError(
      `SKU "${data.sku}" is already in use`,
      409,
      "VALIDATION_ERROR",
    );
  return productModel.create({ ...data, businessId });
}

async function updateProduct(id, businessId, data) {
  await getProduct(id, businessId); // ensures 404 surfaces before the write
  if (data.sku) {
    const existing = await productModel.findBySku(data.sku, businessId);
    if (existing && existing.id !== Number(id)) {
      throw new AppError(
        `SKU "${data.sku}" is already in use`,
        409,
        "VALIDATION_ERROR",
      );
    }
  }
  return productModel.update(id, data, businessId);
}

async function deleteProduct(id, businessId) {
  await getProduct(id, businessId);
  return productModel.remove(id, businessId);
}

async function restockProduct(id, businessId, quantity) {
  await getProduct(id, businessId);
  const qty = parseInt(quantity, 10);
  if (isNaN(qty) || qty <= 0) {
    throw new AppError(
      "Restock quantity must be a positive integer",
      422,
      "VALIDATION_ERROR",
    );
  }
  return productModel.restock(id, qty, businessId);
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  restockProduct,
};
