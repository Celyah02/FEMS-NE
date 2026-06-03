const { createApp } = require('@fems/shared');
const routes = require('./routes');
const openapi = require('./openapi');
const { startSweeper } = require('./sweeper');

const PORT = process.env.PORT || 4005;
const app = createApp({
  serviceName: 'notification-service',
  openapi,
  mountRoutes: (a) => a.use('/', routes),
});

app.listen(PORT, () => {
  console.log(`✓ notification-service listening on :${PORT}  (docs at /docs)`);
  // Start background reminders/alerts after the server is up.
  startSweeper();
});
