// validation/customerValidation.js
const { body, param, query } = require("express-validator");

const customerBody = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Customer name is required.")
    .isLength({ max: 150 }),
  body("email")
    .optional({ checkFalsy: true })
    .isEmail()
    .withMessage("Email must be valid."),
  body("phone").optional({ checkFalsy: true }).trim().isLength({ max: 30 }),
];

const idParam = [
  param("id").isInt({ min: 1 }).withMessage("Invalid customer id."),
];

const listQuery = [query("search").optional().trim().isLength({ max: 150 })];

module.exports = { customerBody, idParam, listQuery };
