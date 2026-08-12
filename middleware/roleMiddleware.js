// middleware/roleMiddleware.js
const AppError = require("../utils/AppError");

// requireRole('owner', 'manager') -> middleware that 403s anyone whose
// session role isn't in the allowed list. Mirrors the "Role" column of
// the route table exactly (Section 9 of the doc) — go through every
// route and confirm it enforces its listed role (flagged in Section 14).
function requireRole(...allowedRoles) {
  return function roleGuard(req, res, next) {
    const role = req.session && req.session.user && req.session.user.role;

    if (!role) {
      return next(new AppError("Authentication required.", 401, "auth"));
    }

    if (!allowedRoles.includes(role)) {
      return next(
        new AppError(
          `This action requires role: ${allowedRoles.join(" or ")}.`,
          403,
          "authorization",
        ),
      );
    }

    next();
  };
}

module.exports = { requireRole };
