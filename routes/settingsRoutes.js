const express = require("express");
const router = express.Router();
const controller = require("../controllers/settingsController");
const { isLoggedIn } = require("../middlewares/authMiddleware");
const asyncHandler = require("../middlewares/asyncHandler");
const { renderView } = require("../utils/viewLocals");

function requireManagerLocal(req, res, next) {
  if (req.session?.user?.role !== "manager" && req.session?.user?.role !== "owner") {
    req.flash("error", "Only managers can access Settings.");
    return res.redirect("/dashboard");
  }
  next();
}

router.get("/", isLoggedIn, requireManagerLocal, (req, res) =>
  renderView(req, res, "settings/index", {
    title: "Settings",
    activeNav: "/settings",
  }),
);
router.put("/", isLoggedIn, requireManagerLocal, asyncHandler(controller.update));
module.exports = router;
