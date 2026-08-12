const express = require("express");
const dashboardController = require("../controllers/dashboardController");
const customerController = require("../controllers/customerController");
const { renderView } = require("../utils/viewLocals");
const { isLoggedIn } = require("../middlewares/authMiddleware");

const router = express.Router();

router.get("/dashboard", isLoggedIn, dashboardController.index);
router.get("/customers", isLoggedIn, customerController.index);
router.get("/reports", isLoggedIn, (req, res) =>
  renderView(req, res, "reports/index", {
    title: "Reports",
    activeNav: "/reports",
  }),
);
router.get("/login", (req, res) =>
  renderView(req, res, "auth/login", { title: "Sign in" }),
);
router.get("/register", (req, res) =>
  renderView(req, res, "auth/register", { title: "Create account" }),
);

module.exports = router;
