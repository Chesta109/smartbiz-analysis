// middleware/validateRequest.js
// Runs after an express-validator chain (see validation/*.js) and turns
// any accumulated errors into a single AppError. Controllers never see
// raw validation error objects.

const { validationResult } = require("express-validator");
const AppError = require("../utils/AppError");

function validateRequest(req, res, next) {
  const result = validationResult(req);
  if (result.isEmpty()) return next();

  const message = result
    .array()
    .map((e) => e.msg)
    .join(" ");

  next(new AppError(message, 422, "validation"));
}

module.exports = validateRequest;
