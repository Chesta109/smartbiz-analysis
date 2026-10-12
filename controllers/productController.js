const productService = require("../services/productService");
const { renderView, productFilters } = require("../utils/viewLocals");

async function index(req, res) {
  const businessId = req.session.user.business_id;
  const products = await productService.listProducts(businessId, productFilters(req.query));
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
  const businessId = req.session.user.business_id;
  const product = await productService.getProduct(req.params.id, businessId);
  res.json(product);
}

async function create(req, res) {
  const businessId = req.session.user.business_id;
  const product = await productService.createProduct(businessId, req.body);
  if (!req.originalUrl.startsWith("/api/") && !req.accepts("json")) {
    req.flash("success", "Product added successfully.");
    return res.redirect("/products");
  }
  res.status(201).json(product);
}

async function update(req, res) {
  const businessId = req.session.user.business_id;
  const product = await productService.updateProduct(req.params.id, businessId, req.body);
  if (!req.originalUrl.startsWith("/api/") && !req.accepts("json")) {
    req.flash("success", "Product updated successfully.");
    return res.redirect("/products");
  }
  res.json(product);
}

async function remove(req, res) {
  const businessId = req.session.user.business_id;
  await productService.deleteProduct(req.params.id, businessId);
  if (!req.originalUrl.startsWith("/api/") && !req.accepts("json")) {
    req.flash("success", "Product deleted successfully.");
    return res.redirect("/products");
  }
  res.status(204).send();
}

async function restock(req, res) {
  const businessId = req.session.user.business_id;
  const product = await productService.restockProduct(
    req.params.id,
    businessId,
    req.body.quantity,
  );
  if (
    !req.originalUrl.startsWith("/api/") &&
    !req.xhr &&
    !req.is("application/json") &&
    (!req.headers.accept || req.headers.accept.indexOf("application/json") === -1)
  ) {
    req.flash(
      "success",
      `Restocked ${product.name} (+${req.body.quantity}). New stock: ${product.stock_qty}`,
    );
    return res.redirect("back");
  }
  res.json({
    success: true,
    message: `Restocked ${product.name} successfully. New stock: ${product.stock_qty}`,
    product,
  });
}

module.exports = { index, show, create, update, remove, restock };
