/**
 * Notification Sweeper (background reminders / alerts).
 *
 * This file adds "reminder-style" notifications that the UI can display:
 * - Upcoming inspection reminders
 * - Overdue inspection alerts
 * - Expiry alerts (expiring soon + expired)
 * - Maintenance reminders (for units stuck in maintenance)
 * - Daily compliance summary (admins)
 *
 * Design goals:
 * - Safe-by-default: failures are logged; the service keeps running.
 * - No spam: uses `notification_alert_dedup` unique keys to avoid duplicates.
 * - Configurable: most behavior is controlled by env vars.
 *
 * NOTE:
 * This is a pragmatic approach for this codebase. In a larger production system,
 * you would typically run this as a separate worker process and/or use a queue.
 */
const { query } = require('@fems/shared');

function intEnv(name, def) {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return def;
  const n = Number.parseInt(String(raw), 10);
  return Number.isFinite(n) ? n : def;
}

async function listAdmins() {
  const { rows } = await query(`SELECT id FROM users WHERE role = 'admin' AND is_active = TRUE`);
  return rows.map((r) => r.id);
}

async function acquireDedup(dedupKey) {
  const { rowCount } = await query(
    `INSERT INTO notification_alert_dedup (dedup_key) VALUES ($1)
     ON CONFLICT (dedup_key) DO NOTHING`,
    [dedupKey]
  );
  return rowCount === 1;
}

