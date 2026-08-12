// middleware/authMiddleware.js
const AppError = require("../utils/AppError");

// Requires an active session. Applied to every route in the route table
// marked "Auth required: Yes" (Section 9 of the doc).
function requireAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    if (req.originalUrl.startsWith("/api/")) {
      return next(new AppError("Authentication required.", 401, "auth"));
    }
    return res.redirect("/login");
  }
  next();
}

module.exports = { requireAuth };
