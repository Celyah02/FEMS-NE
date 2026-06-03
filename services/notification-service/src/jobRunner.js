/**
 * Job Runner — executes scheduled jobs on a periodic basis.
 *
 * This service runs background tasks at regular intervals:
 * - Every hour: inspection reminders, maintenance reminders, expiry alerts, compliance alerts
 * - Every 24 hours: cleanup expired reports
 *
 * In a production system, this should run in a separate process/pod:
 * - Use node-cron for simple interval-based jobs
 * - Use a dedicated job queue (Bull, Resque) for complex job management
 * - Use external schedulers (AWS Lambda, Google Cloud Tasks) for serverless deployments
 */

const jobs = require('./scheduledJobs');

// Store active intervals so we can stop them
let activeIntervals = [];

/**
 * Start the job runner.
 * Schedules all background jobs to run at regular intervals.
 */
function start() {
  console.log('[JOBS] Starting scheduled job runner...');

  // ========================================================================
  // Hourly Jobs (inspection reminders, alerts, etc.)
  // ========================================================================

  // Run inspection reminders every hour at :00
  activeIntervals.push(
    setInterval(async () => {
      try {
        await jobs.jobInspectionReminders();
      } catch (err) {
        console.error('[JOBS] Error running inspection reminders:', err.message);
      }
    }, 60 * 60 * 1000) // 1 hour
  );

  // Run maintenance reminders every hour at :15
  activeIntervals.push(
    setInterval(async () => {
      try {
        await jobs.jobMaintenanceReminders();
      } catch (err) {
        console.error('[JOBS] Error running maintenance reminders:', err.message);
      }
    }, 60 * 60 * 1000) // 1 hour
  );

  // Run expiry alerts every hour at :30
  activeIntervals.push(
    setInterval(async () => {
      try {
        await jobs.jobExpiryAlerts();
      } catch (err) {
        console.error('[JOBS] Error running expiry alerts:', err.message);
      }
    }, 60 * 60 * 1000) // 1 hour
  );

  // Run compliance alerts every hour at :45
  activeIntervals.push(
    setInterval(async () => {
      try {
        await jobs.jobComplianceAlerts();
      } catch (err) {
        console.error('[JOBS] Error running compliance alerts:', err.message);
      }
    }, 60 * 60 * 1000) // 1 hour
  );

  // ========================================================================
  // Daily Jobs (cleanup, etc.)
  // ========================================================================

  // Cleanup expired reports every 24 hours (at 2 AM UTC equivalent)
  activeIntervals.push(
    setInterval(async () => {
      try {
        // Dynamically require to avoid circular dependencies
        const storage = require('../reporting-service/src/reportStorage');
        const deleted = await storage.cleanupExpiredReports();
        console.log(`[JOBS] Cleaned up ${deleted} expired reports`);
      } catch (err) {
        console.error('[JOBS] Error cleaning up reports:', err.message);
      }
    }, 24 * 60 * 60 * 1000) // 24 hours
  );

  console.log('[JOBS] Job runner started successfully');
}

/**
 * Stop the job runner (cleanly shutdown all intervals).
 * Call this on process.SIGTERM or process.SIGINT.
 */
function stop() {
  console.log('[JOBS] Stopping scheduled job runner...');
  activeIntervals.forEach((interval) => clearInterval(interval));
  activeIntervals = [];
  console.log('[JOBS] Job runner stopped');
}

module.exports = {
  start,
  stop,
};
