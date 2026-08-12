const express = require("express");
const router = express.Router();
const salesController = require("../controllers/salesController");
const { isLoggedIn } = require("../middlewares/authMiddleware");
const asyncHandler = require("../middlewares/asyncHandler");

router.post("/", isLoggedIn, asyncHandler(salesController.create));
router.get("/", isLoggedIn, asyncHandler(salesController.index));

module.exports = router;
