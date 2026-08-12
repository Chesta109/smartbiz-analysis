// validation/authValidation.js
const { body } = require("express-validator");

const registerBody = [
  body("name").trim().notEmpty().withMessage("Name is required."),
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email is required.")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters."),
  body("role").optional().isIn(["owner", "manager", "viewer"]),
];

const loginBody = [
  body("email")
    .trim()
    .isEmail()
    .withMessage("A valid email is required.")
    .normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required."),
];

module.exports = { registerBody, loginBody };
