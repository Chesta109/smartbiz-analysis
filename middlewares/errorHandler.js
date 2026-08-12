const logger = require("../utils/logger");

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

  const userMessage =
    statusCode >= 500 ? "Something went wrong. Please try again." : err.message;

  const wantsJson =
    req.originalUrl.startsWith("/api/") ||
    req.xhr ||
    req.is("application/json");
  if (wantsJson) {
    return res.status(statusCode).json({ error: userMessage, type });
  }

  req.flash?.("error", userMessage);

  if (statusCode === 401 || type === "AUTHENTICATION_ERROR") {
    return res.redirect("/login");
  }

  return res.redirect("back");
}

module.exports = { errorHandler, AppError };
