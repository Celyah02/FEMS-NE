/**
 * Report data builders. Each function returns a plain object/array that can be
 * rendered as JSON, CSV or PDF. The Reporting service reads across the shared
 * database (extinguishers, inspections, maintenance) — the one place where a
 * cross-cutting read is intentional.
 */
const { query } = require('@fems/shared');

async function markOverdue() {
  await query(
    `UPDATE inspections SET status = 'overdue'
     WHERE status = 'pending' AND scheduled_date < CURRENT_DATE`
  );
}

// ---- Inventory -------------------------------------------------------------
async function inventoryReport() {
  const total = await query('SELECT COUNT(*)::int AS c FROM fire_extinguishers');
  const byStatus = await query(
    'SELECT status, COUNT(*)::int AS count FROM fire_extinguishers GROUP BY status ORDER BY status'
  );
  const byType = await query(
    'SELECT type, COUNT(*)::int AS count FROM fire_extinguishers GROUP BY type ORDER BY type'
  );
  const bySize = await query(
    'SELECT size, COUNT(*)::int AS count FROM fire_extinguishers GROUP BY size ORDER BY size'
  );
  const daily = await query(
    `SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS period, COUNT(*)::int AS count
     FROM fire_extinguishers GROUP BY 1 ORDER BY 1 DESC LIMIT 30`
  );
  const monthly = await query(
    `SELECT to_char(date_trunc('month', created_at), 'YYYY-MM') AS period, COUNT(*)::int AS count
     FROM fire_extinguishers GROUP BY 1 ORDER BY 1 DESC LIMIT 12`
  );
  const yearly = await query(
    `SELECT to_char(date_trunc('year', created_at), 'YYYY') AS period, COUNT(*)::int AS count
     FROM fire_extinguishers GROUP BY 1 ORDER BY 1 DESC`
  );
  return {
    total: total.rows[0].c,
    byStatus: byStatus.rows,
    byType: byType.rows,
    bySize: bySize.rows,
    summaries: { daily: daily.rows, monthly: monthly.rows, yearly: yearly.rows },
  };
}

// ---- Inspections -----------------------------------------------------------
async function inspectionReport() {
  await markOverdue();
  const counts = await query(
    `SELECT status, COUNT(*)::int AS count FROM inspections GROUP BY status`
  );
  const map = Object.fromEntries(counts.rows.map((r) => [r.status, r.count]));
  const rows = await query(
    `SELECT i.id, e.serial_number, e.location, i.scheduled_date, i.scheduled_time,
            i.status, i.result, i.completed_at
     FROM inspections i JOIN fire_extinguishers e ON e.id = i.extinguisher_id
     ORDER BY i.scheduled_date DESC`
  );
  return {
    counts: {
      pending: map.pending || 0,
      completed: map.completed || 0,
      overdue: map.overdue || 0,
      cancelled: map.cancelled || 0,
    },
    inspections: rows.rows,
  };
}

// ---- Compliance ------------------------------------------------------------
async function complianceReport(upcomingDays = 30) {
  const expired = await query(
    `SELECT id, serial_number, location, type, expiry_date, status
     FROM fire_extinguishers
     WHERE expiry_date < CURRENT_DATE ORDER BY expiry_date`
  );
  const upcoming = await query(
    `SELECT id, serial_number, location, type, expiry_date
     FROM fire_extinguishers
     WHERE expiry_date >= CURRENT_DATE
       AND expiry_date <= CURRENT_DATE + ($1 || ' days')::interval
     ORDER BY expiry_date`,
    [upcomingDays]
  );
  const total = await query('SELECT COUNT(*)::int AS c FROM fire_extinguishers');
  const compliantCount = total.rows[0].c - expired.rowCount;
  const compliancePct = total.rows[0].c ? Math.round((compliantCount / total.rows[0].c) * 100) : 100;
  return {
    expiredCount: expired.rowCount,
    upcomingCount: upcoming.rowCount,
    compliantCount,
    compliancePercentage: compliancePct,
    expired: expired.rows,
    upcomingExpirations: upcoming.rows,
  };
}

// ---- Maintenance -----------------------------------------------------------
async function maintenanceReport() {
  const history = await query(
    `SELECT m.id, e.serial_number, m.action_taken, m.maintenance_date,
            m.issues_identified, m.recommendations
     FROM maintenance_logs m JOIN fire_extinguishers e ON e.id = m.extinguisher_id
     ORDER BY m.maintenance_date DESC`
  );
  const frequency = await query(
    `SELECT e.serial_number, COUNT(*)::int AS maintenance_count
     FROM maintenance_logs m JOIN fire_extinguishers e ON e.id = m.extinguisher_id
     GROUP BY e.serial_number ORDER BY maintenance_count DESC`
  );
  const recent = await query(
    `SELECT m.id, e.serial_number, m.action_taken, m.maintenance_date
     FROM maintenance_logs m JOIN fire_extinguishers e ON e.id = m.extinguisher_id
     ORDER BY m.maintenance_date DESC LIMIT 10`
  );
  return { totalRecords: history.rowCount, frequency: frequency.rows, recent: recent.rows, history: history.rows };
}

// ---- Dashboard summary (one call for the UI) -------------------------------
async function dashboardSummary() {
  const [inv, insp, comp, maint] = await Promise.all([
    inventoryReport(),
    inspectionReport(),
    complianceReport(),
    maintenanceReport(),
  ]);
  return {
    totalExtinguishers: inv.total,
    extinguishersByStatus: inv.byStatus,
    extinguishersByType: inv.byType,
    inspections: insp.counts,
    compliance: {
      expiredCount: comp.expiredCount,
      upcomingCount: comp.upcomingCount,
      compliancePercentage: comp.compliancePercentage,
    },
    maintenance: { totalRecords: maint.totalRecords, recent: maint.recent },
  };
}

module.exports = {
  inventoryReport,
  inspectionReport,
  complianceReport,
  maintenanceReport,
  dashboardSummary,
};