async function createNotification({ userId, type, title, message, relatedEntity, relatedId, dedupKey }) {
  // 1) Check/claim dedup key.
  const ok = await acquireDedup(dedupKey);
  if (!ok) return false;

  // 2) Insert the actual notification.
  await query(
    `INSERT INTO notifications (user_id, type, title, message, related_entity, related_id)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [userId || null, type || 'info', title, message, relatedEntity || null, relatedId || null]
  );
  return true;
}

async function sweepExpiryAlerts() {
  const days = intEnv('EXPIRY_ALERT_DAYS', 30);
  const admins = await listAdmins();
  if (!admins.length) return;

  // Expiring soon.
  const expSoon = await query(
    `SELECT id, serial_number, location, expiry_date
     FROM fire_extinguishers
     WHERE status <> 'decommissioned'
       AND expiry_date >= CURRENT_DATE
       AND expiry_date <= (CURRENT_DATE + ($1 || ' days')::interval)
     ORDER BY expiry_date ASC`,
    [days]
  );
  for (const e of expSoon.rows) {
    for (const adminId of admins) {
      await createNotification({
        userId: adminId,
        type: 'compliance',
        title: 'Extinguisher expiring soon',
        message: `Serial ${e.serial_number} at "${e.location}" expires on ${String(e.expiry_date).slice(0, 10)}.`,
        relatedEntity: 'extinguisher',
        relatedId: e.id,
        dedupKey: `expiry_soon:${e.id}:${String(e.expiry_date).slice(0, 10)}:${adminId}`,
      });
    }
  }

  // Already expired.
  const expired = await query(
    `SELECT id, serial_number, location, expiry_date
     FROM fire_extinguishers
     WHERE status <> 'decommissioned'
       AND expiry_date < CURRENT_DATE
     ORDER BY expiry_date DESC`
  );
  for (const e of expired.rows) {
    for (const adminId of admins) {
      await createNotification({
        userId: adminId,
        type: 'compliance',
        title: 'Extinguisher expired',
        message: `Serial ${e.serial_number} at "${e.location}" expired on ${String(e.expiry_date).slice(0, 10)}.`,
        relatedEntity: 'extinguisher',
        relatedId: e.id,
        dedupKey: `expiry_expired:${e.id}:${String(e.expiry_date).slice(0, 10)}:${adminId}`,
      });
    }
  }
}

async function sweepInspectionAlerts() {
  const days = intEnv('INSPECTION_REMINDER_DAYS', 3);

  // Upcoming pending inspections.
  const upcoming = await query(
    `SELECT i.id, i.scheduled_date, i.assigned_to, i.scheduled_by, e.serial_number, e.location
     FROM inspections i
     JOIN fire_extinguishers e ON e.id = i.extinguisher_id
     WHERE i.status = 'pending'
       AND i.scheduled_date >= CURRENT_DATE
       AND i.scheduled_date <= (CURRENT_DATE + ($1 || ' days')::interval)
     ORDER BY i.scheduled_date ASC`,
    [days]
  );

  for (const r of upcoming.rows) {
    const users = [r.assigned_to, r.scheduled_by].filter(Boolean);
    for (const userId of users) {
      await createNotification({
        userId,
        type: 'inspection',
        title: 'Upcoming inspection',
        message: `Inspection for ${r.serial_number} ("${r.location}") scheduled on ${String(r.scheduled_date).slice(0, 10)}.`,
        relatedEntity: 'inspection',
        relatedId: r.id,
        dedupKey: `inspection_upcoming:${r.id}:${userId}:${String(r.scheduled_date).slice(0, 10)}`,
      });
    }
  }

  // Overdue inspections (pending and in the past OR already marked overdue).
  const overdue = await query(
    `SELECT i.id, i.scheduled_date, i.assigned_to, i.scheduled_by, e.serial_number, e.location
     FROM inspections i
     JOIN fire_extinguishers e ON e.id = i.extinguisher_id
     WHERE i.status IN ('pending','overdue')
       AND i.scheduled_date < CURRENT_DATE
     ORDER BY i.scheduled_date DESC`
  );
  for (const r of overdue.rows) {
    const users = [r.assigned_to, r.scheduled_by].filter(Boolean);
    for (const userId of users) {
      await createNotification({
        userId,
        type: 'inspection',
        title: 'Inspection overdue',
        message: `Inspection for ${r.serial_number} ("${r.location}") is overdue (was scheduled for ${String(r.scheduled_date).slice(0, 10)}).`,
        relatedEntity: 'inspection',
        relatedId: r.id,
        dedupKey: `inspection_overdue:${r.id}:${userId}:${String(r.scheduled_date).slice(0, 10)}`,
      });
    }
  }
}

async function sweepMaintenanceReminders() {
  const days = intEnv('MAINTENANCE_REMINDER_DAYS', 14);
  const admins = await listAdmins();
  // Inspectors also care about maintenance.
  const inspectors = await query(`SELECT id FROM users WHERE role = 'inspector' AND is_active = TRUE`);
  const recipients = [...new Set([...admins, ...inspectors.rows.map((r) => r.id)])];
  if (!recipients.length) return;

  const { rows } = await query(
    `SELECT e.id, e.serial_number, e.location,
            MAX(m.maintenance_date) AS last_maintenance_date
     FROM fire_extinguishers e
     LEFT JOIN maintenance_logs m ON m.extinguisher_id = e.id
     WHERE e.status = 'maintenance'
     GROUP BY e.id, e.serial_number, e.location
     ORDER BY MAX(m.maintenance_date) NULLS FIRST`
  );

  for (const e of rows) {
    const last = e.last_maintenance_date ? String(e.last_maintenance_date).slice(0, 10) : null;
    // If no maintenance record, or last maintenance is too old.
    const tooOld = await query(
      `SELECT
         CASE
           WHEN $1::date IS NULL THEN TRUE
           ELSE ($1::date < (CURRENT_DATE - ($2 || ' days')::interval))
         END AS stale`,
      [last, days]
    );
    if (!tooOld.rows[0]?.stale) continue;

    for (const userId of recipients) {
      await createNotification({
        userId,
        type: 'maintenance',
        title: 'Maintenance reminder',
        message: `Extinguisher ${e.serial_number} ("${e.location}") is in maintenance. Last maintenance: ${last || 'none recorded'}.`,
        relatedEntity: 'extinguisher',
        relatedId: e.id,
        dedupKey: `maintenance_reminder:${e.id}:${last || 'none'}:${userId}`,
      });
    }
  }
}

async function sweepDailyComplianceSummary() {
  const enabled = (process.env.COMPLIANCE_SUMMARY_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) return;

  const admins = await listAdmins();
  if (!admins.length) return;

  const days = intEnv('EXPIRY_ALERT_DAYS', 30);
  const today = new Date().toISOString().slice(0, 10);

  const expired = await query(
    `SELECT COUNT(*)::int AS c
     FROM fire_extinguishers
     WHERE status <> 'decommissioned' AND expiry_date < CURRENT_DATE`
  );
  const upcoming = await query(
    `SELECT COUNT(*)::int AS c
     FROM fire_extinguishers
     WHERE status <> 'decommissioned'
       AND expiry_date >= CURRENT_DATE
       AND expiry_date <= (CURRENT_DATE + ($1 || ' days')::interval)`,
    [days]
  );

  for (const adminId of admins) {
    await createNotification({
      userId: adminId,
      type: 'compliance',
      title: 'Daily compliance summary',
      message: `As of ${today}: expired=${expired.rows[0].c}, expiringWithin${days}Days=${upcoming.rows[0].c}.`,
      relatedEntity: null,
      relatedId: null,
      dedupKey: `compliance_summary:${today}:${adminId}`,
    });
  }
}

async function sweepOnce() {
  await sweepExpiryAlerts();
  await sweepInspectionAlerts();
  await sweepMaintenanceReminders();
  await sweepDailyComplianceSummary();
}

function startSweeper() {
  const enabled = (process.env.NOTIFICATION_SWEEPER_ENABLED || 'true').toLowerCase() !== 'false';
  if (!enabled) {
    console.log('[notification-sweeper] disabled (NOTIFICATION_SWEEPER_ENABLED=false)');
    return;
  }

  const minutes = intEnv('NOTIFICATION_SWEEPER_INTERVAL_MINUTES', 10);
  const intervalMs = Math.max(10, minutes) * 60 * 1000; // never run more often than every 10 minutes

  const run = async () => {
    try {
      await sweepOnce();
    } catch (err) {
      console.error('[notification-sweeper] sweep failed:', err.message);
    }
  };

  // Run once on startup (safe: dedup prevents spam).
  run();

  // Then run periodically.
  setInterval(run, intervalMs).unref?.();
  console.log(`[notification-sweeper] enabled; interval=${Math.max(10, minutes)} minutes`);
}

module.exports = { startSweeper };

