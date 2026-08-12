// utils/AppError.js
// A typed error so errorHandler can tell "expected" failures (bad input,
// not found, forbidden) apart from real bugs, per Section 15 of the doc
// (never allow silent failures, separate error categories).

class AppError extends Error {
  constructor(message, statusCode = 500, kind = "system") {
    super(message);
    this.statusCode = statusCode;
    this.kind = kind; // 'validation' | 'auth' | 'authorization' | 'database' | 'analytics' | 'system' | 'not_found'
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
