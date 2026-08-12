const { validationResult } = require("express-validator");
const { AppError } = require("./errorHandler");

module.exports = function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const message = errors
      .array()
      .map((e) => e.msg)
      .join(", ");
    return next(new AppError(message, 422, "VALIDATION_ERROR"));
  }
  next();
};
