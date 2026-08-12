const { body, param } = require("express-validator");

const create = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required")
    .isLength({ max: 160 }),
  body("sku")
    .trim()
    .notEmpty()
    .withMessage("SKU is required")
    .isLength({ max: 60 }),
  body("category").optional({ checkFalsy: true }).trim().isLength({ max: 80 }),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Price must be a positive number"),
  body("cost")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Cost must be a positive number"),
  body("stock_qty")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Stock qty must be a non-negative integer"),
  body("reorder_level")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Reorder level must be a non-negative integer"),
];

const update = [
  param("id").isInt().withMessage("Invalid product id"),
  ...create.map((rule) => rule.optional()),
];

const idParam = [param("id").isInt().withMessage("Invalid product id")];

module.exports = { create, update, idParam };
