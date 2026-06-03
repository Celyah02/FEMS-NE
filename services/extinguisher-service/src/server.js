const { createApp } = require('@fems/shared');
const routes = require('./routes');
const openapi = require('./openapi');

const PORT = process.env.PORT || 4002;
const app = createApp({
  serviceName: 'extinguisher-service',
  openapi,
  mountRoutes: (a) => a.use('/', routes),
});

app.listen(PORT, () => console.log(`✓ extinguisher-service listening on :${PORT}  (docs at /docs)`));
