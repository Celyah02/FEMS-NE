/**
 * Notification Service — manages user notifications and scheduled reminders.
 *
 * Responsibilities:
 * - Broadcast notifications to users (created by other services)
 * - Run scheduled jobs to generate reminders:
 *   - Inspection reminders (1 day before scheduled inspection)
 *   - Maintenance reminders (7+ days since last maintenance)
 *   - Expiry alerts (30 days before expiration)
 *   - Compliance alerts (for non-compliant extinguishers)
 *
 * Background Jobs:
 * - Run hourly to check for upcoming inspections, maintenance due, expirations
 * - Create notification records in the database
 * - Users are notified via the /notifications endpoint
 */
const { createApp } = require('@fems/shared');
const routes = require('./routes');
const openapi = require('./openapi');
const { startSweeper } = require('./sweeper');
const jobRunner = require('./jobRunner');

const PORT = process.env.PORT || 4005;
const app = createApp({
  serviceName: 'notification-service',
  openapi,
  mountRoutes: (a) => a.use('/', routes),
});

app.listen(PORT, () => {
  console.log(`✓ notification-service listening on :${PORT}  (docs at /docs)`);

  // Start background services
  startSweeper();           // Clean up old notifications
  jobRunner.start();        // Schedule reminder jobs (inspection, maintenance, expiry, compliance)

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[SIGTERM] Shutting down gracefully...');
    jobRunner.stop();
    process.exit(0);
  });
  process.on('SIGINT', () => {
    console.log('[SIGINT] Shutting down gracefully...');
    jobRunner.stop();
    process.exit(0);
  });
});
