// Wraps an async route handler so a rejected promise reaches the error
// middleware instead of hanging the request. Saves a try/catch in every handler.
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);
