const logger = require("../utils/logger");
const { wantsJson, safePageRedirect } = require("../utils/request");

// Services throw these; controllers never build error shapes themselves.
class AppError extends Error {
  constructor(message, statusCode = 500, type = "SYSTEM_ERROR") {
    super(message);
    this.statusCode = statusCode;
    this.type = type;
  }
}

function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const type = err.type || "SYSTEM_ERROR";

  logger.error(`[${type}] ${err.message}`, {
    stack: err.stack,
    path: req.originalUrl,
  });

  // Delivery/configuration messages are deliberately written as safe public
  // guidance by emailService. All other 5xx errors remain opaque.
  const safeOperationalEmailError = ["EMAIL_CONFIGURATION_ERROR", "EMAIL_DELIVERY_ERROR"].includes(type);
  const userMessage =
    statusCode >= 500 && !safeOperationalEmailError ? "Something went wrong. Please try again." : err.message;

  if (wantsJson(req)) {
    return res.status(statusCode).json({ error: userMessage, type });
  }

  req.flash?.("error", userMessage);

  if (statusCode === 401 || type === "AUTHENTICATION_ERROR") {
    return res.redirect("/login");
  }

  return res.redirect(safePageRedirect(req));
}

module.exports = { errorHandler, AppError };
