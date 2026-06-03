const { createApp } = require('@fems/shared');
const routes = require('./routes');
const openapi = require('./openapi');

const PORT = process.env.PORT || 4001;
const app = createApp({
  serviceName: 'user-service',
  openapi,
  mountRoutes: (a) => a.use('/', routes),
});

app.listen(PORT, () => console.log(`✓ user-service listening on :${PORT}  (docs at /docs)`));
