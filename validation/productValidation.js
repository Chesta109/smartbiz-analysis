// validation/productValidation.js
// express-validator chains. Controllers stay free of validation logic;
// routes attach these, then validateRequest middleware turns failures
// into a single AppError.

const { body, param, query } = require("express-validator");

const productBody = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Product name is required.")
    .isLength({ max: 150 }),
  body("category")
    .trim()
    .notEmpty()
    .withMessage("Category is required.")
    .isLength({ max: 100 }),
  body("price")
    .isFloat({ min: 0 })
    .withMessage("Selling price must be zero or more."),
  body("cost")
    .isFloat({ min: 0 })
    .withMessage("Cost price must be zero or more."),
  body("stock_qty")
    .isInt({ min: 0 })
    .withMessage("Stock quantity must be zero or more."),
  body("reorder_level")
    .isInt({ min: 0 })
    .withMessage("Reorder level must be zero or more."),
];

const idParam = [
  param("id").isInt({ min: 1 }).withMessage("Invalid product id."),
];

const listQuery = [
  query("search").optional().trim().isLength({ max: 150 }),
  query("category").optional().trim().isLength({ max: 100 }),
  query("stockLevel").optional().isIn(["low", "out", "in"]),
];

module.exports = { productBody, idParam, listQuery };
