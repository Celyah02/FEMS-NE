const { createApp } = require('@fems/shared');
const routes = require('./routes');
const openapi = require('./openapi');

const PORT = process.env.PORT || 4004;
const app = createApp({
  serviceName: 'reporting-service',
  openapi,
  mountRoutes: (a) => a.use('/', routes),
});

app.listen(PORT, () => console.log(`✓ reporting-service listening on :${PORT}  (docs at /docs)`));
