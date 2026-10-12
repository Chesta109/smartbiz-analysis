const salesService = require("../services/salesService");
const productService = require("../services/productService");
const customerService = require("../services/customerService");
const saleModel = require("../models/saleModel");
const { renderView } = require("../utils/viewLocals");
const { AppError } = require("../middlewares/errorHandler");

async function index(req, res) {
  const businessId = req.session.user.business_id;
  const [products, recentSales, todaySummary] = await Promise.all([
    productService.listProducts(businessId),
    saleModel.findRecent(businessId),
    saleModel.findTodaySummary(businessId),
  ]);
  renderView(req, res, "sales/index", {
    title: "Sales",
    activeNav: "/sales",
    products,
    recentSales,
    todaySummary,
  });
}

async function create(req, res) {
  const { customerId, items } = req.body;
  const userId = req.session?.user?.id;
  const businessId = req.session?.user?.business_id;

  if (!userId || !businessId) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  if (customerId) {
    const customer = await customerService.getCustomer(customerId, businessId);
    if (!customer) throw new AppError("Invalid customer.", 422, "VALIDATION_ERROR");
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
    businessId,
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
