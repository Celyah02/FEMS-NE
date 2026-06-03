/**
 * Scheduled Jobs Service — background tasks for notifications and maintenance.
 *
 * Runs periodic jobs to:
 * - Send inspection reminders (1 day before scheduled inspection)
 * - Send maintenance reminders (7 days after last maintenance)
 * - Send expiry alerts (30 days before expiration)
 * - Send compliance alerts (for non-compliant extinguishers)
 * - Cleanup old reports
 *
 * In production, this should be run by:
 * - A dedicated cronjob service (node-cron)
 * - An external job scheduler (AWS Lambda, Google Cloud Tasks, etc.)
 * - A queue system (Bull, RabbitMQ, etc.)
 */

const { query, ApiError } = require('@fems/shared');

/**
 * Create or update a scheduled job record.
 * Prevents duplicate jobs from running simultaneously.
 */
async function getOrCreateJob(jobType) {
  // Try to find an existing pending/running job
  const { rows: existing } = await query(
    `SELECT * FROM scheduled_jobs
     WHERE job_type = $1 AND status IN ('pending', 'running')
     LIMIT 1`,
    [jobType]
  );

  if (existing.length) {
    return existing[0]; // Use existing job
  }

  // Create a new job record
  const { rows } = await query(
    `INSERT INTO scheduled_jobs (job_type, status, run_at)
     VALUES ($1, 'pending', now())
     RETURNING *`,
    [jobType]
  );

  return rows[0];
}

/**
 * Mark a job as running.
 */
async function startJob(jobId) {
  await query(
    `UPDATE scheduled_jobs SET status = 'running', ran_at = now() WHERE id = $1`,
    [jobId]
  );
}

/**
 * Mark a job as completed.
 */
async function completeJob(jobId) {
  await query(
    `UPDATE scheduled_jobs
     SET status = 'completed', ran_at = now(), retry_count = 0
     WHERE id = $1`,
    [jobId]
  );
}

/**
 * Mark a job as failed and increment retry count.
 * If max retries exceeded, mark as failed permanently.
 */
async function failJob(jobId, errorMessage) {
  const { rows } = await query(
    `SELECT retry_count, max_retries FROM scheduled_jobs WHERE id = $1`,
    [jobId]
  );

  if (!rows.length) return;

  const { retry_count, max_retries } = rows[0];

  if (retry_count >= max_retries) {
    // Max retries exceeded
    await query(
      `UPDATE scheduled_jobs
       SET status = 'failed', error_message = $2, retry_count = $3
       WHERE id = $1`,
      [jobId, errorMessage, retry_count + 1]
    );
  } else {
    // Schedule retry
    const nextRetryAt = new Date(Date.now() + (retry_count + 1) * 60 * 1000); // Exponential backoff
    await query(
      `UPDATE scheduled_jobs
       SET status = 'pending', error_message = $2, retry_count = $3, run_at = $4
       WHERE id = $1`,
      [jobId, errorMessage, retry_count + 1, nextRetryAt]
    );
  }
}

/**
 * Job: Send inspection reminders (1 day before scheduled inspection).
 */
async function jobInspectionReminders() {
  const jobId = (await getOrCreateJob('inspection_reminder')).id;
  await startJob(jobId);

  try {
    // Find inspections scheduled for tomorrow (±1 hour)
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const tomorrow2 = new Date(tomorrow.getTime() + 60 * 60 * 1000);
    const yesterday2 = new Date(tomorrow.getTime() - 2 * 60 * 60 * 1000);

    const { rows: inspections } = await query(
      `SELECT i.id, i.scheduled_date, i.scheduled_time, i.extinguisher_id, e.serial_number, i.assigned_to
       FROM inspections i
       JOIN extinguishers e ON i.extinguisher_id = e.id
       WHERE i.status = 'pending'
         AND i.scheduled_date::date = $1::date
         AND (i.scheduled_time::time, i.scheduled_date::date)::timestamp >= $2
         AND (i.scheduled_time::time, i.scheduled_date::date)::timestamp < $3`,
      [tomorrow.toISOString(), yesterday2.toISOString(), tomorrow2.toISOString()]
    );

    console.log(`[JOB] Found ${inspections.length} inspections scheduled for tomorrow`);

    // Send notification to assigned inspector
    for (const insp of inspections) {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, related_entity, related_id)
         VALUES ($1, 'inspection', 'Inspection Reminder', $2, 'inspection', $3)`,
        [
          insp.assigned_to,
          `Inspection of extinguisher ${insp.serial_number} scheduled for ${insp.scheduled_time}`,
          insp.id,
        ]
      );
    }

    await completeJob(jobId);
  } catch (err) {
    console.error('[JOB] inspection_reminder failed:', err.message);
    await failJob(jobId, err.message);
  }
}

/**
 * Job: Send maintenance reminders (7 days after last maintenance).
 */
async function jobMaintenanceReminders() {
  const jobId = (await getOrCreateJob('maintenance_reminder')).id;
  await startJob(jobId);

  try {
    // Find extinguishers where maintenance is due (7+ days since last maintenance)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const { rows: extinguishers } = await query(
      `SELECT DISTINCT e.id, e.serial_number, e.status
       FROM extinguishers e
       LEFT JOIN maintenance_logs m ON e.id = m.extinguisher_id
       WHERE e.status = 'active'
         AND (m.id IS NULL OR m.completed_at < $1)
       ORDER BY e.serial_number`,
      [sevenDaysAgo]
    );

    console.log(`[JOB] Found ${extinguishers.length} extinguishers requiring maintenance`);

    // Send notifications to all inspectors
    const { rows: inspectors } = await query(
      `SELECT id FROM users WHERE role = 'inspector' AND is_active = true`
    );

    for (const ext of extinguishers) {
      for (const inspector of inspectors) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, related_entity, related_id)
           VALUES ($1, 'maintenance', 'Maintenance Due', $2, 'extinguisher', $3)`,
          [
            inspector.id,
            `Extinguisher ${ext.serial_number} is due for maintenance`,
            ext.id,
          ]
        );
      }
    }

    await completeJob(jobId);
  } catch (err) {
    console.error('[JOB] maintenance_reminder failed:', err.message);
    await failJob(jobId, err.message);
  }
}

