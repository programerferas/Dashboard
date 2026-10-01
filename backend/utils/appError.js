// Errors we throw on purpose (validation, not found, forbidden...). The error
// middleware trusts their message and status code; anything else becomes a 500.
export class AppError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export const notFound = (what) => new AppError(`${what} غير موجود`, 404);
