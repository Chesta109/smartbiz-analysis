const express = require("express");

const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

// Dashboard summary
router.get("/summary", analyticsController.getSummary);

// Order status
router.get("/order-status", analyticsController.getOrderStatus);

// Monthly sales
router.get("/monthly-sales", analyticsController.getMonthlySales);

// Product performance
router.get("/products", analyticsController.getProductPerformance);

// Category performance
router.get("/categories", analyticsController.getCategoryPerformance);

// Customer performance
router.get("/customers", analyticsController.getCustomerPerformance);

// Inventory alerts
router.get("/inventory", analyticsController.getInventoryAlerts);

// Payment analysis
router.get("/payments", analyticsController.getPaymentAnalysis);

// Profit summary
router.get("/profit", analyticsController.getProfitSummary);

// Product business insights
router.get("/product-insights", analyticsController.getProductInsights);

router.get("/categories", analyticsController.getCategoryPerformance);
router.get("/category-list", analyticsController.getCategories);

module.exports = router;