/**
 * Job: Send expiry alerts (30 days before expiration).
 */
async function jobExpiryAlerts() {
  const jobId = (await getOrCreateJob('expiry_alert')).id;
  await startJob(jobId);

  try {
    // Find extinguishers expiring in the next 30 days
    const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const { rows: expiring } = await query(
      `SELECT id, serial_number, expiry_date, location
       FROM extinguishers
       WHERE status IN ('active', 'maintenance')
         AND expiry_date <= $1
         AND expiry_date > now()
       ORDER BY expiry_date ASC`,
      [thirtyDaysFromNow]
    );

    console.log(`[JOB] Found ${expiring.length} extinguishers expiring soon`);

    // Send notifications to all admins
    const { rows: admins } = await query(
      `SELECT id FROM users WHERE role = 'admin' AND is_active = true`
    );

    for (const ext of expiring) {
      for (const admin of admins) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, related_entity, related_id)
           VALUES ($1, 'compliance', 'Expiry Alert', $2, 'extinguisher', $3)`,
          [
            admin.id,
            `Extinguisher ${ext.serial_number} at ${ext.location} expires on ${ext.expiry_date}`,
            ext.id,
          ]
        );
      }
    }

    await completeJob(jobId);
  } catch (err) {
    console.error('[JOB] expiry_alert failed:', err.message);
    await failJob(jobId, err.message);
  }
}

/**
 * Job: Send compliance alerts (for non-compliant extinguishers).
 */
async function jobComplianceAlerts() {
  const jobId = (await getOrCreateJob('compliance_alert')).id;
  await startJob(jobId);

  try {
    // Find extinguishers that are expired or overdue for inspection
    const { rows: nonCompliant } = await query(
      `SELECT DISTINCT e.id, e.serial_number, e.location, e.status,
              CASE
                WHEN e.expiry_date < now() THEN 'EXPIRED'
                WHEN e.expiry_date < now() + interval '30 days' THEN 'EXPIRING_SOON'
                WHEN NOT EXISTS (
                  SELECT 1 FROM inspections i
                  WHERE i.extinguisher_id = e.id
                    AND i.status = 'completed'
                    AND i.completed_at > now() - interval '365 days'
                ) THEN 'INSPECTION_OVERDUE'
              END as issue
       FROM extinguishers e
       WHERE e.status IN ('active', 'maintenance')
         AND (e.expiry_date < now() + interval '30 days'
              OR NOT EXISTS (
                SELECT 1 FROM inspections i
                WHERE i.extinguisher_id = e.id
                  AND i.status = 'completed'
                  AND i.completed_at > now() - interval '365 days'
              ))
       LIMIT 100`
    );

    console.log(`[JOB] Found ${nonCompliant.length} non-compliant extinguishers`);

    // Send notifications to all admins
    const { rows: admins } = await query(
      `SELECT id FROM users WHERE role = 'admin' AND is_active = true`
    );

    for (const ext of nonCompliant) {
      for (const admin of admins) {
        const message = ext.issue === 'EXPIRED'
          ? `Extinguisher ${ext.serial_number} is EXPIRED`
          : ext.issue === 'EXPIRING_SOON'
          ? `Extinguisher ${ext.serial_number} is expiring soon`
          : `Extinguisher ${ext.serial_number} is overdue for inspection`;

        await query(
          `INSERT INTO notifications (user_id, type, title, message, related_entity, related_id)
           VALUES ($1, 'compliance', 'Compliance Issue', $2, 'extinguisher', $3)`,
          [admin.id, message, ext.id]
        );
      }
    }

    await completeJob(jobId);
  } catch (err) {
    console.error('[JOB] compliance_alert failed:', err.message);
    await failJob(jobId, err.message);
  }
}

module.exports = {
  getOrCreateJob,
  startJob,
  completeJob,
  failJob,
  jobInspectionReminders,
  jobMaintenanceReminders,
  jobExpiryAlerts,
  jobComplianceAlerts,
};
