// validation/saleValidation.js
const { body } = require("express-validator");

const recordSaleBody = [
  body("customerId")
    .optional({ checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage("Invalid customer."),
  body("items")
    .isArray({ min: 1 })
    .withMessage("A sale needs at least one line item."),
  body("items.*.productId")
    .isInt({ min: 1 })
    .withMessage("Invalid product in line items."),
  body("items.*.quantity")
    .isInt({ min: 1 })
    .withMessage("Quantity must be at least 1."),
];

module.exports = { recordSaleBody };
