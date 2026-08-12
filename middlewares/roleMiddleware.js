const { AppError } = require("./errorHandler");

// requireRole('owner', 'manager') -> only those roles pass
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.session?.user?.role;
    if (!role || !allowedRoles.includes(role)) {
      return next(
        new AppError(
          "You do not have permission to do that.",
          403,
          "AUTHORIZATION_ERROR",
        ),
      );
    }
    next();
  };
}

module.exports = { requireRole };
