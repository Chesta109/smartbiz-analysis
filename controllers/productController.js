const productService = require("../services/productService");
const { renderView, productFilters } = require("../utils/viewLocals");

async function index(req, res) {
  const products = await productService.listProducts(productFilters(req.query));
  if (req.originalUrl.startsWith("/api/")) return res.json(products);

  renderView(req, res, "products/index", {
    title: "Products",
    products: products || [],
    filters: productFilters(req.query),
    pagination: {
      page: 1,
      limit: 20,
      total: products?.length || 0,
      totalPages: products?.length ? 1 : 0,
    },
  });
}

async function show(req, res) {
  const product = await productService.getProduct(req.params.id);
  res.json(product);
}

async function create(req, res) {
  const product = await productService.createProduct(req.body);
  if (!req.originalUrl.startsWith("/api/") && !req.accepts("json")) {
    req.flash("success", "Product added successfully.");
    return res.redirect("/products");
  }
  res.status(201).json(product);
}

async function update(req, res) {
  const product = await productService.updateProduct(req.params.id, req.body);
  if (!req.originalUrl.startsWith("/api/") && !req.accepts("json")) {
    req.flash("success", "Product updated successfully.");
    return res.redirect("/products");
  }
  res.json(product);
}

async function remove(req, res) {
  await productService.deleteProduct(req.params.id);
  if (!req.originalUrl.startsWith("/api/") && !req.accepts("json")) {
    req.flash("success", "Product deleted successfully.");
    return res.redirect("/products");
  }
  res.status(204).send();
}

module.exports = { index, show, create, update, remove };
