/**
 * Rate limiting middleware for FEMS microservices.
 * 
 * Prevents brute force attacks on authentication endpoints (login, register)
 * and general rate limiting for all API endpoints.
 * 
 * Uses in-memory store (suitable for single-instance deployments).
 * For distributed deployments, consider Redis-backed rate limiting.
 */

/**
 * Simple in-memory rate limiter: tracks IP -> request count + timestamp window.
 * Thread-safe for Node's single-threaded event loop.
 */
class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 60) {
    this.windowMs = windowMs;      // Time window in milliseconds
    this.maxRequests = maxRequests; // Max requests per window
    this.requests = new Map();      // IP -> { count, resetTime }
  }

  /**
   * Check if a request from the given IP should be allowed.
   * Returns { allowed: boolean, remaining: number, retryAfter: number|null }
   */
  check(ip) {
    const now = Date.now();
    let record = this.requests.get(ip);

    // Expired window: reset
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + this.windowMs };
      this.requests.set(ip, record);
    }

    record.count++;
    const allowed = record.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - record.count);
    const retryAfter = allowed ? null : Math.ceil((record.resetTime - now) / 1000);

    return { allowed, remaining, retryAfter };
  }

  /**
   * Cleanup old entries (optional, for memory management in long-running processes).
   */
  cleanup() {
    const now = Date.now();
    for (const [ip, record] of this.requests) {
      if (now > record.resetTime) this.requests.delete(ip);
    }
  }
}

/**
 * Express middleware factory: returns rate-limiting middleware.
 * 
 * @param {number} windowMs - Time window in milliseconds (default: 60s)
 * @param {number} maxRequests - Max requests per window (default: 60)
 * @returns {Function} Express middleware
 */
function rateLimitMiddleware(windowMs = 60000, maxRequests = 60) {
  const limiter = new RateLimiter(windowMs, maxRequests);

  // Cleanup old entries every 5 minutes
  setInterval(() => limiter.cleanup(), 5 * 60 * 1000);

  return (req, res, next) => {
    const ip = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const { allowed, remaining, retryAfter } = limiter.check(ip);

    res.setHeader('RateLimit-Limit', maxRequests);
    res.setHeader('RateLimit-Remaining', remaining);
    if (retryAfter) res.setHeader('Retry-After', retryAfter);

    if (!allowed) {
      return res.status(429).json({
        error: {
          message: 'Too many requests, please try again later',
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter,
        },
      });
    }

    next();
  };
}

/**
 * Strict rate limiter for authentication endpoints (login, register, forgot-password).
 * Much tighter limits to prevent credential stuffing and account enumeration.
 */
function authRateLimitMiddleware() {
  // 5 attempts per 15 minutes per IP for auth endpoints
  return rateLimitMiddleware(15 * 60 * 1000, 5);
}

/**
 * General-purpose rate limiter for all API endpoints.
 */
function apiRateLimitMiddleware() {
  // 60 requests per minute per IP for general API
  return rateLimitMiddleware(60 * 1000, 60);
}

module.exports = {
  RateLimiter,
  rateLimitMiddleware,
  authRateLimitMiddleware,
  apiRateLimitMiddleware,
};
