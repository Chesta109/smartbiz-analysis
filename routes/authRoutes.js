const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const asyncHandler = require("../middlewares/asyncHandler");

router.post("/login", asyncHandler(authController.login));
router.post("/register", asyncHandler(authController.register));
router.get("/logout", authController.logout);

module.exports = router;
