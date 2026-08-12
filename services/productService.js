const productModel = require("../models/productModel");
const { AppError } = require("../middlewares/errorHandler");

async function listProducts(filters = {}) {
  return productModel.findAll(
    typeof filters === "string" ? { search: filters } : filters,
  );
}

async function getProduct(id) {
  const product = await productModel.findById(id);
  if (!product) throw new AppError("Product not found", 404, "NOT_FOUND");
  return product;
}

async function createProduct(data) {
  const existing = await productModel.findBySku(data.sku);
  if (existing)
    throw new AppError(
      `SKU "${data.sku}" is already in use`,
      409,
      "VALIDATION_ERROR",
    );
  return productModel.create(data);
}

async function updateProduct(id, data) {
  await getProduct(id); // ensures 404 surfaces before the write
  if (data.sku) {
    const existing = await productModel.findBySku(data.sku);
    if (existing && existing.id !== Number(id)) {
      throw new AppError(
        `SKU "${data.sku}" is already in use`,
        409,
        "VALIDATION_ERROR",
      );
    }
  }
  return productModel.update(id, data);
}

async function deleteProduct(id) {
  await getProduct(id);
  return productModel.remove(id);
}

module.exports = {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
};
