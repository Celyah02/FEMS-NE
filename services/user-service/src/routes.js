const { Router } = require('express');
const { authenticate, requireRole } = require('@fems/shared');
const { authRateLimitMiddleware } = require('@fems/shared/rateLimiter');
const auth = require('./authController');
const users = require('./userController');

const router = Router();

// ============================================================================
// Auth Endpoints (public, but rate-limited to prevent brute force)
// ============================================================================
// These endpoints have strict rate limiting: 5 attempts per 15 minutes per IP.
// This prevents credential stuffing, account enumeration, and password spray attacks.

router.post('/auth/register', authRateLimitMiddleware(), auth.register);
router.post('/auth/login', authRateLimitMiddleware(), auth.login);
router.post('/auth/refresh', authRateLimitMiddleware(), auth.refresh);
router.post('/auth/logout', authRateLimitMiddleware(), auth.logout);
router.post('/auth/forgot-password', authRateLimitMiddleware(), auth.forgotPassword);
router.post('/auth/reset-password', authRateLimitMiddleware(), auth.resetPassword);

// ============================================================================
// Current User Endpoints (authenticated)
// ============================================================================
// Any authenticated user can view/modify their own profile.

router.get('/users/me', authenticate, users.getMe);
router.patch('/users/me', authenticate, users.updateMe);
router.post('/users/me/change-password', authenticate, users.changePassword);

// ============================================================================
// Admin User Management Endpoints (admin only)
// ============================================================================
// Only admins can view the user list, create/update/delete users.
// Future: add audit logging here for regulatory compliance (GDPR, SOC2, etc.)

router.get('/users', authenticate, requireRole('admin'), users.listUsers);
router.post('/users', authenticate, requireRole('admin'), users.createUser);
router.get('/users/:id', authenticate, requireRole('admin'), users.getUser);
router.patch('/users/:id', authenticate, requireRole('admin'), users.updateUser);
router.delete('/users/:id', authenticate, requireRole('admin'), users.deleteUser);

module.exports = router;
