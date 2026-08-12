const salesService = require("../services/salesService");
const productService = require("../services/productService");
const customerService = require("../services/customerService");
const saleModel = require("../models/saleModel");
const { renderView } = require("../utils/viewLocals");
const { AppError } = require("../middlewares/errorHandler");

async function index(req, res) {
  const [products, customers, recentSales, todaySummary] = await Promise.all([
    productService.listProducts(),
    customerService.listCustomers(),
    saleModel.findRecent(),
    saleModel.findTodaySummary(),
  ]);
  renderView(req, res, "sales/index", {
    title: "Sales",
    activeNav: "/sales",
    products,
    customers,
    recentSales,
    todaySummary,
  });
}

async function create(req, res) {
  const { customerId, items } = req.body;
  const userId = req.session?.user?.id;

  if (!userId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (
    !Array.isArray(items) ||
    !items.length ||
    items.some(
      (item) =>
        !Number.isInteger(Number(item.productId)) ||
        !Number.isInteger(Number(item.quantity)) ||
        Number(item.quantity) < 1,
    )
  ) {
    throw new AppError(
      "A sale needs at least one product with a positive quantity.",
      422,
      "VALIDATION_ERROR",
    );
  }

  await salesService.createSale(
    customerId,
    userId,
    items.map((item) => ({
      productId: Number(item.productId),
      quantity: Number(item.quantity),
    })),
  );
  res.status(201).json({ success: true });
}

module.exports = { index, create };
