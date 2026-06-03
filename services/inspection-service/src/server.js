const { createApp } = require('@fems/shared');
const routes = require('./routes');
const openapi = require('./openapi');

const PORT = process.env.PORT || 4003;
const app = createApp({
  serviceName: 'inspection-service',
  openapi,
  mountRoutes: (a) => a.use('/', routes),
});

app.listen(PORT, () => console.log(`✓ inspection-service listening on :${PORT}  (docs at /docs)`));
