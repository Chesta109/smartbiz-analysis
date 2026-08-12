const express = require("express");
const router = express.Router();
const controller = require("../controllers/settingsController");
const { isLoggedIn } = require("../middlewares/authMiddleware");
const asyncHandler = require("../middlewares/asyncHandler");
const { renderView } = require("../utils/viewLocals");

router.get("/", isLoggedIn, (req, res) =>
  renderView(req, res, "settings/index", {
    title: "Settings",
    activeNav: "/settings",
  }),
);
router.put("/", isLoggedIn, asyncHandler(controller.update));
module.exports = router;
