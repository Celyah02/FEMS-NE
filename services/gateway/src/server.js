require('dotenv').config({ path: require('path').resolve(__dirname, '../../../.env') });

/**
 * API Gateway — the single public entrypoint.
 *
 * Routes `/api/<segment>` to the owning microservice and strips the `/api`
 * prefix. The original Authorization header is forwarded unchanged so each
 * service validates the JWT independently. No request bodies are parsed here;
 * they are streamed straight through to the upstream service.
 */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();
app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN || '*' }));
app.use(morgan('dev'));

const TARGETS = {
  user: process.env.USER_SERVICE_URL || 'http://localhost:4001',
  extinguisher: process.env.EXTINGUISHER_SERVICE_URL || 'http://localhost:4002',
  inspection: process.env.INSPECTION_SERVICE_URL || 'http://localhost:4003',
  reporting: process.env.REPORTING_SERVICE_URL || 'http://localhost:4004',
  notification: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:4005',
};

// Map of public path prefix -> upstream service.
const ROUTES = [
  ['/api/auth', TARGETS.user],
  ['/api/users', TARGETS.user],
  ['/api/extinguishers', TARGETS.extinguisher],
  ['/api/inspections', TARGETS.inspection],
  ['/api/maintenance', TARGETS.inspection],
  ['/api/reports', TARGETS.reporting],
  ['/api/notifications', TARGETS.notification],
];

// Health + service registry view.
app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'gateway', targets: TARGETS }));
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

// Mount every proxy at the root and select it with pathFilter, so the FULL
// path (e.g. /api/extinguishers) is preserved before pathRewrite strips /api.
// (Mounting with app.use('/api/extinguishers', ...) would let Express consume
// the mount path and forward only "/" to the upstream.)
for (const [prefix, target] of ROUTES) {
  app.use(
    createProxyMiddleware({
      pathFilter: (path) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`),
      target,
      changeOrigin: true,
      pathRewrite: { '^/api': '' }, // /api/auth/login -> /auth/login
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

const PORT = process.env.PORT || process.env.GATEWAY_PORT || 8080;
app.listen(PORT, () => {
  console.log(`✓ API gateway listening on :${PORT}`);
  for (const [p, t] of ROUTES) console.log(`   ${p}  ->  ${t}`);
});
