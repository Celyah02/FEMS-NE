require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

/**
 * API Gateway — the single public entrypoint for all FEMS microservices.
 *
 * RESPONSIBILITIES:
 * - Route incoming requests to the correct microservice based on URL prefix
 * - Forward the Authorization header unchanged so each service validates JWT independently
 * - Handle upstream service failures gracefully (return 502 if service is down)
 * - Apply cross-cutting concerns: security headers (Helmet), CORS, rate limiting, request logging
 *
 * ROUTING:
 * - /api/auth/* -> user-service (handles login, register, token refresh, password reset)
 * - /api/users/* -> user-service (handles user management, profiles)
 * - /api/extinguishers/* -> extinguisher-service (CRUD for fire extinguishers)
 * - /api/inspections/* -> inspection-service (inspection scheduling, completion)
 * - /api/maintenance/* -> inspection-service (maintenance logs and tracking)
 * - /api/reports/* -> reporting-service (summary, compliance, inventory reports)
 * - /api/notifications/* -> notification-service (user notifications and alerts)
 *
 * SECURITY:
 * - All incoming requests must include a valid JWT token (except public auth endpoints)
 * - CORS is configured to restrict requests to trusted origins
 * - Rate limiting prevents brute force and DDoS attacks
 * - Helmet adds security headers (CSP, X-Frame-Options, etc.)
 *
 * DEPLOYMENT:
 * - Configure upstream service URLs via environment variables (USER_SERVICE_URL, etc.)
 * - Set CORS_ORIGIN and JWT_SECRET in .env for your environment
 * - See .env.example for all configuration options
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// ============================================================================
// Security Middleware
// ============================================================================

// Helmet: Sets security-related HTTP headers (CSP, X-Frame-Options, HSTS, etc.)
app.use(helmet());

// CORS: Restrict requests to trusted origins (for production, set CORS_ORIGIN env var)
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));

// ============================================================================
// Logging Middleware
// ============================================================================

// Morgan: HTTP request logging (method, path, status, response time)
app.use(morgan('dev'));

const TARGETS = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:4001',
  extinguisher: process.env.EXTINGUISHER_SERVICE_URL || 'http://localhost:4002',
  inspection: process.env.INSPECTION_SERVICE_URL || 'http://localhost:4003',
  reporting: process.env.REPORTING_SERVICE_URL || 'http://localhost:4004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005',
};

// ============================================================================
// Route Mappings — API prefix to microservice upstream URL
// ============================================================================
// Each route prefix is forwarded to its owning service.
// The /api prefix is stripped before forwarding (e.g., /api/auth/login -> /auth/login).
// This allows services to be independently deployed and scaled.

const ROUTES = [
  ['/api/auth', TARGETS.user],
  ['/api/users', TARGETS.user],
  ['/api/extinguishers', TARGETS.extinguisher],
  ['/api/inspections', TARGETS.inspection],
  ['/api/maintenance', TARGETS.inspection],
  ['/api/reports', TARGETS.reporting],
  ['/api/notifications', TARGETS.notification],
];

// ============================================================================
// Health & Service Discovery Endpoints
// ============================================================================

// GET /health — liveness probe for Kubernetes / load balancers
// Returns current upstream service URLs for debugging and monitoring
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway', targets: TARGETS }));

// GET / — API gateway information and documentation links
// Helps developers discover and access service documentation
app.get('/', (_req, res) =>
  res.json({
    name: 'TZW Fire Extinguisher Management System — API Gateway',
    docs: {
      users: '/api/users/docs (proxied) — or http://localhost:4001/docs',
      extinguishers: 'http://localhost:4002/docs',
      inspections: 'http://localhost:4003/docs',
      reports: 'http://localhost:4004/docs',
      notifications: 'http://localhost:4005/docs',
    },
    routes: ROUTES.map(([p, t]) => ({ prefix: p, upstream: t })),
  })
);

// ============================================================================
// Request Proxying to Microservices
// ============================================================================
// Each route is mounted with a pathFilter to preserve the full path (e.g., /api/auth/login).
// The /api prefix is then stripped by pathRewrite before forwarding to the upstream service.
//
// If an upstream service is unavailable, returns 502 Bad Gateway with a clear error message.
// This prevents requests from timing out and provides better debugging information.

for (const [prefix, target] of ROUTES) {
  app.use(
    createProxyMiddleware({
      pathFilter: (path) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
      target,
      changeOrigin: true,
      pathRewrite: { '^/api': '' }, // /api/auth/login -> /auth/login (upstream only handles /auth/login)
      proxyTimeout: 30000,
      on: {
        error: (err, _req, res) => {
          if (res && !res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'application/json' });
          }
          res?.end(JSON.stringify({ error: { message: `Upstream unavailable: ${err.message}` } }));
        },
      },
    })
  );
}

// ============================================================================
// Server Startup
// ============================================================================

// PORT defaults: GATEWAY_PORT > PORT > 8080
// In docker-compose, GATEWAY_PORT=8080 is set in .env
// In local development, PORT or GATEWAY_PORT can be overridden
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 8080;
app.listen(PORT, () => {
  console.log(`✓ API gateway listening on :${PORT}`);
  for (const [p, t] of ROUTES) console.log(`   ${p}  ->  ${t}`);
});
