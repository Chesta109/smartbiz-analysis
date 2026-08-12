// middleware/errorHandler.js
// Last middleware in the chain (registered in app.js). Logs technical
// detail, shows the user a safe message, never leaks a stack trace.

const logger = require("../utils/logger");

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || 500;
  const isOperational = err.isOperational === true;

  if (!isOperational) {
    // Unexpected bug — log full detail, never show it to the user.
    logger.error("Unhandled error:", err);
  } else {
    logger.warn(`${err.kind || "error"} (${statusCode}):`, err.message);
  }

  const safeMessage = isOperational
    ? err.message
    : "Something went wrong. Please try again.";

  if (req.originalUrl.startsWith("/api/")) {
    return res
      .status(statusCode)
      .json({ success: false, message: safeMessage });
  }

  // Non-API request: flash the message and send the user back.
  if (req.flash) req.flash("error", safeMessage);
  const fallback = req.get("Referer") || "/dashboard";
  return res.status(statusCode).redirect(fallback);
}

module.exports = errorHandler;
