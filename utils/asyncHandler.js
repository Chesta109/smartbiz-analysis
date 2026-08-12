// utils/asyncHandler.js
// Wraps an async controller fn so rejected promises reach errorHandler
// instead of crashing the process or hanging the request.

module.exports = function asyncHandler(fn) {
  return function wrapped(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
