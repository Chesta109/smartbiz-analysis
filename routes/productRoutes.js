const express = require("express");
const router = express.Router();

const productController = require("../controllers/productController");
const productValidation = require("../middlewares/productValidation");
const validateRequest = require("../middlewares/validateRequest");
const { isLoggedIn } = require("../middlewares/authMiddleware");
const { requireRole } = require("../middlewares/roleMiddleware");
const asyncHandler = require("../middlewares/asyncHandler");

router.use(isLoggedIn);

router.get("/", asyncHandler(productController.index));
router.get(
  "/:id",
  productValidation.idParam,
  validateRequest,
  asyncHandler(productController.show),
);

router.post(
  "/",
  requireRole("owner", "manager"),
  productValidation.create,
  validateRequest,
  asyncHandler(productController.create),
);

router.put(
  "/:id",
  requireRole("owner", "manager"),
  productValidation.update,
  validateRequest,
  asyncHandler(productController.update),
);

router.delete(
  "/:id",
  requireRole("owner"),
  productValidation.idParam,
  validateRequest,
  asyncHandler(productController.remove),
);

module.exports = router;
