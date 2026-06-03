/**
 * Factory that builds a baseline Express app with the cross-cutting middleware
 * every FEMS service shares: security headers, CORS, JSON parsing, request
 * logging, health check, optional Swagger UI, rate limiting, and error handling.
 *
 * Each service supplies its name, routes and (optionally) an OpenAPI spec.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const { notFoundHandler, errorHandler } = require('./http');
const { apiRateLimitMiddleware } = require('./rateLimiter');
const { auditMiddleware } = require('./audit');

/**
 * @param {object} opts
 * @param {string} opts.serviceName - Name of the microservice for logging/health checks
 * @param {(app: import('express').Express) => void} opts.mountRoutes - Function to attach routes
 * @param {object} [opts.openapi]  - Optional OpenAPI spec object served at /docs
 */
function createApp({ serviceName, mountRoutes, openapi }) {
  const app = express();

  // ============================================================================
  // Security Middleware
  // ============================================================================

  // Helmet: sets security-related HTTP headers (CSP, X-Frame-Options, etc.)
  app.use(helmet());

  // CORS: restrict origin to specific frontend URL in production, allow all in dev
  // In production, CORS_ORIGIN should be set to the frontend domain (e.g., https://app.example.com)
  const corsOrigin = process.env.CORS_ORIGIN;
  app.use(
    cors({
      origin:
        corsOrigin && corsOrigin !== '*'
          ? corsOrigin.split(',').map((s) => s.trim()) // Allow comma-separated list
          : corsOrigin === '*'
          ? '*'
          : ['http://localhost:3000', 'http://localhost:3001'], // Localhost defaults
      credentials: true,
      methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      maxAge: 86400, // 24 hours
    })
  );

  // ============================================================================
  // Parsing & Logging Middleware
  // ============================================================================

  // Parse JSON bodies with 1MB limit
  app.use(express.json({ limit: '1mb' }));
  // Parse URL-encoded bodies
  app.use(express.urlencoded({ extended: true }));
  // Request logging (HTTP method, path, response time)
  if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

  // ============================================================================
  // Rate Limiting Middleware
  // ============================================================================
  // Applies general rate limiting (60 req/min per IP) to all endpoints.
  // Auth endpoints (login, register) have stricter limits applied in their routes.
  app.use(apiRateLimitMiddleware());

  // ============================================================================
  // Audit Logging Middleware
  // ============================================================================
  // Attaches audit function to each request for logging admin actions.
  app.use(auditMiddleware);

  // ============================================================================
  // Health Check & Service Discovery
  // ============================================================================

  // Health / readiness probe: used by docker-compose, kubernetes, and gateway
  app.get('/health', (_req, res) =>
    res.json({ status: 'ok', service: serviceName, time: new Date().toISOString() })
  );

  // ============================================================================
  // API Documentation (Swagger/OpenAPI)
  // ============================================================================

  if (openapi) {
    // Serve raw OpenAPI spec as JSON
    app.get('/openapi.json', (_req, res) => res.json(openapi));
    // Serve Swagger UI at /docs
    app.use('/docs', swaggerUi.serve, swaggerUi.setup(openapi, { customSiteTitle: `${serviceName} API` }));
  }

  // ============================================================================
  // Application Routes
  // ============================================================================

  mountRoutes(app);

  // ============================================================================
  // Error Handling Tail
  // ============================================================================

  // 404: No route matched
  app.use(notFoundHandler);
  // Global error handler: catches all thrown errors and formats response
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
