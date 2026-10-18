const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const demoController = require("../controllers/demoController");
const asyncHandler = require("../middlewares/asyncHandler");

router.post("/login", asyncHandler(authController.login));
router.post("/demo-login", asyncHandler(demoController.login));
router.post("/register", asyncHandler(authController.register));
router.post("/verify-registration", asyncHandler(authController.verifyRegistration));
router.post("/verify-registration/resend", asyncHandler(authController.resendRegistrationOtp));
router.post("/forgot-password", asyncHandler(authController.forgotPassword));
router.post("/verify-otp", asyncHandler(authController.verifyOtp));
router.post("/reset-password", asyncHandler(authController.resetPassword));
router.get("/logout", authController.logout);
router.post("/logout", authController.logout);

module.exports = router;
