// Wraps an async controller so rejected promises reach errorHandler instead of hanging.
module.exports = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
