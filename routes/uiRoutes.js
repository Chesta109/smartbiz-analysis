const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const { renderView } = require("../utils/viewLocals");
const { isLoggedIn } = require("../middlewares/authMiddleware");
const asyncHandler = require("../middlewares/asyncHandler");
const salesReportController = require("../controllers/salesReportController");

const router = express.Router();

router.get("/dashboard", isLoggedIn, asyncHandler(dashboardController.index));
router.get("/reports", isLoggedIn, (req, res) =>
  renderView(req, res, "reports/index", {
    title: "Reports",
    activeNav: "/reports",
  }),
);
router.get("/reports/sales.csv", isLoggedIn, asyncHandler(salesReportController.downloadCsv));
router.get("/reports/sales.pdf", isLoggedIn, asyncHandler(salesReportController.downloadPdf));
router.get("/login", (req, res) =>
  renderView(req, res, "auth/login", { title: "Sign in" }),
);
router.get("/register", (req, res) =>
  renderView(req, res, "auth/register", { title: "Create account" }),
);
router.get("/verify-registration", (req, res) => renderView(req, res, "auth/verify-registration", { title: "Verify email" }));
router.get("/forgot-password", (req, res) => renderView(req, res, "auth/forgot-password", { title: "Forgot password" }));
router.get("/verify-otp", (req, res) => renderView(req, res, "auth/verify-otp", { title: "Verify code" }));
router.get("/reset-password", (req, res) => renderView(req, res, "auth/reset-password", { title: "Reset password" }));

module.exports = router;
