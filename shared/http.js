/**
 * Shared HTTP helpers: typed API errors, async wrapper, 404 + error handlers.
 */

class ApiError extends Error {
  constructor(status, message, details) {
    super(message);
    this.status = status;
    this.details = details;
    this.expose = true;
  }
  static badRequest(msg, details) { return new ApiError(400, msg || 'Bad request', details); }
  static unauthorized(msg) { return new ApiError(401, msg || 'Unauthorized'); }
  static forbidden(msg) { return new ApiError(403, msg || 'Forbidden'); }
  static notFound(msg) { return new ApiError(404, msg || 'Not found'); }
  static conflict(msg) { return new ApiError(409, msg || 'Conflict'); }
}

/** Wrap an async route handler so rejected promises reach the error handler. */
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** 404 fallback. */
const notFoundHandler = (req, res) => {
  res.status(404).json({ error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
};

/** Central error handler. Maps known Postgres errors to friendly responses. */
const errorHandler = (err, req, res, _next) => {
  // Postgres unique violation
  if (err.code === '23505') {
    return res.status(409).json({ error: { message: 'A record with that value already exists.', detail: err.detail } });
  }
  // Postgres foreign-key / check violations
  if (err.code === '23503' || err.code === '23514' || err.code === '22P02') {
    return res.status(400).json({ error: { message: 'Invalid reference or value.', detail: err.detail || err.message } });
  }

  const status = err.status || 500;
  if (status >= 500) console.error('[error]', err);

  res.status(status).json({
    error: {
      message: err.expose || status < 500 ? err.message : 'Internal server error',
      ...(err.details ? { details: err.details } : {}),
    },
  });
};

module.exports = { ApiError, asyncHandler, notFoundHandler, errorHandler };
