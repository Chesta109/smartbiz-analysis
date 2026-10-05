console.log("REPORT ROUTES FILE LOADED");
const express = require("express");
const controller = require("../controllers/reportController");
const { isLoggedIn } = require("../middlewares/authMiddleware");
const asyncHandler = require("../middlewares/asyncHandler");

const router = express.Router();
router.use(isLoggedIn);
router.get("/forecast", (req, res, next) => { console.log("FORECAST ROUTE HIT"); next(); }, asyncHandler(controller.forecast));

module.exports = router;