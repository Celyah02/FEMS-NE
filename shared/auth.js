/**
 * Shared JWT authentication & role-based authorization middleware.
 *
 * The gateway forwards the original Authorization header to each service, so
 * every service validates the access token independently using the shared
 * JWT secret. This keeps services stateless and independently deployable.
 */
const jwt = require('jsonwebtoken');
const { ApiError } = require('./http');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_access_secret_change_me';

function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  return null;
}

/** Require a valid access token. Populates req.user = { id, email, role }. */
function authenticate(req, _res, next) {
  const token = extractToken(req);
  if (!token) return next(ApiError.unauthorized('Missing bearer token'));
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email, role: payload.role };
    next();
  } catch (err) {
    next(ApiError.unauthorized('Invalid or expired token'));
  }
}

/** Attach req.user if a valid token is present, but never reject. */
function optionalAuth(req, _res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      req.user = { id: payload.sub, email: payload.email, role: payload.role };
    } catch (_) { /* ignore */ }
  }
  next();
}

/** Require the authenticated user to hold one of the given roles. */
function requireRole(...roles) {
  return (req, _res, next) => {
    if (!req.user) return next(ApiError.unauthorized());
    if (!roles.includes(req.user.role)) {
      return next(ApiError.forbidden(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}

module.exports = { authenticate, optionalAuth, requireRole, JWT_SECRET };
